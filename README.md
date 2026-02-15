# Nodela JavaScript SDK

[![CI](https://github.com/Devkrea8-Technologies/nodela-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Devkrea8-Technologies/nodela-js-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nodela-sdk.svg)](https://www.npmjs.com/package/nodela-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

The official JavaScript/TypeScript SDK for the [Nodela](https://nodela.com) stablecoin payments API. Accept crypto payments globally with support for 60+ fiat currencies, automatic currency conversion, and seamless checkout experiences.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Invoices](#invoices)
    - [Create an Invoice](#create-an-invoice)
    - [Create an Invoice with Full Options](#create-an-invoice-with-full-options)
    - [Verify an Invoice](#verify-an-invoice)
  - [Transactions](#transactions)
    - [List Transactions](#list-transactions)
    - [Paginated Transactions](#paginated-transactions)
- [Error Handling](#error-handling)
  - [Error Types](#error-types)
  - [Error Handling Example](#error-handling-example)
- [Supported Currencies](#supported-currencies)
- [TypeScript Support](#typescript-support)
- [API Reference](#api-reference)
  - [Nodela Class](#nodela-class)
  - [nodela.invoices](#nodelainvoices)
  - [nodela.transactions](#nodelatransactions)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Invoice Management** -- Create payment invoices and verify their status with a simple API
- **Transaction Tracking** -- List and paginate through all your transactions
- **60+ Currencies** -- Accept payments denominated in fiat currencies from every continent
- **Automatic Conversion** -- Prices in local currency are automatically converted to stablecoin equivalents
- **Sandbox & Production** -- Switch between environments with a single config option
- **Full TypeScript Support** -- Strict types, interfaces, and autocompletion out of the box
- **Custom Error Hierarchy** -- Structured error types for authentication, rate limiting, validation, and API errors
- **Rate Limit Handling** -- Automatic extraction of `retry-after` headers on 429 responses
- **Lightweight** -- Only one runtime dependency (`axios`)

---

## Requirements

- **Node.js** >= 14.0.0
- A Nodela API key (obtain one from the [Nodela Dashboard](https://nodela.com))

API keys follow the format:
| Prefix | Environment |
|------------|-------------|
| `nk_test_` | Sandbox |
| `nk_live_` | Production |

---

## Installation

```bash
npm install nodela-sdk
```

Or with Yarn:

```bash
yarn add nodela-sdk
```

Or with pnpm:

```bash
pnpm add nodela-sdk
```

---

## Quick Start

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key');

// Create a payment invoice
const invoice = await nodela.invoices.create({
  amount: 25.00,
  currency: 'USD',
});

console.log(invoice.data?.checkout_url);
// => "https://checkout.nodela.com/inv_abc123..."
```

---

## Configuration

The `Nodela` constructor accepts an API key and an optional configuration object:

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela('nk_live_your_api_key', {
  timeout: 10000,          // Request timeout in ms (default: 5000)
  maxRetries: 5,           // Max retry attempts (default: 3)
  environment: 'sandbox',  // 'production' | 'sandbox' (default: 'production')
});
```

### Configuration Options

| Option | Type | Default | Description |
|---------------|-------------------------------|----------------|------------------------------------------------|
| `timeout` | `number` | `5000` | HTTP request timeout in milliseconds. Must be a positive number. |
| `maxRetries` | `number` | `3` | Maximum number of retry attempts on failure. Must be a non-negative number. |
| `environment` | `'production' \| 'sandbox'` | `'production'` | API environment to target. Use `'sandbox'` for testing. |

### Inspecting Configuration

You can retrieve the active configuration at any time:

```typescript
const config = nodela.getConfig();
console.log(config);
// {
//   apiKey: 'nk_live_your_api_key',
//   baseURL: 'https://api.nodela.com',
//   timeout: 10000,
//   maxRetries: 5,
//   environment: 'sandbox'
// }
```

---

## Usage

### Invoices

Invoices are the core payment primitive in Nodela. You create an invoice with a fiat amount and currency, and receive a hosted checkout URL where your customer can complete payment in stablecoins.

#### Create an Invoice

```typescript
const invoice = await nodela.invoices.create({
  amount: 50.00,
  currency: 'USD',
});

if (invoice.success && invoice.data) {
  console.log('Invoice ID:', invoice.data.invoice_id);
  console.log('Checkout URL:', invoice.data.checkout_url);
  console.log('Stablecoin amount:', invoice.data.amount, invoice.data.currency);
  console.log('Exchange rate:', invoice.data.exchange_rate);
}
```

#### Create an Invoice with Full Options

```typescript
const invoice = await nodela.invoices.create({
  amount: 150.00,
  currency: 'EUR',
  title: 'Premium Subscription',
  description: '12-month premium plan',
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
  // Redirect your customer to the checkout page
  console.log('Redirect to:', invoice.data.checkout_url);
}
```

##### `CreateInvoiceParams`

| Parameter | Type | Required | Description |
|---------------|----------|----------|------------------------------------------------------|
| `amount` | `number` | Yes | The payment amount in the specified fiat currency. |
| `currency` | `string` | Yes | A supported 3-letter ISO currency code (e.g. `"USD"`, `"NGN"`). Case-insensitive. |
| `title` | `string` | No | A title displayed on the checkout page. |
| `description` | `string` | No | A description displayed on the checkout page. |
| `reference` | `string` | No | Your internal order or reference ID. |
| `customer` | `object` | No | Customer details. `email` is required if provided; `name` is optional. |
| `success_url` | `string` | No | URL to redirect the customer to after successful payment. |
| `cancel_url` | `string` | No | URL to redirect the customer to if they cancel. |
| `webhook_url` | `string` | No | URL to receive webhook notifications for payment events. |

##### `CreateInvoiceResponse`

```typescript
{
  success: boolean;
  data?: {
    id: string;
    invoice_id: string;
    original_amount: string;   // Amount in the fiat currency you specified
    original_currency: string; // The fiat currency code
    amount: string;            // Converted stablecoin amount
    currency: string;          // Stablecoin currency code
    exchange_rate?: string;
    webhook_url?: string;
    customer?: { email: string; name?: string };
    checkout_url: string;      // Send your customer here
    status?: string;
    created_at: string;
  };
  error?: { code: string; message: string };
}
```

#### Verify an Invoice

Check the payment status and retrieve payment details for a specific invoice:

```typescript
const result = await nodela.invoices.verify('inv_abc123');

if (result.success && result.data) {
  console.log('Status:', result.data.status);
  console.log('Paid:', result.data.paid);

  if (result.data.payment) {
    console.log('Network:', result.data.payment.network);
    console.log('Token:', result.data.payment.token);
    console.log('Amount:', result.data.payment.amount);
    console.log('Tx Hash:', result.data.payment.tx_hash);
  }
}
```

##### `VerifyInvoiceResponse`

```typescript
{
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
    paid: boolean;
    customer?: { email: string; name?: string };
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
  error?: { code: string; message: string };
}
```

---

### Transactions

Retrieve a paginated list of all transactions associated with your account.

#### List Transactions

```typescript
const response = await nodela.transactions.list();

if (response.success) {
  for (const tx of response.data.transactions) {
    console.log(`${tx.invoice_id} - ${tx.original_amount} ${tx.original_currency} - ${tx.status}`);
  }
}
```

#### Paginated Transactions

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

  for (const tx of transactions) {
    console.log(`[${tx.status}] ${tx.reference} -- ${tx.amount} ${tx.currency}`);

    if (tx.payment) {
      console.log(`  Network: ${tx.payment.network}`);
      console.log(`  Token: ${tx.payment.token}`);
      console.log(`  Tx Hash: ${tx.payment.tx_hash.join(', ')}`);
    }
  }
}
```

##### `ListTransactionsParams`

| Parameter | Type | Required | Description |
|-----------|----------|----------|----------------------------------------------|
| `page` | `number` | No | The page number to retrieve. |
| `limit` | `number` | No | Number of transactions per page. |

##### `ListTransactionsResponse`

```typescript
{
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_more: boolean;
    };
  };
}
```

##### `Transaction`

```typescript
{
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
  customer: { email: string; name: string };
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
```

---

## Error Handling

The SDK provides a structured error hierarchy so you can handle different failure modes precisely.

### Error Types

All errors extend `SDKError`, which itself extends the native `Error` class.

| Error Class | Code | Status | When It Occurs |
|------------------------|--------------------------|--------|------------------------------------------------|
| `SDKError` | *(varies)* | -- | Base class for all SDK errors. |
| `APIError` | `API_ERROR` | varies | General API errors (4xx/5xx responses). |
| `AuthenticationError` | `AUTHENTICATION_ERROR` | 401 | Invalid or missing API key. |
| `RateLimitError` | `RATE_LIMIT_ERROR` | 429 | Too many requests. Has optional `retryAfter`. |
| `ValidationError` | `VALIDATION_ERROR` | -- | Client-side validation failures (e.g. invalid currency). |

All error objects include:

```typescript
{
  message: string;      // Human-readable error message
  code: string;         // Machine-readable error code
  statusCode?: number;  // HTTP status code (if applicable)
  details?: unknown;    // Additional error context
}
```

### Error Handling Example

```typescript
import { Nodela, AuthenticationError, RateLimitError, APIError, SDKError } from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key');

try {
  const invoice = await nodela.invoices.create({
    amount: 100,
    currency: 'USD',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key -- check your credentials
    console.error('Auth failed:', error.message);

  } else if (error instanceof RateLimitError) {
    // Too many requests -- back off and retry
    console.error('Rate limited. Retry after:', error.retryAfter, 'seconds');

  } else if (error instanceof APIError) {
    // Server returned an error response
    console.error(`API error (${error.statusCode}):`, error.message);
    console.error('Details:', error.details);

  } else if (error instanceof SDKError) {
    // Catch-all for any other SDK error
    console.error(`SDK error [${error.code}]:`, error.message);

  } else {
    // Unexpected non-SDK error
    console.error('Unexpected error:', error);
  }
}
```

#### Currency Validation Errors

The SDK validates currency codes client-side before making any API request:

```typescript
try {
  await nodela.invoices.create({ amount: 100, currency: 'XYZ' });
} catch (error) {
  // Error: Unsupported currency: "XYZ". Supported currencies: USD, CAD, MXN, ...
  console.error(error.message);
}
```

Currency codes are case-insensitive -- `"usd"`, `"Usd"`, and `"USD"` are all accepted and automatically normalized to uppercase.

---

## Supported Currencies

The SDK supports **60+ fiat currencies** across every major region:

| Region | Currencies |
|----------------|---------------------------------------------------------------------------|
| **Americas** | `USD`, `CAD`, `MXN`, `BRL`, `ARS`, `CLP`, `COP`, `PEN`, `JMD`, `TTD` |
| **Europe** | `EUR`, `GBP`, `CHF`, `SEK`, `NOK`, `DKK`, `PLN`, `CZK`, `HUF`, `RON`, `BGN`, `HRK`, `ISK`, `TRY`, `RUB`, `UAH` |
| **Africa** | `NGN`, `ZAR`, `KES`, `GHS`, `EGP`, `MAD`, `TZS`, `UGX`, `XOF`, `XAF`, `ETB` |
| **Asia** | `JPY`, `CNY`, `INR`, `KRW`, `IDR`, `MYR`, `THB`, `PHP`, `VND`, `SGD`, `HKD`, `TWD`, `BDT`, `PKR`, `LKR` |
| **Middle East** | `AED`, `SAR`, `QAR`, `KWD`, `BHD`, `OMR`, `ILS`, `JOD` |
| **Oceania** | `AUD`, `NZD`, `FJD` |

You can also access the full list programmatically:

```typescript
import { SUPPORTED_CURRENCIES } from 'nodela-sdk/dist/resources/Invoices';

console.log(SUPPORTED_CURRENCIES);
// ["USD", "CAD", "MXN", ...]
```

---

## TypeScript Support

The SDK is written in TypeScript with strict mode enabled and ships with full type declarations. All interfaces are exported for use in your own code:

```typescript
import { Nodela } from 'nodela-sdk';
import type {
  CreateInvoiceParams,
  CreateInvoiceResponse,
  VerifyInvoiceResponse,
  ListTransactionsParams,
  ListTransactionsResponse,
  Transaction,
  Pagination,
  SupportedCurrency,
} from 'nodela-sdk/dist/resources/Invoices';
```

Error types are exported directly from the package root:

```typescript
import {
  SDKError,
  APIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from 'nodela-sdk';
```

---

## API Reference

### `Nodela` Class

The main entry point for the SDK.

```typescript
new Nodela(apiKey: string, options?: SDKConfigOptions)
```

| Property | Type | Description |
|----------------|----------------|-----------------------------------------------|
| `invoices` | `Invoices` | Invoice resource for creating and verifying invoices. |
| `transactions` | `Transactions` | Transaction resource for listing transactions. |

| Method | Returns | Description |
|----------------|------------------------------|-----------------------------------------------|
| `getConfig()` | `Required<SDKConfig>` | Returns a copy of the current SDK configuration. |

---

### `nodela.invoices`

| Method | Parameters | Returns | Description |
|-----------|--------------------------------|---------------------------------|------------------------------------------------------|
| `create` | `params: CreateInvoiceParams` | `Promise<CreateInvoiceResponse>` | Creates a new payment invoice and returns a checkout URL. |
| `verify` | `invoiceId: string` | `Promise<VerifyInvoiceResponse>` | Retrieves the payment status and details for an invoice. |

---

### `nodela.transactions`

| Method | Parameters | Returns | Description |
|--------|--------------------------------------|--------------------------------------|------------------------------------------------------|
| `list` | `params?: ListTransactionsParams` | `Promise<ListTransactionsResponse>` | Returns a paginated list of transactions. |

---

## Testing

The SDK includes comprehensive unit and integration tests with an enforced **80% coverage threshold**.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Linting & Formatting

```bash
# Lint source code
npm run lint

# Lint and auto-fix
npm run lint:fix

# Check formatting
npm run format:check

# Format source code
npm run format
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run the full test suite (`npm test`)
5. Run linting and formatting (`npm run lint && npm run format:check`)
6. Create a changeset for your changes (`npm run changeset`)
7. Commit your changes and open a Pull Request

### Project Structure

```
nodela-js-sdk/
├── src/
│   ├── index.ts              # SDK entry point & Nodela class
│   ├── client.ts             # HTTP client (Axios wrapper)
│   ├── config.ts             # Configuration & validation
│   ├── errors/
│   │   ├── index.ts          # Error re-exports
│   │   ├── base.ts           # SDKError base class
│   │   └── api-error.ts      # APIError, AuthenticationError, etc.
│   └── resources/
│       ├── base.ts           # BaseResource abstract class
│       ├── Invoices.ts       # Invoice create & verify
│       └── Transactions.ts   # Transaction listing
├── tests/
│   ├── unit/                 # Unit tests (mirrors src/ structure)
│   └── integration/          # End-to-end integration tests
├── .github/workflows/
│   ├── ci.yml                # CI pipeline (lint, format, build, test)
│   └── publish.yml           # Automated npm publishing via changesets
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Jest test configuration
├── .eslintrc.json            # ESLint rules
└── .prettierrc               # Prettier formatting rules
```

---

## License

This project is licensed under the [MIT License](LICENSE).

Built by [NodelaPay LTD](mailto:sayhello@nodela.co).
