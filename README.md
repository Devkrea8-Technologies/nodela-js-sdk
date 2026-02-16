# Nodela JavaScript SDK

[![CI](https://github.com/Devkrea8-Technologies/nodela-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Devkrea8-Technologies/nodela-js-sdk/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/nodela-sdk.svg)](https://www.npmjs.com/package/nodela-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.18.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

The official JavaScript/TypeScript SDK for the [Nodela](https://nodela.co) stablecoin payments API. Accept crypto payments globally with support for 60+ fiat currencies, automatic currency conversion, and seamless checkout experiences.

---

## Features

- **Invoice Management** -- Create payment invoices and verify their status
- **Transaction Tracking** -- List and paginate through all your transactions
- **60+ Currencies** -- Accept payments in fiat currencies from every continent
- **Automatic Conversion** -- Fiat prices automatically converted to stablecoin equivalents
- **Sandbox & Production** -- Switch environments with a single config option
- **Full TypeScript Support** -- Strict types, interfaces, and autocompletion out of the box
- **Structured Errors** -- Dedicated error types for authentication, rate limiting, validation, and API errors
- **Lightweight** -- Only one runtime dependency (`axios`)

---

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

**Requirements:** Node.js >= 18.18.0

---

## Quick Start

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key', {
  environment: 'sandbox',
});

// Create a payment invoice
const invoice = await nodela.invoices.create({
  amount: 25.00,
  currency: 'USD',
  customer: { email: 'customer@example.com' },
  success_url: 'https://yoursite.com/success',
});

// Redirect the customer to the checkout page
console.log(invoice.data?.checkout_url);
```

```typescript
// Verify a payment
const result = await nodela.invoices.verify('inv_abc123');
console.log(result.data?.paid);    // true
console.log(result.data?.status);  // "completed"
```

```typescript
// List transactions
const response = await nodela.transactions.list({ page: 1, limit: 25 });
for (const tx of response.data.transactions) {
  console.log(`${tx.reference} -- ${tx.original_amount} ${tx.original_currency} -- ${tx.status}`);
}
```

---

## Documentation

For full API reference, guides, and examples, see the [docs](docs/) folder:

| Page | Description |
|---|---|
| [Getting Started](docs/getting-started.md) | Installation, API keys, and first steps |
| [Configuration](docs/configuration.md) | SDK options, validation rules, and environment setup |
| [Invoices](docs/invoices.md) | Create invoices and verify payment status |
| [Transactions](docs/transactions.md) | List and paginate through transaction history |
| [Error Handling](docs/error-handling.md) | Structured error types and catch patterns |
| [Supported Currencies](docs/currencies.md) | Full list of 60+ supported fiat currencies |
| [Examples](docs/examples.md) | Express checkout, webhooks, polling, retries, and more |

---

## API at a Glance

### `Nodela` Class

```typescript
const nodela = new Nodela(apiKey, options?);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `timeout` | `number` | `5000` | Request timeout in ms |
| `maxRetries` | `number` | `3` | Retry attempts on failure |
| `environment` | `'production' \| 'sandbox'` | `'production'` | API environment |

### Methods

| Method | Description |
|---|---|
| `nodela.invoices.create(params)` | Create a payment invoice |
| `nodela.invoices.verify(invoiceId)` | Verify an invoice's payment status |
| `nodela.transactions.list(params?)` | List transactions with pagination |
| `nodela.getConfig()` | Get the current SDK configuration |

### Error Types

| Error | When |
|---|---|
| `ValidationError` | Invalid input (bad currency, bad config) |
| `AuthenticationError` | Invalid or expired API key (401) |
| `RateLimitError` | Too many requests (429) |
| `APIError` | Other API errors (4xx/5xx) |

See [Error Handling](docs/error-handling.md) for detailed usage.

---

## Testing

```bash
npm test                    # Run all tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:coverage       # Generate coverage report
```

```bash
npm run lint                # Check code style
npm run lint:fix            # Auto-fix lint issues
npm run format:check        # Check formatting
npm run format              # Format code
```

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

Quick steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and run the test suite (`npm test`)
4. Create a changeset (`npm run changeset`)
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

Built by [NodelaPay LTD](mailto:sayhello@nodela.co).
