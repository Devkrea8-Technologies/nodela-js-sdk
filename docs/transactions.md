---
title: Transactions
description: List and paginate through your transaction history
section: API Reference
order: 4
---

# Transactions

The Transactions resource gives you access to the complete history of payments processed through your Nodela account. Every time a customer pays an invoice, a transaction record is created. This page covers how to list transactions, understand pagination, and work with the transaction data.

## How transactions relate to invoices

A transaction is created when a customer completes payment on an invoice. While invoices represent payment _requests_, transactions represent payment _records_. Each transaction is linked back to its originating invoice via the `invoice_id` field.

A transaction contains all the same data as a verified invoice (amounts, currencies, customer details, and blockchain payment information), but in a flat, denormalized format that is convenient for building reports, dashboards, and audit logs.

## Accessing the transactions resource

The `transactions` resource is available as a property on your `Nodela` instance:

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key');

// nodela.transactions is the Transactions resource
// It has one method: list()
```

The resource is created automatically when you instantiate `Nodela` — you never need to construct it yourself.

---

## `transactions.list(params?)`

Retrieves a paginated list of all transactions associated with your account. Transactions are returned in the order they were created.

**API endpoint:** `GET /v1/transactions`

### Method signature

```typescript
async list(params?: ListTransactionsParams): Promise<ListTransactionsResponse>
```

### Parameters

The `params` argument is entirely optional. If you call `list()` with no arguments, you get the first page of transactions with the API's default page size.

| Parameter | Type | Required | Default | Description |
| --------- | ---- | -------- | ------- | ----------- |
| `page` | `number` | No | `1` | The page number to retrieve (1-based). Page 1 is the first page of results. |
| `limit` | `number` | No | API default | The maximum number of transactions to return per page. Use this to control how many results you get in each request. |

**How pagination works internally:** The SDK converts your `params` object into URL query parameters. For example, `list({ page: 2, limit: 25 })` sends a `GET` request to `/v1/transactions?page=2&limit=25`. Any `undefined` or `null` values are automatically stripped from the query string, so `list({})` and `list()` produce the same request.

### Response

The `list` method returns a `ListTransactionsResponse` containing an array of transactions and pagination metadata:

```typescript
interface ListTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: Pagination;
  };
}
```

Unlike the invoice methods, the transactions response always has a `data` property (it does not use the `success` + optional `data`/`error` pattern). The `data` object contains two fields:

- **`transactions`** — An array of `Transaction` objects (see below for the full shape)
- **`pagination`** — A `Pagination` object with metadata about the current page and total results

---

### The Transaction object

Each transaction in the `transactions` array has the following shape:

```typescript
interface Transaction {
  id: string;
  invoice_id: string;
  reference: string;
  original_amount: number;
  original_currency: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  title: string;
  description: string;
  status: string;
  paid: boolean;
  customer: TransactionCustomer;
  created_at: string;
  payment: TransactionPayment;
}
```

Here is what each field means:

**Identifiers:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Unique identifier for this transaction record. |
| `invoice_id` | `string` | The ID of the invoice that this transaction is associated with. You can use this to call `nodela.invoices.verify(invoice_id)` for more details. |
| `reference` | `string` | Your internal reference/order ID that you provided when creating the invoice. Use this to match the transaction back to a record in your own system (e.g., an order in your database). |

**Amount and currency:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `original_amount` | `number` | The payment amount in the original fiat currency. For example, `100` if you created a $100 USD invoice. |
| `original_currency` | `string` | The fiat currency code (e.g., `"USD"`, `"EUR"`, `"NGN"`). |
| `amount` | `number` | The amount in stablecoins that was actually paid by the customer. |
| `currency` | `string` | The stablecoin currency code (e.g., `"USDT"`, `"USDC"`). |
| `exchange_rate` | `number` | The exchange rate that was used to convert from the fiat currency to the stablecoin at the time the invoice was created. |

**Display fields:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `title` | `string` | The title that was displayed on the checkout page (what you passed as `title` when creating the invoice). |
| `description` | `string` | The description that was displayed on the checkout page. |

**Status:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `status` | `string` | The current status of this transaction (e.g., `"completed"`, `"pending"`). |
| `paid` | `boolean` | Whether the payment has been confirmed. `true` means the customer has paid and the payment has been verified on-chain. |

**Customer details:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `customer.email` | `string` | The customer's email address. |
| `customer.name` | `string` | The customer's name. |

**Blockchain payment details:**

The `payment` object contains the on-chain details for the transaction. This is the same structure as the `payment` object in the invoice verify response:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `payment.id` | `string` | Unique identifier for this payment record. |
| `payment.network` | `string` | The blockchain network the payment was made on (e.g., `"ethereum"`, `"polygon"`, `"bsc"`). |
| `payment.token` | `string` | The stablecoin token used (e.g., `"USDT"`, `"USDC"`). |
| `payment.address` | `string` | The blockchain wallet address that received the payment. |
| `payment.amount` | `number` | The amount of stablecoins received in this payment. |
| `payment.status` | `string` | The status of the on-chain payment. |
| `payment.tx_hash` | `string[]` | An array of blockchain transaction hashes. You can look these up on a block explorer (e.g., Etherscan for Ethereum, BscScan for BSC) to independently verify the transaction. |
| `payment.transaction_type` | `string` | The type of blockchain transaction. |
| `payment.payer_email` | `string` | The email of the person who made the payment. |
| `payment.created_at` | `string` | ISO 8601 timestamp of when the payment was recorded. |

**Timestamp:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `created_at` | `string` | ISO 8601 timestamp of when this transaction was created. |

---

### The Pagination object

Every `list` response includes a `pagination` object that tells you about the current page and the total number of results:

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `page` | `number` | The current page number (1-based). |
| `limit` | `number` | The number of results per page (matches the `limit` you requested, or the API default if you did not specify one). |
| `total` | `number` | The total number of transactions across all pages. |
| `total_pages` | `number` | The total number of pages available. Calculated as `Math.ceil(total / limit)`. |
| `has_more` | `boolean` | `true` if there are more pages after the current one. `false` if you are on the last page. Use this to decide whether to fetch the next page. |

---

## Examples

### Basic listing (no parameters)

The simplest way to list transactions. Returns the first page with the API's default page size:

```typescript
const response = await nodela.transactions.list();

if (response.success) {
  console.log(`Found ${response.data.pagination.total} total transactions`);
  console.log('');

  for (const tx of response.data.transactions) {
    console.log(`[${tx.status}] ${tx.reference}`);
    console.log(`  Amount: ${tx.original_amount} ${tx.original_currency} → ${tx.amount} ${tx.currency}`);
    console.log(`  Customer: ${tx.customer.name} (${tx.customer.email})`);
    console.log(`  Paid: ${tx.paid}`);
    console.log('');
  }
}
```

### Paginated listing

Request a specific page with a custom page size:

```typescript
const response = await nodela.transactions.list({
  page: 2,
  limit: 25,
});

if (response.success) {
  const { transactions, pagination } = response.data;

  console.log(`Page ${pagination.page} of ${pagination.total_pages}`);
  console.log(`Showing ${transactions.length} of ${pagination.total} total transactions`);
  console.log(`Has more pages: ${pagination.has_more}`);
  console.log('');

  for (const tx of transactions) {
    console.log(`${tx.reference} — ${tx.original_amount} ${tx.original_currency} — ${tx.status}`);
  }
}
```

### Fetching all transactions across all pages

If you need to retrieve every transaction (e.g., for generating a report or syncing to your database), you can iterate through all pages using the `has_more` flag:

```typescript
import { Nodela, Transaction } from 'nodela-sdk';

async function getAllTransactions(nodela: Nodela): Promise<Transaction[]> {
  const allTransactions: Transaction[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await nodela.transactions.list({
      page,
      limit: 50, // Fetch 50 per page to minimize the number of requests
    });

    allTransactions.push(...response.data.transactions);
    hasMore = response.data.pagination.has_more;
    page++;
  }

  return allTransactions;
}

// Usage
const transactions = await getAllTransactions(nodela);
console.log(`Fetched ${transactions.length} total transactions`);
```

**Important considerations when fetching all pages:**

- Each page requires a separate HTTP request, so fetching many pages will take time. For accounts with thousands of transactions, consider implementing this as a background job rather than in a request handler.
- Use a reasonable `limit` (e.g., 50) to balance between the number of HTTP requests and the size of each response.
- New transactions could be created while you are paginating. This means you might miss transactions added after you started or see slight inconsistencies at page boundaries. For critical accuracy, consider using a snapshot mechanism in your own database.

### Filtering transactions locally

The SDK does not currently support server-side filtering (by date, status, currency, etc.). However, you can filter transactions after fetching them:

```typescript
const response = await nodela.transactions.list({ limit: 50 });

// Filter to only paid transactions
const paidTransactions = response.data.transactions.filter((tx) => tx.paid);

// Filter by currency
const usdTransactions = response.data.transactions.filter(
  (tx) => tx.original_currency === 'USD'
);

// Filter by status
const completedTransactions = response.data.transactions.filter(
  (tx) => tx.status === 'completed'
);
```

### Building a transaction summary

Aggregate transaction data for reporting:

```typescript
async function generateTransactionSummary(nodela: Nodela) {
  const allTransactions = await getAllTransactions(nodela);

  const paid = allTransactions.filter((tx) => tx.paid);
  const unpaid = allTransactions.filter((tx) => !tx.paid);

  // Group by currency
  const byCurrency = paid.reduce(
    (acc, tx) => {
      const key = tx.original_currency;
      if (!acc[key]) acc[key] = { count: 0, total: 0 };
      acc[key].count++;
      acc[key].total += tx.original_amount;
      return acc;
    },
    {} as Record<string, { count: number; total: number }>
  );

  console.log('=== Transaction Summary ===');
  console.log(`Total transactions: ${allTransactions.length}`);
  console.log(`Paid: ${paid.length}`);
  console.log(`Unpaid: ${unpaid.length}`);
  console.log('');
  console.log('By currency:');
  for (const [currency, data] of Object.entries(byCurrency)) {
    console.log(`  ${currency}: ${data.count} transactions, total ${data.total.toFixed(2)}`);
  }
}
```

---

## Type reference

All types related to transactions are exported from the package root:

```typescript
import type {
  ListTransactionsParams,
  ListTransactionsResponse,
  Transaction,
  TransactionCustomer,
  TransactionPayment,
  Pagination,
} from 'nodela-sdk';
```

You can use these types to annotate variables and function signatures in your own code:

```typescript
import type { Transaction, Pagination } from 'nodela-sdk';

function displayTransaction(tx: Transaction): void {
  console.log(`${tx.reference}: ${tx.original_amount} ${tx.original_currency}`);
}

function isLastPage(pagination: Pagination): boolean {
  return !pagination.has_more;
}
```
