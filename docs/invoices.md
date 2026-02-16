---
title: Invoices
description: Create payment invoices and verify their status
section: API Reference
order: 3
---

# Invoices

Invoices are the core payment primitive in Nodela. An invoice represents a payment request — you specify an amount in a fiat currency, and Nodela creates a hosted checkout page where your customer can pay in cryptocurrency (stablecoins). This page covers everything about creating invoices, understanding the response, and verifying payment status.

## How invoices work

Here is the typical lifecycle of a Nodela invoice:

1. **You create an invoice** by calling `nodela.invoices.create()` with an amount, currency, and optional details like customer email and redirect URLs.

2. **Nodela returns an invoice object** that includes:
   - A unique `invoice_id` (e.g., `"inv_abc123"`)
   - The original fiat amount and currency you specified
   - The converted stablecoin amount (how much the customer will actually pay in crypto)
   - The exchange rate used for the conversion
   - A `checkout_url` — this is the hosted payment page

3. **You redirect your customer** to the `checkout_url`. On this page, Nodela handles all the complexity of blockchain payments — displaying a wallet address, monitoring for on-chain confirmations, and handling expiration.

4. **The customer pays.** Once payment is confirmed on-chain, Nodela updates the invoice status.

5. **You get notified** either via a webhook (if you provided a `webhook_url`) or by polling the `verify` endpoint. You then fulfill the order.

## Accessing the invoices resource

The `invoices` resource is available as a property on your `Nodela` instance:

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key');

// nodela.invoices is the Invoices resource
// It has two methods: create() and verify()
```

The resource is created automatically when you instantiate `Nodela` — you never need to construct it yourself.

---

## `invoices.create(params)`

Creates a new payment invoice. This is the primary method you will use to accept payments.

**API endpoint:** `POST /v1/invoices`

### Method signature

```typescript
async create(params: CreateInvoiceParams): Promise<CreateInvoiceResponse>
```

### Parameters

The `params` object has two required fields (`amount` and `currency`) and several optional fields that let you customize the checkout experience and integrate with your own systems.

#### Required parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `amount` | `number` | The payment amount denominated in the fiat currency specified by `currency`. For example, if `currency` is `'USD'`, then `amount: 25.00` means $25.00 USD. This value is converted to a stablecoin equivalent using real-time exchange rates. |
| `currency` | `SupportedCurrency` | A 3-letter ISO 4217 currency code representing the fiat currency for the payment. For example: `'USD'`, `'EUR'`, `'NGN'`, `'GBP'`. Currency codes are **case-insensitive** — the SDK automatically converts them to uppercase before sending. See [Supported Currencies](currencies.md) for the full list of 60+ accepted codes. |

#### Optional parameters

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `title` | `string` | A title that is displayed on the hosted checkout page. Use this to tell the customer what they are paying for. Example: `'Premium Subscription'`, `'Order #12345'`. |
| `description` | `string` | A longer description displayed on the checkout page below the title. Example: `'12-month access to all premium features'`. |
| `reference` | `string` | Your own internal identifier for this payment. This could be an order ID, invoice number, or any string that helps you match this Nodela invoice back to a record in your system. Example: `'order_2024_00123'`. This value is returned in verify and transaction responses so you can easily look up the corresponding order. |
| `customer` | `object` | An object containing customer details. See the customer object section below. |
| `success_url` | `string` | A fully-qualified URL (starting with `https://`) where the customer will be redirected after a successful payment. Example: `'https://yoursite.com/payment/success'`. If not provided, the customer stays on the Nodela checkout page after payment. |
| `cancel_url` | `string` | A fully-qualified URL where the customer will be redirected if they choose to cancel the payment. Example: `'https://yoursite.com/payment/cancel'`. |
| `webhook_url` | `string` | A fully-qualified URL where Nodela will send an HTTP POST request when the payment status changes. Use this to automatically fulfill orders when payment is confirmed. Example: `'https://yoursite.com/api/webhooks/nodela'`. Your endpoint should return a 200 status code to acknowledge receipt. See [Examples](examples.md#webhook-handler) for a complete webhook handler implementation. |

#### The customer object

The `customer` parameter is an optional object. If you provide it, the `email` field inside it is **required**:

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `email` | `string` | Yes (if `customer` is provided) | The customer's email address. Nodela may use this to send payment receipts or notifications. |
| `name` | `string` | No | The customer's full name. Displayed on the checkout page. |

```typescript
// Customer with email only
customer: {
  email: 'jane@example.com',
}

// Customer with name and email
customer: {
  name: 'Jane Doe',
  email: 'jane@example.com',
}
```

### Currency validation

Before making any network request, the SDK validates that the `currency` value is in its list of supported currencies. The currency code is first converted to uppercase (so `'usd'`, `'Usd'`, and `'USD'` are all accepted), then checked against the supported list.

If the currency is not supported, the SDK throws an `Error` immediately with a descriptive message:

```typescript
try {
  await nodela.invoices.create({ amount: 100, currency: 'XYZ' as any });
} catch (error) {
  console.error(error.message);
  // 'Unsupported currency: "XYZ". Supported currencies: USD, CAD, MXN, ...'
}
```

This validation happens locally — no HTTP request is sent. This saves a round trip and gives you an immediate, clear error message.

### Response

The `create` method returns a `CreateInvoiceResponse` object. Here is every field explained:

```typescript
interface CreateInvoiceResponse {
  success: boolean;
  data?: {
    id: string;
    invoice_id: string;
    original_amount: string;
    original_currency: string;
    amount: string;
    currency: string;
    exchange_rate?: string;
    webhook_url?: string;
    customer?: {
      email: string;
      name?: string;
    };
    checkout_url: string;
    status?: string;
    created_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

#### Response fields explained

| Field | Type | Description |
| ----- | ---- | ----------- |
| `success` | `boolean` | `true` if the invoice was created successfully, `false` if there was an error. Always check this field first. |
| `data` | `object \| undefined` | Present when `success` is `true`. Contains all the invoice details. |
| `data.id` | `string` | The internal database ID for this invoice. |
| `data.invoice_id` | `string` | The public-facing invoice identifier (e.g., `"inv_abc123"`). Use this value when calling `invoices.verify()`. |
| `data.original_amount` | `string` | The amount you requested, in the fiat currency you specified. For example, `"100.00"`. Note this is a string, not a number. |
| `data.original_currency` | `string` | The fiat currency code you specified (e.g., `"USD"`). |
| `data.amount` | `string` | The converted amount in stablecoins that the customer will pay. For example, if you requested $100 USD and the exchange rate is 1:1, this would be `"100.00"`. Note this is a string. |
| `data.currency` | `string` | The stablecoin currency code (e.g., `"USDT"`, `"USDC"`). This is the cryptocurrency the customer will pay in. |
| `data.exchange_rate` | `string \| undefined` | The exchange rate used to convert from the fiat currency to the stablecoin. For example, `"1.00"` for USD to USDT. |
| `data.webhook_url` | `string \| undefined` | The webhook URL you provided, echoed back for confirmation. |
| `data.customer` | `object \| undefined` | The customer details you provided, echoed back. |
| `data.checkout_url` | `string` | **This is the most important field.** This is the URL where you should send your customer to complete payment. Redirect them here in a browser, or embed this link in an email. |
| `data.status` | `string \| undefined` | The current status of the invoice (e.g., `"pending"`, `"completed"`). |
| `data.created_at` | `string` | ISO 8601 timestamp of when the invoice was created. |
| `error` | `object \| undefined` | Present when `success` is `false`. Contains error details. |
| `error.code` | `string` | A machine-readable error code from the API. |
| `error.message` | `string` | A human-readable error message explaining what went wrong. |

### Complete example

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela(process.env.NODELA_API_KEY!, {
  environment: 'sandbox',
});

const invoice = await nodela.invoices.create({
  amount: 150.00,
  currency: 'EUR',
  title: 'Premium Subscription',
  description: '12-month access to all premium features',
  reference: 'order_2024_00123',
  customer: {
    name: 'Jane Doe',
    email: 'jane@example.com',
  },
  success_url: 'https://yoursite.com/payment/success',
  cancel_url: 'https://yoursite.com/payment/cancel',
  webhook_url: 'https://yoursite.com/api/webhooks/nodela',
});

if (invoice.success && invoice.data) {
  console.log('Invoice created successfully!');
  console.log('Invoice ID:', invoice.data.invoice_id);
  console.log('Checkout URL:', invoice.data.checkout_url);
  console.log('');
  console.log('Fiat amount:', invoice.data.original_amount, invoice.data.original_currency);
  console.log('Crypto amount:', invoice.data.amount, invoice.data.currency);
  console.log('Exchange rate:', invoice.data.exchange_rate);
  console.log('Created at:', invoice.data.created_at);

  // In a web app, you would redirect the customer:
  // res.redirect(invoice.data.checkout_url);
} else {
  console.error('Failed to create invoice');
  console.error('Error code:', invoice.error?.code);
  console.error('Error message:', invoice.error?.message);
}
```

### Minimal example

If you just need to create a quick invoice with the bare minimum:

```typescript
const invoice = await nodela.invoices.create({
  amount: 25,
  currency: 'USD',
});

console.log(invoice.data?.checkout_url);
```

---

## `invoices.verify(invoiceId)`

Checks the current status of an invoice and retrieves full payment details. Use this method after a customer has paid (or after receiving a webhook notification) to confirm that payment was actually received and to get the on-chain transaction details.

**API endpoint:** `GET /v1/invoices/{invoiceId}/verify`

### Method signature

```typescript
async verify(invoiceId: string): Promise<VerifyInvoiceResponse>
```

### Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `invoiceId` | `string` | Yes | The invoice ID to verify. This is the `invoice_id` value from the create response (e.g., `"inv_abc123"`). Do **not** confuse this with the internal `id` field — use `invoice_id`. |

### Response

The `verify` method returns a `VerifyInvoiceResponse` with detailed information about the invoice and its payment:

```typescript
interface VerifyInvoiceResponse {
  success: boolean;
  data?: {
    id: string;
    invoice_id: string;
    reference?: string;
    original_amount: string;
    original_currency: string;
    amount: number;
    currency: string;
    exchange_rate?: number;
    title?: string;
    description?: string;
    status: string;
    paid: true;
    customer?: {
      email: string;
      name?: string;
    };
    created_at: string;
    payment?: {
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
  };
  error?: {
    code: string;
    message: string;
  };
}
```

#### Response fields explained

The top-level fields (`success`, `error`) work the same as the create response. The `data` object contains:

**Invoice details:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Internal database ID |
| `invoice_id` | `string` | The public invoice identifier |
| `reference` | `string \| undefined` | Your internal reference/order ID (if you provided one when creating the invoice) |
| `original_amount` | `string` | The original fiat amount you requested |
| `original_currency` | `string` | The fiat currency code |
| `amount` | `number` | The stablecoin amount (note: this is a `number` in the verify response, unlike the `string` in the create response) |
| `currency` | `string` | The stablecoin currency code |
| `exchange_rate` | `number \| undefined` | The exchange rate used for conversion |
| `title` | `string \| undefined` | The title you set when creating the invoice |
| `description` | `string \| undefined` | The description you set when creating the invoice |
| `status` | `string` | The current status of the invoice (e.g., `"pending"`, `"completed"`) |
| `paid` | `true` | Whether the invoice has been paid. Note: this field is typed as the literal `true` — it is only present when the invoice data is returned. |
| `customer` | `object \| undefined` | Customer details if provided |
| `created_at` | `string` | ISO 8601 timestamp of when the invoice was created |

**Payment details (the `payment` object):**

The `payment` field is present when a payment has been made against the invoice. This is where you find the on-chain transaction details:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `payment.id` | `string` | Unique identifier for this payment record |
| `payment.network` | `string` | The blockchain network the payment was made on (e.g., `"ethereum"`, `"polygon"`, `"bsc"`) |
| `payment.token` | `string` | The stablecoin token used for payment (e.g., `"USDT"`, `"USDC"`) |
| `payment.address` | `string` | The blockchain wallet address that received the payment |
| `payment.amount` | `number` | The amount of stablecoins received |
| `payment.status` | `string` | The status of the on-chain payment |
| `payment.tx_hash` | `string[]` | An array of blockchain transaction hashes. There can be multiple hashes if the payment was split across multiple transactions. You can look up each hash on a block explorer (e.g., Etherscan for Ethereum) to verify the transaction. |
| `payment.transaction_type` | `string` | The type of blockchain transaction |
| `payment.payer_email` | `string` | The email address of the person who made the payment |
| `payment.created_at` | `string` | ISO 8601 timestamp of when the payment was recorded |

### Complete example

```typescript
const result = await nodela.invoices.verify('inv_abc123');

if (result.success && result.data) {
  // Invoice details
  console.log('Invoice ID:', result.data.invoice_id);
  console.log('Reference:', result.data.reference);
  console.log('Status:', result.data.status);
  console.log('Paid:', result.data.paid);
  console.log('');

  // Amount details
  console.log('Original:', result.data.original_amount, result.data.original_currency);
  console.log('Crypto:', result.data.amount, result.data.currency);
  console.log('Rate:', result.data.exchange_rate);
  console.log('');

  // Payment details (only present if paid)
  if (result.data.payment) {
    console.log('--- Payment Details ---');
    console.log('Network:', result.data.payment.network);
    console.log('Token:', result.data.payment.token);
    console.log('Amount received:', result.data.payment.amount);
    console.log('Receiving address:', result.data.payment.address);
    console.log('Status:', result.data.payment.status);
    console.log('Payer email:', result.data.payment.payer_email);
    console.log('');

    // Transaction hashes — you can look these up on a block explorer
    for (const hash of result.data.payment.tx_hash) {
      console.log('Tx hash:', hash);
    }
  }
} else {
  console.error('Verification failed:', result.error?.message);
}
```

### When to call verify

There are two main patterns for knowing when to verify an invoice:

1. **Webhook-driven (recommended):** Provide a `webhook_url` when creating the invoice. Nodela will send a POST request to that URL when the payment status changes. In your webhook handler, call `verify()` to confirm the payment details before fulfilling the order. See [Examples](examples.md#webhook-handler).

2. **Polling:** If you cannot receive webhooks (e.g., in a local development environment), you can poll the `verify` endpoint at regular intervals until the invoice is paid. See [Examples](examples.md#polling-for-payment-status).

---

## Type reference

All types related to invoices are exported from the package root:

```typescript
import type {
  CreateInvoiceParams,
  CreateInvoiceResponse,
  VerifyInvoiceResponse,
  SupportedCurrency,
} from 'nodela-sdk';

// The SUPPORTED_CURRENCIES constant (an array of all valid currency codes)
import { SUPPORTED_CURRENCIES } from 'nodela-sdk';
```
