---
title: Error Handling
description: Handle errors gracefully with structured error types
section: API Reference
order: 5
---

# Error Handling

The SDK provides a structured error hierarchy so you can catch and handle specific failure scenarios. All SDK errors extend the base `SDKError` class.

## Error Hierarchy

```
SDKError
├── APIError
│   ├── AuthenticationError
│   └── RateLimitError
└── ValidationError
```

## Error Types

### SDKError

The base class for all errors thrown by the SDK.

```typescript
class SDKError extends Error {
  readonly code: string;
  readonly statusCode?: number;
  readonly details?: unknown;
}
```

| Property | Type | Description |
|---|---|---|
| `message` | `string` | Human-readable error message |
| `code` | `string` | Machine-readable error code |
| `statusCode` | `number \| undefined` | HTTP status code (if applicable) |
| `details` | `unknown` | Additional error context from the API |

### ValidationError

Thrown when client-side validation fails before a request is made.

```typescript
class ValidationError extends SDKError {
  // code: 'VALIDATION_ERROR'
}
```

**Common causes:**
- Invalid API key format
- Unsupported currency code
- Invalid configuration values (negative timeout, etc.)

### AuthenticationError

Thrown when the API returns a 401 status code.

```typescript
class AuthenticationError extends SDKError {
  // code: 'AUTHENTICATION_ERROR'
  // statusCode: 401
}
```

**Common causes:**
- Expired API key
- Revoked API key
- Using a test key in production (or vice versa)

### RateLimitError

Thrown when the API returns a 429 status code.

```typescript
class RateLimitError extends SDKError {
  // code: 'RATE_LIMIT_ERROR'
  // statusCode: 429
  readonly retryAfter?: number; // Seconds to wait before retrying
}
```

### APIError

Thrown for all other API errors (4xx/5xx responses).

```typescript
class APIError extends SDKError {
  // code: 'API_ERROR'
}
```

## Catching Errors

Import the error classes and use `instanceof` to handle each type:

```typescript
import {
  Nodela,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  APIError,
  SDKError,
} from 'nodela-sdk';

const nodela = new Nodela('nk_test_your_api_key');

try {
  const invoice = await nodela.invoices.create({
    amount: 100,
    currency: 'USD',
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Client-side validation failed — fix the input
    console.error('Invalid input:', error.message);

  } else if (error instanceof AuthenticationError) {
    // API key is invalid — check your credentials
    console.error('Authentication failed:', error.message);

  } else if (error instanceof RateLimitError) {
    // Too many requests — wait and retry
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);

  } else if (error instanceof APIError) {
    // Server returned an error
    console.error(`API error ${error.statusCode}:`, error.message);
    console.error('Details:', error.details);

  } else if (error instanceof SDKError) {
    // Catch-all for any other SDK error
    console.error(`SDK error [${error.code}]:`, error.message);
  }
}
```

## Handling Rate Limits

The `RateLimitError` includes a `retryAfter` property (in seconds) extracted from the API response headers:

```typescript
try {
  const invoice = await nodela.invoices.create({ amount: 50, currency: 'USD' });
} catch (error) {
  if (error instanceof RateLimitError && error.retryAfter) {
    await new Promise((resolve) => setTimeout(resolve, error.retryAfter! * 1000));
    // Retry the request
  }
}
```

## Type Reference

```typescript
import {
  SDKError,
  APIError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
} from 'nodela-sdk';
```
