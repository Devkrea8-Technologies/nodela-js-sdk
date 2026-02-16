---
title: Invoices
description: Create payment invoices and verify their status
section: API Reference
order: 3
---

# Invoices

The Invoices resource lets you create payment invoices and verify their status. Invoices are the primary way to accept payments through Nodela — you create an invoice in a fiat currency, and the customer pays in cryptocurrency via a hosted checkout page.

## Create an Invoice

```typescript
const invoice = await nodela.invoices.create(params);
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `amount` | `number` | Yes | Payment amount in the specified fiat currency |
| `currency` | `SupportedCurrency` | Yes | ISO 4217 currency code (see [Supported Currencies](currencies.md)) |
| `title` | `string` | No | Title displayed on the checkout page |
| `description` | `string` | No | Description displayed on the checkout page |
| `reference` | `string` | No | Your internal order or reference ID |
| `customer` | `object` | No | Customer details |
| `customer.email` | `string` | Yes* | Customer email (*required if `customer` is provided) |
| `customer.name` | `string` | No | Customer name |
| `success_url` | `string` | No | URL to redirect to after successful payment |
| `cancel_url` | `string` | No | URL to redirect to if payment is cancelled |
| `webhook_url` | `string` | No | URL to receive webhook notifications |

### Response

```typescript
interface CreateInvoiceResponse {
  success: boolean;
  data?: {
    id: string;
    invoice_id: string;
    original_amount: string;
    original_currency: string;
    amount: string;              // Converted stablecoin amount
    currency: string;            // Stablecoin currency code
    exchange_rate?: string;
    webhook_url?: string;
    customer?: {
      email: string;
      name?: string;
    };
    checkout_url: string;        // Send customers here to pay
    status?: string;
    created_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### Example

```typescript
const invoice = await nodela.invoices.create({
  amount: 100.00,
  currency: 'USD',
  title: 'Premium Subscription',
  description: '12-month access to all features',
  reference: 'ORDER-12345',
  customer: {
    name: 'Jane Doe',
    email: 'jane@example.com',
  },
  success_url: 'https://yoursite.com/payment/success',
  cancel_url: 'https://yoursite.com/payment/cancel',
  webhook_url: 'https://yoursite.com/webhooks/nodela',
});

if (invoice.success && invoice.data) {
  console.log('Invoice ID:', invoice.data.invoice_id);
  console.log('Checkout URL:', invoice.data.checkout_url);
  console.log('Stablecoin amount:', invoice.data.amount, invoice.data.currency);
}
```

## Verify an Invoice

Check the current status of an invoice and retrieve payment details.

```typescript
const result = await nodela.invoices.verify(invoiceId);
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `invoiceId` | `string` | Yes | The invoice ID to verify (e.g., `"inv_abc123"`) |

### Response

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
      network: string;          // e.g., "ethereum"
      token: string;            // e.g., "USDT"
      address: string;          // Receiving wallet address
      amount: number;
      status: string;
      tx_hash: string[];        // Blockchain transaction hashes
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

### Example

```typescript
const result = await nodela.invoices.verify('inv_abc123');

if (result.success && result.data) {
  console.log('Status:', result.data.status);
  console.log('Paid:', result.data.paid);

  if (result.data.payment) {
    console.log('Network:', result.data.payment.network);
    console.log('Token:', result.data.payment.token);
    console.log('Tx Hashes:', result.data.payment.tx_hash);
  }
}
```

## Type Reference

```typescript
import {
  CreateInvoiceParams,
  CreateInvoiceResponse,
  VerifyInvoiceResponse,
  SupportedCurrency,
} from 'nodela-sdk';
```
