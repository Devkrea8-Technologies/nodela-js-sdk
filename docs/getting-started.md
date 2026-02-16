---
title: Getting Started
description: Install the SDK and create your first invoice in minutes
section: Introduction
order: 1
---

# Getting Started

The Nodela SDK is a lightweight TypeScript/JavaScript wrapper around the [Nodela](https://nodela.co) payment API. It lets you accept cryptocurrency payments by creating invoices in 60+ fiat currencies that are automatically converted to stablecoins.

## Prerequisites

- **Node.js** 18.18.0 or later
- A Nodela account with an API key (get one at [nodela.co](https://nodela.co))

## Installation

```bash
npm install nodela-sdk
```

```bash
yarn add nodela-sdk
```

```bash
pnpm add nodela-sdk
```

## Quick Start

```typescript
import { Nodela } from 'nodela-sdk';

// Initialize with your API key
const nodela = new Nodela('nk_test_your_api_key', {
  environment: 'sandbox',
});

// Create a payment invoice
const invoice = await nodela.invoices.create({
  amount: 25.00,
  currency: 'USD',
  customer: {
    email: 'customer@example.com',
  },
});

// Redirect the customer to the checkout page
console.log(invoice.data?.checkout_url);
```

## API Keys

Nodela uses prefixed API keys to distinguish between environments:

| Prefix | Environment | Purpose |
|---|---|---|
| `nk_test_` | Sandbox | Development and testing |
| `nk_live_` | Production | Live payments |

The SDK validates your API key format on initialization and throws a `ValidationError` if the prefix is invalid.

## CommonJS Usage

If your project uses CommonJS modules:

```javascript
const { Nodela } = require('nodela-sdk');

const nodela = new Nodela('nk_test_your_api_key');
```

## TypeScript Support

The SDK is written in TypeScript and ships with full type definitions. All request parameters and response types are exported:

```typescript
import {
  Nodela,
  CreateInvoiceParams,
  CreateInvoiceResponse,
  ListTransactionsResponse,
  SupportedCurrency,
} from 'nodela-sdk';
```

## Next Steps

- [Configuration](configuration.md) — Customize timeouts, retries, and environments
- [Invoices](invoices.md) — Create and verify payment invoices
- [Transactions](transactions.md) — List your transaction history
- [Error Handling](error-handling.md) — Handle errors gracefully
