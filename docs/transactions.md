---
title: Transactions
description: List and paginate through your transaction history
section: API Reference
order: 4
---

# Transactions

The Transactions resource lets you list and paginate through all transactions associated with your account.

## List Transactions

```typescript
const response = await nodela.transactions.list(params?);
```

### Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | `number` | No | `1` | Page number (1-based) |
| `limit` | `number` | No | API default | Number of results per page |

### Response

```typescript
interface ListTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: Pagination;
  };
}

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
  customer: {
    email: string;
    name: string;
  };
  created_at: string;
  payment: {
    id: string;
    network: string;
    token: string;
    address: string;
    amount: number;
    status: string;
    tx_hash: string[];
    transaction_type: string;
    payer_email: string;
    created_at: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}
```

### Basic Example

```typescript
const response = await nodela.transactions.list();

if (response.success) {
  for (const tx of response.data.transactions) {
    console.log(`${tx.reference} — ${tx.original_amount} ${tx.original_currency} — ${tx.status}`);
  }
}
```

### Pagination Example

```typescript
const response = await nodela.transactions.list({
  page: 2,
  limit: 25,
});

if (response.success) {
  const { transactions, pagination } = response.data;

  console.log(`Page ${pagination.page} of ${pagination.total_pages}`);
  console.log(`Showing ${transactions.length} of ${pagination.total} total`);
  console.log(`Has more: ${pagination.has_more}`);
}
```

### Iterating All Pages

```typescript
async function getAllTransactions(nodela: Nodela) {
  const all: Transaction[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await nodela.transactions.list({ page, limit: 50 });
    all.push(...response.data.transactions);
    hasMore = response.data.pagination.has_more;
    page++;
  }

  return all;
}
```

## Type Reference

```typescript
import {
  ListTransactionsParams,
  ListTransactionsResponse,
  Transaction,
  TransactionCustomer,
  TransactionPayment,
  Pagination,
} from 'nodela-sdk';
```
