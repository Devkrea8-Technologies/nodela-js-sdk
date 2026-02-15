# Contributing to the Nodela JavaScript SDK

Thank you for your interest in contributing to the Nodela JavaScript SDK! This guide will walk you through every aspect of the contribution process -- from setting up your local environment to writing tests, adding new features, and getting your changes merged.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Fork and Clone](#fork-and-clone)
  - [Install Dependencies](#install-dependencies)
  - [Verify Your Setup](#verify-your-setup)
- [Project Architecture](#project-architecture)
  - [Directory Structure](#directory-structure)
  - [Key Concepts](#key-concepts)
  - [How the Pieces Fit Together](#how-the-pieces-fit-together)
- [Development Workflow](#development-workflow)
  - [Branch Naming](#branch-naming)
  - [Making Changes](#making-changes)
  - [Running the Build](#running-the-build)
  - [Linting and Formatting](#linting-and-formatting)
- [Adding a New Feature](#adding-a-new-feature)
  - [Step 1: Create the Resource](#step-1-create-the-resource)
  - [Step 2: Define TypeScript Interfaces](#step-2-define-typescript-interfaces)
  - [Step 3: Implement the Methods](#step-3-implement-the-methods)
  - [Step 4: Register the Resource on the Nodela Class](#step-4-register-the-resource-on-the-nodela-class)
  - [Step 5: Write Tests](#step-5-write-tests)
- [Editing an Existing Feature](#editing-an-existing-feature)
- [Adding a New Error Type](#adding-a-new-error-type)
- [Writing Tests](#writing-tests)
  - [Test Structure Overview](#test-structure-overview)
  - [Unit Tests](#unit-tests)
    - [Testing a Resource](#testing-a-resource)
    - [Testing Error Classes](#testing-error-classes)
    - [Testing Configuration](#testing-configuration)
  - [Integration Tests](#integration-tests)
  - [Mocking Patterns](#mocking-patterns)
    - [Mocking the HTTPClient](#mocking-the-httpclient)
    - [Mocking Axios (Integration Tests)](#mocking-axios-integration-tests)
  - [What to Test](#what-to-test)
  - [Running Tests](#running-tests)
  - [Coverage Requirements](#coverage-requirements)
- [Code Style Guide](#code-style-guide)
  - [TypeScript Conventions](#typescript-conventions)
  - [Naming Conventions](#naming-conventions)
  - [File Organization](#file-organization)
- [Changesets and Versioning](#changesets-and-versioning)
  - [Creating a Changeset](#creating-a-changeset)
  - [Changeset Types](#changeset-types)
- [Submitting a Pull Request](#submitting-a-pull-request)
  - [PR Checklist](#pr-checklist)
  - [CI Pipeline](#ci-pipeline)
  - [Review Process](#review-process)
- [Common Recipes](#common-recipes)
  - [Adding a New API Endpoint to an Existing Resource](#adding-a-new-api-endpoint-to-an-existing-resource)
  - [Adding a New Supported Currency](#adding-a-new-supported-currency)
  - [Adding Client-Side Validation](#adding-client-side-validation)

---

## Code of Conduct

Be respectful, constructive, and collaborative. We are all building this together.

---

## Getting Started

### Prerequisites

- **Node.js** >= 14.0.0 (we test against 16.x, 18.x, and 20.x in CI)
- **npm** >= 7.0.0 (ships with Node 16+)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub: `https://github.com/Devkrea8-Technologies/nodela-js-sdk`
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/nodela-js-sdk.git
cd nodela-js-sdk
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/Devkrea8-Technologies/nodela-js-sdk.git
```

### Install Dependencies

```bash
npm install
```

This installs all production and development dependencies, including TypeScript, Jest, ESLint, Prettier, and the Changesets CLI.

### Verify Your Setup

Run the full verification suite to confirm everything works:

```bash
npm run lint          # Lint the source code
npm run format:check  # Verify formatting
npm run build         # Compile TypeScript
npm test              # Run all tests
```

All four commands should pass with zero errors before you begin any work.

---

## Project Architecture

### Directory Structure

```
nodela-js-sdk/
├── src/
│   ├── index.ts              # Main entry point -- exports the Nodela class
│   ├── client.ts             # HTTPClient wrapping Axios with interceptors
│   ├── config.ts             # SDK configuration and validation
│   ├── errors/
│   │   ├── index.ts          # Re-exports all error classes
│   │   ├── base.ts           # SDKError base class (extends Error)
│   │   └── api-error.ts      # APIError, AuthenticationError, RateLimitError, ValidationError
│   └── resources/
│       ├── base.ts           # BaseResource abstract class with path/query helpers
│       ├── Invoices.ts       # Invoice creation and verification
│       └── Transactions.ts   # Transaction listing with pagination
├── tests/
│   ├── unit/                 # Unit tests -- one test file per source file
│   │   ├── index.test.ts
│   │   ├── client.test.ts
│   │   ├── config.test.ts
│   │   ├── errors/
│   │   │   ├── base.test.ts
│   │   │   └── api-error.test.ts
│   │   └── resources/
│   │       ├── base.test.ts
│   │       ├── invoices.test.ts
│   │       └── transactions.test.ts
│   └── integration/          # Integration tests -- full SDK flow
│       └── nodela.test.ts
├── dist/                     # Compiled output (gitignored)
├── .github/workflows/
│   ├── ci.yml                # CI: lint, format, build, test (Node 16/18/20)
│   └── publish.yml           # Automated npm publishing via changesets
├── tsconfig.json             # TypeScript config
├── tsconfig.build.json       # Build-only TS config (excludes tests)
├── jest.config.js            # Jest configuration
├── .eslintrc.json            # ESLint rules
├── .prettierrc               # Prettier formatting rules
└── .changeset/config.json    # Changeset release configuration
```

### Key Concepts

| Concept | Location | Purpose |
|---|---|---|
| **Nodela** | `src/index.ts` | Top-level SDK class. Instantiates config, client, and all resources. |
| **Config** | `src/config.ts` | Validates API keys and options. Stores resolved configuration. |
| **HTTPClient** | `src/client.ts` | Thin Axios wrapper. Adds auth headers, sets up error interceptors. |
| **BaseResource** | `src/resources/base.ts` | Abstract class all resources extend. Provides `buildPath()` and `buildQueryString()`. |
| **Resources** | `src/resources/*.ts` | One class per API domain (Invoices, Transactions). Each extends `BaseResource`. |
| **Errors** | `src/errors/` | Custom error hierarchy. `SDKError` → `APIError`, `AuthenticationError`, etc. |

### How the Pieces Fit Together

```
User Code
  │
  ▼
Nodela (src/index.ts)
  ├── Config        → validates API key & options
  ├── HTTPClient    → sends requests via Axios, transforms errors
  ├── .invoices     → Invoices resource (extends BaseResource)
  └── .transactions → Transactions resource (extends BaseResource)
```

When a user calls `nodela.invoices.create(params)`:

1. The `Invoices` resource validates the currency client-side.
2. It calls `this.client.post(this.basePath, params)` on the `HTTPClient`.
3. The `HTTPClient` sends an Axios request with Bearer token auth.
4. If the response is successful, it returns `response.data`.
5. If it fails, the Axios response interceptor converts the error into a typed SDK error (`AuthenticationError`, `RateLimitError`, or `APIError`).

---

## Development Workflow

### Branch Naming

Use descriptive branch names with a prefix:

```
feature/add-refunds-resource
fix/currency-validation-case-sensitivity
docs/update-api-reference
chore/upgrade-axios
```

### Making Changes

1. Create a branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

2. Make your changes (see [Adding a New Feature](#adding-a-new-feature) or [Editing an Existing Feature](#editing-an-existing-feature)).

3. Run the full check suite before committing:

```bash
npm run lint && npm run format:check && npm run build && npm test
```

4. Commit with a clear, conventional message:

```bash
git commit -m "feat: add refunds resource with create and list methods"
```

Use these prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`.

### Running the Build

```bash
npm run build
```

This runs `rimraf dist && tsc -p tsconfig.build.json`, which:
1. Cleans the `dist/` folder
2. Compiles TypeScript using the build config (excludes test files)
3. Generates `.js`, `.d.ts`, and `.js.map` files in `dist/`

### Linting and Formatting

**Lint:**
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix what can be fixed
```

**Format:**
```bash
npm run format:check  # Verify formatting (CI runs this)
npm run format        # Auto-format all source files
```

**Rules:**
- Single quotes, semicolons, 2-space indentation, 100-character line width
- ES5 trailing commas
- `@typescript-eslint/no-explicit-any` is a warning (not an error) -- minimize usage
- `no-console` is a warning -- use sparingly

---

## Adding a New Feature

This section walks through adding a completely new API resource (e.g., "Refunds") end-to-end.

### Step 1: Create the Resource

Create a new file at `src/resources/Refunds.ts`:

```typescript
import { BaseResource } from './base';

export class Refunds extends BaseResource {
  constructor(client: any) {
    super(client, '/v1/refunds');
  }
}
```

Every resource extends `BaseResource`, which gives you:
- `this.client` -- the `HTTPClient` for making API calls
- `this.basePath` -- the base API path (e.g., `/v1/refunds`)
- `this.buildPath(...segments)` -- joins segments onto the base path
- `this.buildQueryString(params)` -- builds URL query strings, filtering out `null`/`undefined` values

### Step 2: Define TypeScript Interfaces

Define all request/response types in the same file, **above** the class:

```typescript
import { BaseResource } from './base';

// ── Request Interfaces ──────────────────────────

export interface CreateRefundParams {
  invoice_id: string;
  amount?: number;       // Optional: partial refund amount
  reason?: string;
}

export interface ListRefundsParams {
  page?: number;
  limit?: number;
}

// ── Response Interfaces ─────────────────────────

export interface Refund {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  status: string;
  reason?: string;
  created_at: string;
}

export interface CreateRefundResponse {
  success: boolean;
  data?: Refund;
  error?: {
    code: string;
    message: string;
  };
}

export interface ListRefundsResponse {
  success: boolean;
  data: {
    refunds: Refund[];
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

**Guidelines for interfaces:**
- Use `?` for optional fields
- Match the API response structure exactly
- Include both `data` and `error` fields on responses (the API returns one or the other)
- Export every interface so consumers can use them

### Step 3: Implement the Methods

Add methods to the class:

```typescript
export class Refunds extends BaseResource {
  constructor(client: any) {
    super(client, '/v1/refunds');
  }

  async create(params: CreateRefundParams): Promise<CreateRefundResponse> {
    return this.client.post(this.basePath, params);
  }

  async list(params?: ListRefundsParams): Promise<ListRefundsResponse> {
    return this.client.get(this.basePath + this.buildQueryString(params));
  }

  async get(refundId: string): Promise<CreateRefundResponse> {
    return this.client.get(this.buildPath(refundId));
  }
}
```

**Patterns to follow:**
- Methods are always `async` and return a typed `Promise`
- Use `this.client.get()` / `this.client.post()` -- never import Axios directly
- Use `this.basePath` for the endpoint root
- Use `this.buildPath(id)` to append path segments (e.g., `/v1/refunds/ref_123`)
- Use `this.buildQueryString(params)` for query parameters (e.g., `?page=2&limit=10`)
- Perform any client-side validation **before** calling the client (see `Invoices.create()` for an example)

### Step 4: Register the Resource on the Nodela Class

Edit `src/index.ts` to expose your new resource:

```typescript
import { Config, SDKConfigOptions } from './config';
import { HTTPClient } from './client';
import { Transactions } from './resources/Transactions';
import { Invoices } from './resources/Invoices';
import { Refunds } from './resources/Refunds';       // ← Add import

export * from './errors';

export class Nodela {
  private config: Config;
  private client: HTTPClient;

  public readonly transactions: Transactions;
  public readonly invoices: Invoices;
  public readonly refunds: Refunds;                   // ← Add property

  constructor(apiKey: string, options?: SDKConfigOptions) {
    this.config = new Config(apiKey, options);
    this.client = new HTTPClient(this.config);

    this.transactions = new Transactions(this.client);
    this.invoices = new Invoices(this.client);
    this.refunds = new Refunds(this.client);          // ← Initialize
  }

  getConfig(): ReturnType<Config['getAll']> {
    return this.config.getAll();
  }
}

export default Nodela;
```

### Step 5: Write Tests

See the detailed [Writing Tests](#writing-tests) section below. At minimum, you need:
1. A unit test file at `tests/unit/resources/refunds.test.ts`
2. Integration test cases added to `tests/integration/nodela.test.ts`

---

## Editing an Existing Feature

When modifying an existing resource or behavior:

1. **Read the existing code** -- Understand the current implementation and its tests.
2. **Read the existing tests** -- Know what's already covered so you don't break it.
3. **Make your change** -- Follow the same patterns used in the file.
4. **Update existing tests** if behavior changed -- Don't leave stale assertions.
5. **Add new tests** for the new behavior -- Every code path should be tested.
6. **Run the full suite:**

```bash
npm run lint && npm run build && npm test
```

**Example: Adding a new parameter to `CreateInvoiceParams`:**

1. Add the field to the `CreateInvoiceParams` interface in `src/resources/Invoices.ts`:

```typescript
export interface CreateInvoiceParams {
  amount: number;
  currency: SupportedCurrency;
  // ... existing fields ...
  metadata?: Record<string, string>;  // ← New optional field
}
```

2. If the response includes it, update `CreateInvoiceResponse` too.

3. Add test cases in `tests/unit/resources/invoices.test.ts`:

```typescript
it('should pass through metadata when provided', async () => {
  mockClient.post.mockResolvedValue({ success: true });

  await invoices.create({
    amount: 100,
    currency: 'USD',
    metadata: { order_id: '12345' },
  });

  expect(mockClient.post).toHaveBeenCalledWith(
    '/v1/invoices',
    expect.objectContaining({
      metadata: { order_id: '12345' },
    })
  );
});
```

4. Run tests to make sure nothing is broken.

---

## Adding a New Error Type

If the API introduces a new error scenario (e.g., `PaymentRequiredError` for 402 status):

1. Add the class to `src/errors/api-error.ts`:

```typescript
export class PaymentRequiredError extends SDKError {
  constructor(message: string = 'Payment required') {
    super(message, 'PAYMENT_REQUIRED_ERROR', 402);
  }
}
```

2. Re-export it from `src/errors/index.ts`:

```typescript
export { SDKError } from './base';
export {
  APIError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  PaymentRequiredError,    // ← Add export
} from './api-error';
```

3. Handle it in the `HTTPClient` error interceptor in `src/client.ts`:

```typescript
switch (status) {
  case 401:
    throw new AuthenticationError(/* ... */);
  case 402:                                    // ← Add case
    throw new PaymentRequiredError(
      (data as any)?.message || 'Payment required'
    );
  case 429:
    throw new RateLimitError(/* ... */);
  default:
    throw APIError.fromResponse(status, data);
}
```

4. Add unit tests in `tests/unit/errors/api-error.test.ts` and client error handling tests in `tests/unit/client.test.ts`.

---

## Writing Tests

Testing is a first-class concern in this project. Every change must be tested, and CI enforces **80% minimum coverage** across branches, functions, lines, and statements.

### Test Structure Overview

```
tests/
├── unit/                          # Fast, isolated tests (mock all dependencies)
│   ├── index.test.ts              # Tests for the Nodela class
│   ├── client.test.ts             # Tests for HTTPClient
│   ├── config.test.ts             # Tests for Config validation
│   ├── errors/
│   │   ├── base.test.ts           # Tests for SDKError
│   │   └── api-error.test.ts      # Tests for APIError, AuthenticationError, etc.
│   └── resources/
│       ├── base.test.ts           # Tests for BaseResource helpers
│       ├── invoices.test.ts       # Tests for Invoices resource
│       └── transactions.test.ts   # Tests for Transactions resource
└── integration/
    └── nodela.test.ts             # Full-stack tests (Nodela → Client → interceptors)
```

**Rule of thumb:** Unit tests mirror the `src/` directory structure. For every file in `src/`, there should be a corresponding test file in `tests/unit/`.

### Unit Tests

Unit tests isolate a single class by mocking its dependencies.

#### Testing a Resource

Here is the exact pattern used in the project. Follow this template for new resources:

```typescript
// tests/unit/resources/refunds.test.ts

import { Refunds, CreateRefundParams, CreateRefundResponse } from '../../../src/resources/Refunds';
import { HTTPClient } from '../../../src/client';

describe('Refunds', () => {
  let mockClient: jest.Mocked<HTTPClient>;
  let refunds: Refunds;

  // ── Setup: Create a fresh mock client before each test ──
  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;

    refunds = new Refunds(mockClient);
  });

  // ── Test the constructor ──
  describe('constructor', () => {
    it('should set the base path to /v1/refunds', () => {
      mockClient.post.mockResolvedValue({ success: true });
      refunds.create({ invoice_id: 'inv_123' });
      expect(mockClient.post).toHaveBeenCalledWith('/v1/refunds', expect.any(Object));
    });
  });

  // ── Test each method ──
  describe('create()', () => {
    const validParams: CreateRefundParams = {
      invoice_id: 'inv_123',
    };

    const mockResponse: CreateRefundResponse = {
      success: true,
      data: {
        id: 'ref_001',
        invoice_id: 'inv_123',
        amount: 100,
        currency: 'USDT',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
      },
    };

    it('should create a refund with required params', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await refunds.create(validParams);

      expect(mockClient.post).toHaveBeenCalledWith('/v1/refunds', {
        invoice_id: 'inv_123',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create a refund with all params', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      await refunds.create({
        invoice_id: 'inv_123',
        amount: 50,
        reason: 'Customer request',
      });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/refunds', {
        invoice_id: 'inv_123',
        amount: 50,
        reason: 'Customer request',
      });
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Server error'));

      await expect(refunds.create(validParams)).rejects.toThrow('Server error');
    });

    it('should handle error responses from the API', async () => {
      const errorResponse: CreateRefundResponse = {
        success: false,
        error: { code: 'INVALID_INVOICE', message: 'Invoice not found' },
      };
      mockClient.post.mockResolvedValue(errorResponse);

      const result = await refunds.create(validParams);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('list()', () => {
    it('should list refunds without params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { refunds: [], pagination: {} } });

      await refunds.list();

      expect(mockClient.get).toHaveBeenCalledWith('/v1/refunds');
    });

    it('should list refunds with pagination params', async () => {
      mockClient.get.mockResolvedValue({ success: true, data: { refunds: [], pagination: {} } });

      await refunds.list({ page: 2, limit: 10 });

      const callArg = mockClient.get.mock.calls[0][0];
      expect(callArg).toContain('page=2');
      expect(callArg).toContain('limit=10');
    });
  });

  describe('get()', () => {
    it('should get a refund by ID', async () => {
      mockClient.get.mockResolvedValue({ success: true });

      await refunds.get('ref_001');

      expect(mockClient.get).toHaveBeenCalledWith('/v1/refunds/ref_001');
    });
  });
});
```

**Key patterns:**
- Create a `mockClient` with all HTTPClient methods as `jest.fn()`
- Cast it with `as unknown as jest.Mocked<HTTPClient>`
- Use `beforeEach` to reset mocks for every test
- Test the happy path, optional params, error propagation, and error responses
- Assert both the arguments passed to the client **and** the return value

#### Testing Error Classes

```typescript
describe('PaymentRequiredError', () => {
  it('should create with default message', () => {
    const error = new PaymentRequiredError();
    expect(error.message).toBe('Payment required');
    expect(error.code).toBe('PAYMENT_REQUIRED_ERROR');
    expect(error.statusCode).toBe(402);
  });

  it('should create with custom message', () => {
    const error = new PaymentRequiredError('Subscription expired');
    expect(error.message).toBe('Subscription expired');
  });

  it('should be an instance of SDKError', () => {
    const error = new PaymentRequiredError();
    expect(error).toBeInstanceOf(SDKError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should have a stack trace', () => {
    const error = new PaymentRequiredError();
    expect(error.stack).toBeDefined();
  });
});
```

#### Testing Configuration

When testing config validation, test both valid and invalid inputs:

```typescript
it('should accept a valid test API key', () => {
  expect(() => new Config('nk_test_abc123')).not.toThrow();
});

it('should reject an API key without the correct prefix', () => {
  expect(() => new Config('sk_test_abc123')).toThrow('Invalid API key');
});

it('should reject an empty string', () => {
  expect(() => new Config('')).toThrow('Invalid API key');
});
```

### Integration Tests

Integration tests exercise the full SDK stack, from `Nodela` through `HTTPClient` to Axios (which is mocked at the network level). They live in `tests/integration/nodela.test.ts`.

When adding a new resource, add integration tests like:

```typescript
describe('Refunds', () => {
  it('should create a refund through the full stack', async () => {
    const mockResponseData = {
      success: true,
      data: { id: 'ref_001', invoice_id: 'inv_123', amount: 100, currency: 'USDT', status: 'pending', created_at: '2025-01-01T00:00:00Z' },
    };
    mockAxiosInstance.request.mockResolvedValue({ data: mockResponseData, status: 200 });

    const result = await nodela.refunds.create({ invoice_id: 'inv_123' });

    expect(result).toEqual(mockResponseData);
    expect(mockAxiosInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/v1/refunds',
        data: { invoice_id: 'inv_123' },
      })
    );
  });
});
```

### Mocking Patterns

#### Mocking the HTTPClient

For **unit tests**, mock the HTTPClient directly:

```typescript
let mockClient: jest.Mocked<HTTPClient>;

beforeEach(() => {
  mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
  } as unknown as jest.Mocked<HTTPClient>;
});
```

Then control return values per test:

```typescript
// Simulate a successful response
mockClient.post.mockResolvedValue({ success: true, data: { id: 'abc' } });

// Simulate an API error
mockClient.post.mockRejectedValue(new Error('Server error'));
```

#### Mocking Axios (Integration Tests)

For **integration tests**, mock Axios at the module level to test the full flow:

```typescript
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let mockAxiosInstance: any;

beforeEach(() => {
  // Create a mock Axios instance with interceptor capture
  const requestInterceptors: any[] = [];
  const responseInterceptors: any[] = [];

  mockAxiosInstance = {
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn((fn, err) => requestInterceptors.push({ fulfilled: fn, rejected: err })) },
      response: { use: jest.fn((fn, err) => responseInterceptors.push({ fulfilled: fn, rejected: err })) },
    },
  };

  mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
});
```

### What to Test

For every method on a resource, you should test:

| Category | What to Assert | Example |
|---|---|---|
| **Happy path** | Correct URL, correct params, correct return value | `create()` returns the response |
| **Optional params** | They are included when provided, excluded when not | `list()` with and without `page` |
| **Validation** | Invalid input throws before making API call | Wrong currency throws an error |
| **Error propagation** | API errors bubble up correctly | `mockClient.post.mockRejectedValue(...)` |
| **Error responses** | Non-success API responses are returned | `{ success: false, error: {...} }` |
| **Edge cases** | Empty results, undefined params, boundary values | Empty transaction list, page 0 |

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# Only unit tests
npm run test:unit

# Only integration tests
npm run test:integration

# With coverage report
npm run test:coverage
```

### Coverage Requirements

The project enforces **80% minimum** on all four metrics:

| Metric | Minimum |
|---|---|
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |
| Statements | 80% |

If your changes drop coverage below 80%, the CI build will fail. Run `npm run test:coverage` locally to check before pushing.

**Tips for maintaining coverage:**
- Test every `if/else` branch
- Test every thrown error path
- Test edge cases (empty inputs, undefined values, boundary conditions)
- Don't write dead code -- untestable code is a coverage liability

---

## Code Style Guide

### TypeScript Conventions

- **Strict mode** is enabled -- do not use `// @ts-ignore` or `any` without good reason
- Use `interface` for object shapes, `type` for unions/intersections
- Use `readonly` for properties that should not be mutated after construction
- Use `async/await` -- never raw Promises with `.then()`
- Use `as const` for literal arrays (see `SUPPORTED_CURRENCIES`)

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files (resources) | PascalCase | `Invoices.ts`, `Transactions.ts` |
| Files (other) | kebab-case | `api-error.ts`, `base.ts` |
| Classes | PascalCase | `Invoices`, `HTTPClient`, `SDKError` |
| Interfaces | PascalCase | `CreateInvoiceParams`, `Transaction` |
| Methods | camelCase | `create()`, `verify()`, `buildPath()` |
| Constants | UPPER_SNAKE_CASE | `SUPPORTED_CURRENCIES` |
| Properties | camelCase or snake_case matching the API | `invoice_id`, `basePath` |

### File Organization

Within a resource file, organize in this order:

1. Imports
2. Constants (e.g., `SUPPORTED_CURRENCIES`)
3. Type aliases (e.g., `SupportedCurrency`)
4. Request interfaces (e.g., `CreateInvoiceParams`)
5. Response interfaces (e.g., `CreateInvoiceResponse`)
6. Class definition

---

## Changesets and Versioning

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs. Every PR that changes user-facing behavior must include a changeset.

### Creating a Changeset

After making your changes and before committing:

```bash
npm run changeset
```

This will prompt you interactively:
1. Select the package (`nodela-sdk`)
2. Choose the semver bump type
3. Write a summary of the change

A markdown file will be created in the `.changeset/` directory. Commit it with your other changes.

### Changeset Types

| Type | When to Use | Example |
|---|---|---|
| `patch` | Bug fixes, internal changes | "Fix currency validation for lowercase input" |
| `minor` | New features, non-breaking additions | "Add refunds resource with create and list methods" |
| `major` | Breaking changes | "Remove deprecated `getInvoice()` method" |

**When you don't need a changeset:**
- Documentation-only changes
- Test-only changes
- CI/tooling changes

---

## Submitting a Pull Request

### PR Checklist

Before opening your PR, confirm the following:

- [ ] Your branch is up to date with `main`
- [ ] `npm run lint` passes with no errors
- [ ] `npm run format:check` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all unit and integration tests)
- [ ] `npm run test:coverage` shows >= 80% on all metrics
- [ ] You added/updated tests for your changes
- [ ] You created a changeset (if applicable)
- [ ] Your commit messages follow conventional commit format

### CI Pipeline

When you open a PR, GitHub Actions will automatically run:

1. **Lint** -- `npm run lint`
2. **Format check** -- `npm run format:check`
3. **Build** -- `npm run build`
4. **Test with coverage** -- `npm run test:coverage`

These run on a matrix of Node.js 16.x, 18.x, and 20.x. All must pass before merge.

### Review Process

1. Open a PR against `main` with a clear title and description.
2. Ensure CI is green.
3. A maintainer will review your code for:
   - Correctness and completeness
   - Test coverage
   - Adherence to project patterns
   - TypeScript type safety
4. Address any feedback.
5. Once approved, a maintainer will merge your PR.

---

## Common Recipes

### Adding a New API Endpoint to an Existing Resource

For example, adding a `cancel()` method to Invoices:

1. Add the response interface to `src/resources/Invoices.ts`:

```typescript
export interface CancelInvoiceResponse {
  success: boolean;
  data?: { id: string; status: string };
  error?: { code: string; message: string };
}
```

2. Add the method to the `Invoices` class:

```typescript
async cancel(invoiceId: string): Promise<CancelInvoiceResponse> {
  return this.client.post(this.buildPath(invoiceId, 'cancel'));
}
```

3. Add unit tests in `tests/unit/resources/invoices.test.ts`:

```typescript
describe('cancel()', () => {
  it('should cancel an invoice by ID', async () => {
    mockClient.post.mockResolvedValue({ success: true, data: { id: 'inv_123', status: 'cancelled' } });

    const result = await invoices.cancel('inv_123');

    expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices/inv_123/cancel');
    expect(result.success).toBe(true);
  });

  it('should propagate errors', async () => {
    mockClient.post.mockRejectedValue(new Error('Not found'));
    await expect(invoices.cancel('inv_invalid')).rejects.toThrow('Not found');
  });
});
```

4. Add integration tests in `tests/integration/nodela.test.ts`.

### Adding a New Supported Currency

1. Add the currency code to the `SUPPORTED_CURRENCIES` array in `src/resources/Invoices.ts`, in the correct regional group:

```typescript
export const SUPPORTED_CURRENCIES = [
  // Americas
  "USD", "CAD", "MXN", "BRL", "ARS", "CLP", "COP", "PEN", "JMD", "TTD", "BBD",  // ← Added BBD
  // ...
] as const;
```

2. Add a test case in `tests/unit/resources/invoices.test.ts`:

```typescript
it('should include Caribbean currencies', () => {
  expect(SUPPORTED_CURRENCIES).toContain('BBD');
});
```

3. Create an invoice test with the new currency:

```typescript
it('should accept BBD as a valid currency', async () => {
  mockClient.post.mockResolvedValue({ success: true });
  await invoices.create({ amount: 100, currency: 'BBD' as SupportedCurrency });
  expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices', expect.objectContaining({ currency: 'BBD' }));
});
```

### Adding Client-Side Validation

Follow the pattern from `Invoices.create()`:

```typescript
async create(params: CreateRefundParams): Promise<CreateRefundResponse> {
  // Validate before making the API call
  if (params.amount !== undefined && params.amount <= 0) {
    throw new Error('Refund amount must be a positive number');
  }

  return this.client.post(this.basePath, params);
}
```

Then test both the valid and invalid paths:

```typescript
it('should throw for non-positive refund amount', async () => {
  await expect(
    refunds.create({ invoice_id: 'inv_123', amount: -10 })
  ).rejects.toThrow('Refund amount must be a positive number');
});

it('should not call the API when validation fails', async () => {
  try {
    await refunds.create({ invoice_id: 'inv_123', amount: 0 });
  } catch {
    // expected
  }
  expect(mockClient.post).not.toHaveBeenCalled();
});
```

---

Thank you for contributing! If you have questions, open an issue or reach out to us at sayhello@nodela.co.
