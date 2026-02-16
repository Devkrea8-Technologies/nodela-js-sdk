---
title: Getting Started
description: Install the SDK and create your first invoice in minutes
section: Introduction
order: 1
---

# Getting Started

Welcome to the Nodela JavaScript SDK. This guide walks you through everything you need to go from zero to accepting your first cryptocurrency payment.

## What is Nodela?

Nodela is a stablecoin payments platform. It allows businesses and developers to accept cryptocurrency payments without dealing with the complexity of blockchain infrastructure. Here is how it works at a high level:

1. **You create an invoice** — You tell Nodela "I need to collect $50 USD from a customer."
2. **Nodela converts the price** — Nodela converts the fiat amount (e.g., $50 USD) into an equivalent stablecoin amount (e.g., 50 USDT) using real-time exchange rates.
3. **Your customer pays** — Nodela provides a hosted checkout page where the customer completes payment in cryptocurrency.
4. **You get notified** — Nodela notifies you via webhooks (or you can poll) when the payment is confirmed on-chain.

This SDK wraps the Nodela REST API so you never have to construct HTTP requests, parse responses, or handle authentication headers manually.

## What this SDK provides

- **`nodela.invoices.create()`** — Create a payment invoice in any of 60+ fiat currencies
- **`nodela.invoices.verify()`** — Check if an invoice has been paid and retrieve blockchain transaction details
- **`nodela.transactions.list()`** — List all transactions on your account with pagination
- **Structured errors** — Catch specific error types like `AuthenticationError`, `RateLimitError`, or `ValidationError` instead of parsing raw HTTP responses
- **TypeScript types** — Full type definitions for every request, response, and parameter

## Prerequisites

Before you begin, make sure you have:

- **Node.js version 18.18.0 or later** — The SDK uses modern JavaScript features that require Node.js 18.18.0+. You can check your version by running `node --version` in your terminal. If you need to upgrade, visit [nodejs.org](https://nodejs.org/).
- **A Nodela account** — Sign up at [nodela.co](https://nodela.co) to get access to the dashboard where you can generate API keys.
- **An API key** — Once you have an account, generate an API key from the Nodela dashboard. You will get a test key for development and a live key for production.

## Installation

Install the SDK from npm using your preferred package manager:

**npm:**
```bash
npm install nodela-sdk
```

**Yarn:**
```bash
yarn add nodela-sdk
```

**pnpm:**
```bash
pnpm add nodela-sdk
```

The SDK has only one runtime dependency (`axios` for HTTP requests), so it adds minimal weight to your project.

After installation, you can verify it was installed correctly by checking your `package.json`:

```json
{
  "dependencies": {
    "nodela-sdk": "^1.0.4"
  }
}
```

## Understanding API keys

Nodela uses prefixed API keys to distinguish between environments. This is a safety mechanism — it prevents you from accidentally processing live payments while developing.

| Prefix | Environment | Purpose |
| ---------- | ----------- | ------- |
| `nk_test_` | Sandbox | Use during development and testing. No real payments are processed. |
| `nk_live_` | Production | Use in your live application. Real payments are processed. |

The SDK validates your API key format the moment you create a `Nodela` instance. If the key does not start with `nk_test_` or `nk_live_`, the SDK throws an error immediately — before any network request is made. This catches misconfiguration early.

**Important:** Never hard-code your API key directly in your source code. Use environment variables instead:

```bash
# .env file
NODELA_API_KEY=nk_test_your_api_key_here
```

```typescript
const nodela = new Nodela(process.env.NODELA_API_KEY!);
```

## Quick start

Here is a complete, minimal example that creates a payment invoice and prints the checkout URL:

### Step 1: Import and initialize the SDK

```typescript
import { Nodela } from 'nodela-sdk';

// Create a new Nodela instance with your API key.
// The second argument is optional — here we set the environment to 'sandbox' for testing.
const nodela = new Nodela(process.env.NODELA_API_KEY!, {
  environment: 'sandbox',
});
```

When you call `new Nodela(...)`, the SDK does three things internally:
1. **Validates your API key** — Checks that it starts with `nk_test_` or `nk_live_`
2. **Validates your options** — If you passed a timeout, maxRetries, or environment, it checks that they are valid values
3. **Creates an HTTP client** — Sets up an `axios` instance pre-configured with your API key as a Bearer token, the correct base URL (`https://api.nodela.co`), and your timeout setting

### Step 2: Create an invoice

```typescript
const invoice = await nodela.invoices.create({
  amount: 25.00,          // The price in fiat currency
  currency: 'USD',        // The fiat currency (ISO 4217 code)
  customer: {
    email: 'customer@example.com',
  },
});
```

This sends a `POST` request to the Nodela API. The API converts $25.00 USD to the equivalent stablecoin amount and returns an invoice object with a hosted checkout URL.

### Step 3: Use the response

```typescript
if (invoice.success && invoice.data) {
  // The invoice was created successfully
  console.log('Invoice ID:', invoice.data.invoice_id);
  console.log('Checkout URL:', invoice.data.checkout_url);
  console.log('Stablecoin amount:', invoice.data.amount, invoice.data.currency);
  console.log('Exchange rate:', invoice.data.exchange_rate);
  console.log('Created at:', invoice.data.created_at);
} else {
  // The API returned an error in the response body
  console.error('Failed to create invoice:', invoice.error?.message);
}
```

The `checkout_url` is where you send your customer to complete payment. You can redirect them in a web app, or display the link in an email or chat.

### Step 4: Verify the payment later

After the customer pays (or after you receive a webhook notification), verify the invoice to confirm payment and get blockchain details:

```typescript
const result = await nodela.invoices.verify(invoice.data!.invoice_id);

if (result.success && result.data) {
  console.log('Payment status:', result.data.status);
  console.log('Paid:', result.data.paid);

  if (result.data.payment) {
    console.log('Blockchain network:', result.data.payment.network);
    console.log('Token used:', result.data.payment.token);
    console.log('Transaction hashes:', result.data.payment.tx_hash);
    console.log('Receiving address:', result.data.payment.address);
  }
}
```

## CommonJS usage

If your project uses CommonJS modules (i.e., you use `require()` instead of `import`), the SDK works the same way:

```javascript
const { Nodela } = require('nodela-sdk');

const nodela = new Nodela('nk_test_your_api_key', {
  environment: 'sandbox',
});

async function main() {
  const invoice = await nodela.invoices.create({
    amount: 25.00,
    currency: 'USD',
  });

  console.log(invoice.data?.checkout_url);
}

main().catch(console.error);
```

You can also use the default export:

```javascript
const Nodela = require('nodela-sdk').default;
```

## TypeScript support

The SDK is written in TypeScript and ships with full type definitions. This means you get autocompletion, inline documentation, and compile-time type checking in any TypeScript-aware editor (VS Code, WebStorm, etc.).

All request parameter interfaces and response types are exported so you can use them in your own code:

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
  SDKConfigOptions,
} from 'nodela-sdk';
```

Error types are also exported from the package root:

```typescript
import {
  SDKError,
  APIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from 'nodela-sdk';
```

## What to read next

Now that you have the SDK installed and have created your first invoice, here is what to explore next:

- **[Configuration](configuration.md)** — Learn how to customize timeouts, retries, and switch between sandbox and production environments
- **[Invoices](invoices.md)** — Deep dive into creating invoices with all available options (titles, descriptions, redirect URLs, webhooks) and verifying payment status
- **[Transactions](transactions.md)** — Learn how to list and paginate through your transaction history
- **[Error Handling](error-handling.md)** — Understand the different error types and how to handle each one gracefully in your application
- **[Supported Currencies](currencies.md)** — Browse the full list of 60+ fiat currencies you can accept payments in
- **[Examples](examples.md)** — Real-world integration patterns including Express.js checkout endpoints, webhook handlers, payment polling, and retry logic
