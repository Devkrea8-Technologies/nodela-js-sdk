---
title: Configuration
description: Configure the SDK for sandbox or production environments
section: Introduction
order: 2
---

# Configuration

The `Nodela` constructor accepts an API key and an optional configuration object to customize SDK behavior.

## Constructor

```typescript
const nodela = new Nodela(apiKey: string, options?: SDKConfigOptions);
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Your Nodela API key (`nk_test_*` or `nk_live_*`) |
| `options` | `SDKConfigOptions` | No | Configuration overrides |

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `environment` | `'sandbox' \| 'production'` | `'production'` | API environment to use |
| `timeout` | `number` | `5000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum number of retry attempts for failed requests |

## Examples

### Sandbox Environment

Use the sandbox environment during development and testing:

```typescript
const nodela = new Nodela('nk_test_your_api_key', {
  environment: 'sandbox',
});
```

### Custom Timeout and Retries

For slower networks or high-reliability requirements:

```typescript
const nodela = new Nodela('nk_live_your_api_key', {
  timeout: 15000,
  maxRetries: 5,
});
```

### Production with Defaults

For production usage with default settings:

```typescript
const nodela = new Nodela('nk_live_your_api_key');
```

## Reading the Configuration

You can inspect the resolved configuration at any time:

```typescript
const config = nodela.getConfig();

console.log(config.environment); // 'production'
console.log(config.timeout);     // 5000
console.log(config.maxRetries);  // 3
console.log(config.baseURL);     // 'https://api.nodela.co'
```

## Validation Rules

The SDK validates all configuration values on initialization:

| Rule | Error |
|---|---|
| API key must start with `nk_test_` or `nk_live_` | `ValidationError` |
| Timeout must be a positive number | `ValidationError` |
| maxRetries must be a non-negative number | `ValidationError` |
| Environment must be `'sandbox'` or `'production'` | `ValidationError` |

```typescript
import { Nodela, ValidationError } from 'nodela-sdk';

try {
  const nodela = new Nodela('invalid_key');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.message);
    // "Invalid API key format. Expected key starting with 'nk_test_' or 'nk_live_'"
  }
}
```

## Type Reference

```typescript
interface SDKConfigOptions {
  timeout?: number;
  maxRetries?: number;
  environment?: 'production' | 'sandbox';
}

interface SDKConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  environment: 'production' | 'sandbox';
}
```
