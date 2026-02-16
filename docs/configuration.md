---
title: Configuration
description: Configure the SDK for sandbox or production environments
section: Introduction
order: 2
---

# Configuration

Every interaction with the Nodela SDK starts with creating a `Nodela` instance. This page explains every configuration option available, what happens internally when you create an instance, how validation works, and how to inspect the resolved configuration at runtime.

## Creating an instance

The `Nodela` class is the main entry point for the SDK. You create an instance by passing your API key and an optional configuration object:

```typescript
import { Nodela } from 'nodela-sdk';

const nodela = new Nodela(apiKey, options?);
```

The constructor takes two arguments:

| Argument | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `apiKey` | `string` | Yes | Your Nodela API key. Must start with `nk_test_` (sandbox) or `nk_live_` (production). |
| `options` | `SDKConfigOptions` | No | An object to override default timeout, retries, and environment settings. |

### What happens when you create an instance

When you call `new Nodela(apiKey, options?)`, the SDK performs the following steps in order:

1. **API key validation** — The SDK checks that your API key is a non-empty string that starts with either `nk_test_` or `nk_live_`. If the key is missing, empty, or has an invalid prefix, the constructor throws an `Error` immediately. This prevents you from making API calls that would inevitably fail with a 401.

2. **Options validation** — If you provided an options object, the SDK validates each field individually:
   - `timeout` must be a positive number (greater than 0)
   - `maxRetries` must be a non-negative number (0 or greater)
   - `environment` must be exactly `'production'` or `'sandbox'`

   If any validation fails, the constructor throws an `Error` with a descriptive message explaining what went wrong.

3. **Configuration resolution** — The SDK merges your provided options with the defaults to produce a fully resolved configuration object. Any option you did not provide falls back to its default value.

4. **HTTP client creation** — The SDK creates an internal HTTP client (powered by `axios`) that is pre-configured with:
   - **Base URL:** `https://api.nodela.co`
   - **Authorization header:** `Bearer <your-api-key>`
   - **User-Agent header:** `nodela-sdk/<node-version>` (e.g., `nodela-sdk/v20.11.0`)
   - **Content-Type header:** `application/json`
   - **Timeout:** The value from your resolved configuration
   - **Error interceptors:** Automatic conversion of HTTP errors into typed SDK errors (see [Error Handling](error-handling.md))

5. **Resource initialization** — The SDK creates the `invoices` and `transactions` resource objects, each backed by the shared HTTP client. These are the objects you interact with to make API calls.

After this process completes, you have a fully configured `nodela` instance ready to make API calls.

## Configuration options

### `environment`

**Type:** `'production' | 'sandbox'`
**Default:** `'production'`

Controls which Nodela API environment your requests are sent to. Use `'sandbox'` during development and testing — no real payments will be processed. Switch to `'production'` when you are ready to accept real payments.

```typescript
// Development: use sandbox so no real money moves
const nodela = new Nodela('nk_test_your_api_key', {
  environment: 'sandbox',
});

// Production: real payments are processed
const nodela = new Nodela('nk_live_your_api_key', {
  environment: 'production', // This is the default, so you can omit it
});
```

**Tip:** A common pattern is to derive the environment from `NODE_ENV`:

```typescript
const nodela = new Nodela(process.env.NODELA_API_KEY!, {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});
```

### `timeout`

**Type:** `number`
**Default:** `5000` (5 seconds)

The maximum number of milliseconds the SDK will wait for an HTTP response before aborting the request and throwing an error. This applies to every API call made through the SDK — invoice creation, invoice verification, and transaction listing.

```typescript
// Increase timeout to 15 seconds for slower networks
const nodela = new Nodela('nk_test_your_api_key', {
  timeout: 15000,
});
```

**How to choose a timeout value:**
- **5000 (default)** is appropriate for most applications with normal network conditions
- **10000–15000** is a safer choice if your server has high latency to the Nodela API (e.g., running in a region far from the API servers)
- **2000–3000** may be appropriate for user-facing requests where you want to fail fast and show an error rather than making the user wait

**What happens when a request times out:** The underlying HTTP client (`axios`) aborts the request and the SDK throws an `APIError` with a network error message. The request may or may not have been received by the Nodela API — if you are creating an invoice, check for duplicates before retrying.

### `maxRetries`

**Type:** `number`
**Default:** `3`

The maximum number of times the SDK will attempt to send a request. This value is stored in the configuration but note that automatic retry logic depends on your implementation — see the [retry with backoff example](examples.md#error-retry-with-backoff) for a pattern you can use.

```typescript
// Allow up to 5 retry attempts
const nodela = new Nodela('nk_test_your_api_key', {
  maxRetries: 5,
});

// Disable retries entirely
const nodela = new Nodela('nk_test_your_api_key', {
  maxRetries: 0,
});
```

## Combining options

You can set any combination of options:

```typescript
const nodela = new Nodela('nk_live_your_api_key', {
  environment: 'production',
  timeout: 10000,
  maxRetries: 5,
});
```

Or use none at all — every option has a sensible default:

```typescript
// Uses all defaults: environment='production', timeout=5000, maxRetries=3
const nodela = new Nodela('nk_live_your_api_key');
```

## Inspecting the configuration at runtime

You can retrieve the fully resolved configuration at any time using the `getConfig()` method. This returns a snapshot (a copy, not a reference) of the current configuration:

```typescript
const config = nodela.getConfig();

console.log(config);
// {
//   apiKey: 'nk_live_your_api_key',
//   baseURL: 'https://api.nodela.co',
//   timeout: 5000,
//   maxRetries: 3,
//   environment: 'production'
// }
```

Each property in the returned object:

| Property | Type | Description |
| -------- | ---- | ----------- |
| `apiKey` | `string` | The API key you provided to the constructor |
| `baseURL` | `string` | The base URL for all API requests. Always `https://api.nodela.co`. |
| `timeout` | `number` | The resolved timeout value in milliseconds |
| `maxRetries` | `number` | The resolved maximum retry count |
| `environment` | `'production' \| 'sandbox'` | The resolved environment |

**Note:** The configuration is immutable after initialization. There is no `setConfig()` or way to change the configuration after the `Nodela` instance is created. If you need different settings, create a new `Nodela` instance.

## Validation rules in detail

The SDK validates your inputs at construction time so you catch misconfiguration immediately rather than encountering cryptic errors later during an API call. Here is exactly what is validated and the error messages you will see:

### API key validation

The API key must be:
- Not `null` or `undefined`
- A `string` type (not a number, object, etc.)
- Not an empty string or a string of only whitespace
- Prefixed with `nk_test_` or `nk_live_`

If any of these checks fail, the constructor throws:

```
Error: Invalid API key provided. Please provide a valid API key.
```

**Example:**

```typescript
// All of these will throw an error:
new Nodela('');                    // Empty string
new Nodela('   ');                 // Whitespace only
new Nodela('sk_test_123');         // Wrong prefix (not nk_)
new Nodela('my_api_key');          // No recognized prefix
```

### Timeout validation

If provided, the `timeout` option must be:
- A `number` type
- Greater than `0`

If validation fails, the constructor throws:

```
Error: Invalid timeout value. Timeout must be a positive number.
```

**Example:**

```typescript
// These will throw:
new Nodela('nk_test_key', { timeout: 0 });      // Zero is not positive
new Nodela('nk_test_key', { timeout: -1000 });   // Negative
new Nodela('nk_test_key', { timeout: 'fast' });  // Not a number (TypeScript would also catch this)
```

### maxRetries validation

If provided, the `maxRetries` option must be:
- A `number` type
- Greater than or equal to `0`

If validation fails, the constructor throws:

```
Error: Invalid maxRetries value. maxRetries must be a non-negative number.
```

**Example:**

```typescript
// This will throw:
new Nodela('nk_test_key', { maxRetries: -1 });   // Negative

// This is valid (disables retries):
new Nodela('nk_test_key', { maxRetries: 0 });     // Zero is allowed
```

### Environment validation

If provided, the `environment` option must be exactly the string `'production'` or `'sandbox'`. Any other value throws:

```
Error: Invalid environment value. Environment must be either "production" or "sandbox".
```

**Example:**

```typescript
// These will throw:
new Nodela('nk_test_key', { environment: 'staging' });  // Not recognized
new Nodela('nk_test_key', { environment: 'prod' });     // Must be full word
```

## Type reference

The SDK exports two TypeScript interfaces related to configuration:

```typescript
// What you pass to the constructor (all fields optional)
interface SDKConfigOptions {
  timeout?: number;
  maxRetries?: number;
  environment?: 'production' | 'sandbox';
}

// The fully resolved config (all fields required)
// This is what getConfig() returns
interface SDKConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  environment: 'production' | 'sandbox';
}
```

You can import these types if you need to pass configuration objects around in your own code:

```typescript
import type { SDKConfigOptions, SDKConfig } from 'nodela-sdk';

function createNodelClient(apiKey: string, opts?: SDKConfigOptions) {
  return new Nodela(apiKey, opts);
}
```
