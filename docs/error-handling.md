---
title: Error Handling
description: Handle errors gracefully with structured error types
section: API Reference
order: 5
---

# Error Handling

When something goes wrong — an invalid API key, a network timeout, a server error, or a bad currency code — the SDK throws a typed error that you can catch and handle precisely. This page covers every error type, when each one is thrown, what data it carries, and how to write robust error handling code.

## Why typed errors matter

Without typed errors, you would have to inspect raw HTTP status codes and parse error response bodies to figure out what went wrong. The Nodela SDK does this work for you:

- A **401 response** becomes an `AuthenticationError` — you know immediately that your API key is the problem
- A **429 response** becomes a `RateLimitError` with a `retryAfter` property — you know exactly how long to wait
- A missing or unsupported currency throws a `ValidationError` before any HTTP request is sent — you save a round trip
- Any other server error becomes an `APIError` with the status code and response body attached

This means your error handling code can use `instanceof` checks instead of parsing status codes and guessing at error formats.

## Error class hierarchy

All SDK errors extend the base `SDKError` class, which itself extends JavaScript's built-in `Error`. Here is the complete hierarchy:

```
Error (built-in)
└── SDKError
    ├── APIError
    │   ├── AuthenticationError
    │   └── RateLimitError
    └── ValidationError
```

This hierarchy means:
- Every SDK error is an `instanceof Error`, so it works with standard try/catch and has a `.message` and `.stack`
- Every SDK error is an `instanceof SDKError`, so catching `SDKError` catches all SDK-specific errors
- `AuthenticationError` and `RateLimitError` are subclasses of `APIError`, so catching `APIError` also catches authentication and rate limit errors. If you want to handle them separately, check for the more specific types **first** (see the ordering section below).

---

## Error types in detail

### `SDKError`

The base class for all errors thrown by the SDK. You will rarely see a plain `SDKError` thrown directly — it is primarily the base class that the other errors extend. However, catching `SDKError` is useful as a catch-all for any SDK-related error.

```typescript
class SDKError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly details?: unknown;
}
```

**Properties:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `message` | `string` | A human-readable description of what went wrong. Inherited from `Error`. |
| `name` | `string` | The name of the error class (e.g., `"AuthenticationError"`, `"RateLimitError"`). Inherited from `Error` but set to the constructor name. |
| `stack` | `string` | The stack trace showing where the error was thrown. Inherited from `Error`. The stack trace is captured at the point of the SDK error construction, not at the point of the original HTTP failure, which makes it easier to trace back to your code. |
| `code` | `string` | A machine-readable error code string. Use this for programmatic error identification without relying on `instanceof`. Possible values: `'API_ERROR'`, `'AUTHENTICATION_ERROR'`, `'RATE_LIMIT_ERROR'`, `'VALIDATION_ERROR'`. |
| `statusCode` | `number \| undefined` | The HTTP status code that caused this error, if applicable. For example, `401` for authentication errors, `429` for rate limit errors, `500` for server errors. `undefined` for errors that occur before a request is made (like `ValidationError`). |
| `details` | `unknown` | Additional context about the error. For API errors, this is typically the raw response body from the server. For validation errors, this may be `undefined` or contain additional context. You can inspect this for debugging, but its shape is not guaranteed. |

---

### `ValidationError`

Thrown when the SDK detects invalid input **before** making any HTTP request. This is a client-side check — no network call is made, which means you get instant feedback and save a round trip to the API.

```typescript
class ValidationError extends SDKError {
  // code: 'VALIDATION_ERROR'
  // statusCode: undefined (no HTTP request was made)
}
```

**When it is thrown:**

- **Unsupported currency** — When you pass a currency code to `invoices.create()` that is not in the SDK's list of 60+ supported currencies:

```typescript
try {
  await nodela.invoices.create({ amount: 100, currency: 'XYZ' as any });
} catch (error) {
  // error.message: 'Unsupported currency: "XYZ". Supported currencies: USD, CAD, MXN, ...'
  // error.code: 'VALIDATION_ERROR'
  // error.statusCode: undefined
}
```

**Note on configuration validation:** Invalid configuration values (bad API key format, negative timeout, invalid environment) throw a plain `Error` rather than a `ValidationError`. This is because configuration validation happens in the constructor before the error system is fully initialized. See [Configuration](configuration.md#validation-rules-in-detail) for details on those error messages.

---

### `AuthenticationError`

Thrown when the Nodela API returns a **401 Unauthorized** response. This means your API key was rejected by the server.

```typescript
class AuthenticationError extends SDKError {
  // code: 'AUTHENTICATION_ERROR'
  // statusCode: 401
}
```

**When it is thrown:**

- The API key has been revoked or deactivated
- The API key has expired
- The API key does not have permission for the requested operation
- The API key format is valid (starts with `nk_test_` or `nk_live_`) but the key itself does not exist in Nodela's system

**What the error message contains:** The SDK tries to extract a message from the API response body. If the response body contains a `message` field, that is used. Otherwise, the default message is `"Invalid API key or unauthorized access"`.

```typescript
try {
  await nodela.invoices.create({ amount: 50, currency: 'USD' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error(error.message);    // "Invalid API key or unauthorized access"
    console.error(error.code);       // "AUTHENTICATION_ERROR"
    console.error(error.statusCode); // 401
  }
}
```

**How to fix it:** Double-check that your API key is correct, has not been revoked, and matches the environment you are targeting (test keys for sandbox, live keys for production).

---

### `RateLimitError`

Thrown when the Nodela API returns a **429 Too Many Requests** response. This means you are sending too many requests in a short period of time and need to slow down.

```typescript
class RateLimitError extends SDKError {
  readonly retryAfter?: number;
  // code: 'RATE_LIMIT_ERROR'
  // statusCode: 429
}
```

**The `retryAfter` property:**

This is the key differentiator for `RateLimitError`. When the API returns a `retry-after` header in its 429 response, the SDK parses it and exposes it as `retryAfter` — an integer representing the number of **seconds** you should wait before sending another request.

| Property | Type | Description |
| -------- | ---- | ----------- |
| `retryAfter` | `number \| undefined` | The number of seconds to wait before retrying. Extracted from the `retry-after` HTTP response header. `undefined` if the header was not present in the response. |

**How to handle rate limits:**

```typescript
try {
  const invoice = await nodela.invoices.create({ amount: 50, currency: 'USD' });
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error('Rate limited!');
    console.error('Message:', error.message);        // "Rate limit exceeded"
    console.error('Status:', error.statusCode);      // 429
    console.error('Retry after:', error.retryAfter); // e.g., 30 (seconds)

    if (error.retryAfter) {
      // Wait the specified number of seconds, then retry
      console.log(`Waiting ${error.retryAfter} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, error.retryAfter! * 1000));

      // Now retry the request
      const invoice = await nodela.invoices.create({ amount: 50, currency: 'USD' });
    }
  }
}
```

For a more robust retry pattern with exponential backoff, see [Examples](examples.md#error-retry-with-backoff).

---

### `APIError`

The general-purpose error for any API response with a non-successful status code that is not specifically a 401 or 429. This includes 400 (Bad Request), 403 (Forbidden), 404 (Not Found), 500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable), and any other HTTP error status.

```typescript
class APIError extends SDKError {
  // code: 'API_ERROR'
  // statusCode: varies (400, 403, 404, 500, 502, 503, etc.)
}
```

**When it is thrown:**

- Any HTTP response with a status code in the 4xx or 5xx range (except 401 and 429, which have their own error types)
- Network errors (no response received) — in this case, `statusCode` is `0` and `details` contains `{ originalError: "..." }` with the underlying error message

**How the error message is extracted:** The SDK tries multiple strategies to find a useful error message from the API response body:

1. If the response body has a top-level `message` field (string), use that
2. If the response body has an `error` field that is a string, use that
3. If the response body has an `error` field that is an object with a `message` field (string), use that
4. If none of the above, use the default: `"API request failed with status code {status}"`

This means you get the most specific error message available regardless of the API's response format.

**Examples:**

```typescript
try {
  await nodela.invoices.verify('inv_nonexistent');
} catch (error) {
  if (error instanceof APIError) {
    console.error(error.message);    // The most specific message available
    console.error(error.statusCode); // e.g., 404
    console.error(error.code);       // "API_ERROR"
    console.error(error.details);    // The raw response body from the API
  }
}
```

**Network errors (no response):**

When the request fails before receiving a response (e.g., DNS resolution failure, connection timeout, network unreachable), the SDK throws an `APIError` with `statusCode: 0`:

```typescript
try {
  await nodela.invoices.create({ amount: 50, currency: 'USD' });
} catch (error) {
  if (error instanceof APIError && error.statusCode === 0) {
    // Network error — no response was received
    console.error('Network error:', error.message); // "Network error occurred"
    console.error('Details:', error.details);        // { originalError: "connect ECONNREFUSED ..." }
  }
}
```

---

## How to catch errors: the recommended pattern

The order in which you check `instanceof` matters because `AuthenticationError` and `RateLimitError` are subclasses of `APIError`. If you check for `APIError` first, it will also catch authentication and rate limit errors, and you will never reach the more specific handlers.

**Always check from most specific to least specific:**

```typescript
import {
  Nodela,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  APIError,
  SDKError,
} from 'nodela-sdk';

const nodela = new Nodela(process.env.NODELA_API_KEY!);

try {
  const invoice = await nodela.invoices.create({
    amount: 100,
    currency: 'USD',
  });

  // ... use the invoice ...
} catch (error) {
  // 1. Check for client-side validation errors first (no HTTP request was made)
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
    // Fix: Check the parameters you are passing (currency code, etc.)
  }

  // 2. Check for authentication errors (401)
  else if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    // Fix: Check your API key
  }

  // 3. Check for rate limiting (429)
  else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter} seconds.`);
    // Fix: Wait and retry, or reduce request frequency
  }

  // 4. Check for other API errors (4xx/5xx or network errors)
  else if (error instanceof APIError) {
    console.error(`API error (status ${error.statusCode}):`, error.message);
    console.error('Response body:', error.details);
    // Fix: Depends on the status code. 5xx errors are usually transient — retry.
    //       4xx errors usually mean something is wrong with your request.
  }

  // 5. Catch-all for any other SDK error (unlikely, but defensive)
  else if (error instanceof SDKError) {
    console.error(`SDK error [${error.code}]:`, error.message);
  }

  // 6. Non-SDK errors (e.g., your own code threw an error)
  else {
    console.error('Unexpected error:', error);
  }
}
```

**Why this order matters:**

```typescript
// BAD — AuthenticationError is a subclass of APIError,
// so this catches authentication errors in the wrong handler:
if (error instanceof APIError) {
  // This block catches EVERYTHING: 401, 429, 500, etc.
  // You lose the ability to handle auth and rate limit errors specifically
} else if (error instanceof AuthenticationError) {
  // This block NEVER runs because the check above already matched
}

// GOOD — Check the specific types first:
if (error instanceof AuthenticationError) {
  // Only 401 errors reach here
} else if (error instanceof RateLimitError) {
  // Only 429 errors reach here
} else if (error instanceof APIError) {
  // All other HTTP errors (400, 403, 404, 500, etc.)
}
```

---

## Using error codes instead of instanceof

If you prefer not to use `instanceof` (e.g., because you are working with serialized errors or across process boundaries), you can use the `code` property instead:

```typescript
try {
  await nodela.invoices.create({ amount: 100, currency: 'USD' });
} catch (error) {
  if (error instanceof SDKError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        console.error('Invalid input:', error.message);
        break;
      case 'AUTHENTICATION_ERROR':
        console.error('Auth failed:', error.message);
        break;
      case 'RATE_LIMIT_ERROR':
        console.error('Rate limited:', error.message);
        break;
      case 'API_ERROR':
        console.error('API error:', error.message);
        break;
      default:
        console.error('Unknown SDK error:', error.message);
    }
  }
}
```

---

## Quick reference table

| Error Class | `code` | `statusCode` | Thrown when | Has extra properties |
| ----------- | ------ | ------------ | ---------- | -------------------- |
| `SDKError` | varies | varies | Base class — rarely thrown directly | — |
| `ValidationError` | `VALIDATION_ERROR` | `undefined` | Invalid currency code or other client-side validation | — |
| `AuthenticationError` | `AUTHENTICATION_ERROR` | `401` | Invalid, expired, or revoked API key | — |
| `RateLimitError` | `RATE_LIMIT_ERROR` | `429` | Too many requests to the API | `retryAfter?: number` |
| `APIError` | `API_ERROR` | varies | Any other HTTP error (4xx/5xx) or network failure | — |

---

## Type reference

All error classes are exported from the package root:

```typescript
import {
  SDKError,
  APIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from 'nodela-sdk';
```

You can use these in type annotations:

```typescript
function handleNodelError(error: SDKError): void {
  console.error(`[${error.code}] ${error.message}`);
  if (error.statusCode) {
    console.error(`HTTP status: ${error.statusCode}`);
  }
}
```
