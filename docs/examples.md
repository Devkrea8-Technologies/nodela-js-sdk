---
title: Examples
description: Real-world integration patterns and recipes
section: Guides
order: 7
---

# Examples

This page contains complete, real-world integration patterns that you can adapt for your own projects. Each example is self-contained and explains not just _what_ the code does, but _why_ each piece is there.

---

## Express checkout endpoint

This example shows how to build a checkout API endpoint with Express.js. When your frontend calls this endpoint, it creates a Nodela invoice and returns the checkout URL for the customer to complete payment.

**What this covers:**
- Initializing the SDK with environment-based configuration
- Creating an invoice from request body data
- Handling validation errors vs. server errors
- Returning the checkout URL to the frontend

```typescript
import express from 'express';
import { Nodela, ValidationError, AuthenticationError, APIError } from 'nodela-sdk';

const app = express();
app.use(express.json());

// Initialize the SDK once when your server starts.
// Store the instance and reuse it for all requests — do not create
// a new Nodela instance per request, as that wastes resources.
const nodela = new Nodela(process.env.NODELA_API_KEY!, {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  timeout: 10000, // 10 seconds — generous for a server-side call
});

app.post('/api/checkout', async (req, res) => {
  try {
    const { amount, currency, email, name, orderId } = req.body;

    // Basic input validation (your app should validate more thoroughly)
    if (!amount || !currency || !email) {
      return res.status(400).json({
        error: 'Missing required fields: amount, currency, email',
      });
    }

    const invoice = await nodela.invoices.create({
      amount: Number(amount),
      currency,
      reference: orderId,          // Link back to your order system
      customer: { email, name },
      success_url: `${process.env.APP_URL}/orders/${orderId}/success`,
      cancel_url: `${process.env.APP_URL}/orders/${orderId}`,
      webhook_url: `${process.env.APP_URL}/api/webhooks/nodela`,
    });

    if (invoice.success && invoice.data) {
      // Return the checkout URL to your frontend.
      // Your frontend can redirect the user or open this in a new tab.
      res.json({
        checkoutUrl: invoice.data.checkout_url,
        invoiceId: invoice.data.invoice_id,
        amount: invoice.data.amount,
        currency: invoice.data.currency,
        exchangeRate: invoice.data.exchange_rate,
      });
    } else {
      // The API returned a structured error (e.g., invalid parameters)
      res.status(400).json({ error: invoice.error?.message });
    }
  } catch (error) {
    // Handle SDK errors specifically so you can return useful messages
    if (error instanceof ValidationError) {
      // Bad input (unsupported currency, etc.) — tell the client what's wrong
      res.status(422).json({ error: error.message });
    } else if (error instanceof AuthenticationError) {
      // Your API key is bad — this is a server configuration issue, not a client error
      console.error('Nodela authentication failed:', error.message);
      res.status(500).json({ error: 'Payment service configuration error' });
    } else if (error instanceof APIError) {
      // Some other API error — log it and return a generic message
      console.error(`Nodela API error (${error.statusCode}):`, error.message);
      res.status(502).json({ error: 'Payment service temporarily unavailable' });
    } else {
      // Unexpected error — log the full error for debugging
      console.error('Unexpected error during checkout:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Frontend usage (React example):**

```typescript
async function handleCheckout(orderId: string, amount: number, currency: string) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency,
      email: user.email,
      name: user.name,
      orderId,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    // Redirect the customer to the Nodela checkout page
    window.location.href = data.checkoutUrl;
  } else {
    // Show error to the user
    alert(data.error);
  }
}
```

---

## Webhook handler

Webhooks are the recommended way to know when a payment has been completed. When a customer pays an invoice, Nodela sends an HTTP POST request to the `webhook_url` you specified when creating the invoice. Your webhook handler should verify the invoice and then fulfill the order.

**What this covers:**
- Receiving webhook notifications from Nodela
- Verifying the invoice to confirm payment (never trust webhook data alone)
- Fulfilling the order after verification
- Responding with the correct status code
- Handling errors without breaking the webhook flow

```typescript
app.post('/api/webhooks/nodela', async (req, res) => {
  // Nodela sends the invoice_id in the webhook body.
  const { invoice_id } = req.body;

  if (!invoice_id) {
    // Malformed webhook — acknowledge it so Nodela doesn't retry
    return res.sendStatus(400);
  }

  try {
    // IMPORTANT: Always verify the invoice via the API.
    // Never trust the webhook body alone — it could be spoofed.
    // The verify() call confirms the payment status directly with Nodela's servers.
    const result = await nodela.invoices.verify(invoice_id);

    if (result.success && result.data?.paid) {
      // Payment is confirmed! Now fulfill the order.
      // The reference field contains the order ID you passed when creating the invoice.
      const orderId = result.data.reference;

      if (orderId) {
        await fulfillOrder(orderId, {
          invoiceId: result.data.invoice_id,
          amount: result.data.amount,
          currency: result.data.currency,
          originalAmount: result.data.original_amount,
          originalCurrency: result.data.original_currency,
          network: result.data.payment?.network,
          token: result.data.payment?.token,
          txHash: result.data.payment?.tx_hash,
          paidAt: result.data.payment?.created_at,
        });
      }

      console.log(`Payment confirmed for invoice ${invoice_id} (order: ${orderId})`);
    } else {
      // Invoice exists but is not paid yet.
      // This could be a status update for a different event (e.g., invoice created).
      console.log(`Webhook received for invoice ${invoice_id}, status: ${result.data?.status}`);
    }

    // Always respond with 200 to acknowledge receipt.
    // If you respond with a non-2xx status, Nodela may retry the webhook.
    res.sendStatus(200);
  } catch (error) {
    // Log the error but still respond with 200 to prevent infinite retries.
    // You may want to implement your own retry logic or dead-letter queue.
    console.error(`Webhook processing failed for invoice ${invoice_id}:`, error);

    // Respond with 500 if you want Nodela to retry, or 200 if you
    // want to handle the failure yourself (e.g., via a background job).
    res.sendStatus(500);
  }
});

// Example fulfillOrder function — replace with your own business logic
async function fulfillOrder(orderId: string, paymentDetails: Record<string, unknown>) {
  // Update your database to mark the order as paid
  // Send a confirmation email to the customer
  // Trigger shipping, grant access, etc.
  console.log(`Fulfilling order ${orderId}:`, paymentDetails);
}
```

**Security considerations for webhooks:**

- **Always verify via the API:** Never trust the data in the webhook body to make business decisions (like fulfilling an order). Always call `nodela.invoices.verify()` to confirm the payment status directly with Nodela.
- **Idempotency:** Your webhook handler may be called more than once for the same event (e.g., if your server was slow to respond and Nodela retried). Make sure your fulfillment logic is idempotent — fulfilling the same order twice should be safe (e.g., check if the order was already fulfilled before doing it again).
- **Respond quickly:** Webhook handlers should respond within a few seconds. If your fulfillment logic takes a long time, acknowledge the webhook immediately (return 200) and process the order asynchronously (e.g., via a message queue or background job).

---

## Polling for payment status

If you cannot receive webhooks (e.g., during local development, or if your server is behind a firewall), you can poll the invoice verification endpoint at regular intervals until the invoice is paid or a timeout is reached.

**What this covers:**
- Polling at a configurable interval
- Timing out after a maximum wait period
- Returning the full invoice data when payment is confirmed

```typescript
import { Nodela, VerifyInvoiceResponse } from 'nodela-sdk';

/**
 * Polls the Nodela API at regular intervals until the invoice is paid
 * or the timeout is reached.
 *
 * @param nodela     - The Nodela SDK instance
 * @param invoiceId  - The invoice ID to monitor (e.g., "inv_abc123")
 * @param timeoutMs  - Maximum time to wait in milliseconds (default: 10 minutes)
 * @param intervalMs - Time between polling attempts in milliseconds (default: 5 seconds)
 * @returns The verified invoice data if paid, or null if the timeout was reached
 */
async function waitForPayment(
  nodela: Nodela,
  invoiceId: string,
  timeoutMs = 600_000,   // 10 minutes
  intervalMs = 5_000      // 5 seconds
): Promise<VerifyInvoiceResponse['data'] | null> {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;

  console.log(`Waiting for payment on invoice ${invoiceId}...`);
  console.log(`Timeout: ${timeoutMs / 1000}s, Interval: ${intervalMs / 1000}s`);

  while (Date.now() < deadline) {
    attempts++;

    try {
      const result = await nodela.invoices.verify(invoiceId);

      if (result.success && result.data?.paid) {
        console.log(`Payment confirmed after ${attempts} attempts`);
        return result.data;
      }

      // Not paid yet — log the current status and wait
      console.log(`Attempt ${attempts}: status = ${result.data?.status ?? 'unknown'}`);
    } catch (error) {
      // Log the error but keep polling — transient errors should not stop the loop
      console.error(`Attempt ${attempts} failed:`, error);
    }

    // Wait before the next attempt
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.log(`Timeout reached after ${attempts} attempts`);
  return null;
}
```

**Using the polling function:**

```typescript
const nodela = new Nodela(process.env.NODELA_API_KEY!, { environment: 'sandbox' });

// Step 1: Create an invoice
const invoice = await nodela.invoices.create({
  amount: 50,
  currency: 'USD',
  customer: { email: 'customer@example.com' },
});

console.log('Checkout URL:', invoice.data!.checkout_url);
console.log('Send the customer to this URL to pay.');
console.log('');

// Step 2: Wait for the customer to pay
const paymentData = await waitForPayment(nodela, invoice.data!.invoice_id);

// Step 3: Handle the result
if (paymentData) {
  console.log('Payment received!');
  console.log('Amount:', paymentData.amount, paymentData.currency);
  console.log('Network:', paymentData.payment?.network);
  console.log('Tx hash:', paymentData.payment?.tx_hash);
} else {
  console.log('Payment was not completed within the timeout period.');
}
```

**When to use polling vs. webhooks:**

| Approach | Best for | Drawbacks |
| -------- | -------- | --------- |
| **Webhooks** | Production systems, real-time notifications | Requires a publicly accessible URL |
| **Polling** | Local development, simple scripts, CLI tools | Uses more API calls, slight delay |

---

## Error retry with backoff

This utility function wraps any async operation and automatically retries on transient failures. It handles two specific scenarios:

1. **Rate limiting (429):** Waits the exact number of seconds specified by the `retryAfter` property before retrying
2. **Server errors (5xx):** Waits with exponential backoff (1s, 2s, 4s, 8s, ...) before retrying

Non-retryable errors (validation errors, authentication errors, 4xx client errors) are thrown immediately without retrying.

```typescript
import { RateLimitError, APIError } from 'nodela-sdk';

/**
 * Wraps an async function with automatic retry logic for transient failures.
 *
 * @param fn          - The async function to execute and potentially retry
 * @param maxAttempts - Maximum number of attempts (default: 3)
 * @returns The result of the function if it succeeds
 * @throws The last error if all attempts fail
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;

      // Rate limit: wait the exact time the server tells us to
      if (error instanceof RateLimitError && error.retryAfter && !isLastAttempt) {
        console.log(`Rate limited. Waiting ${error.retryAfter}s before retry ${attempt + 1}/${maxAttempts}`);
        await new Promise((r) => setTimeout(r, error.retryAfter! * 1000));
        continue;
      }

      // Server error (5xx): retry with exponential backoff
      if (
        error instanceof APIError &&
        error.statusCode !== undefined &&
        error.statusCode >= 500 &&
        !isLastAttempt
      ) {
        const waitMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, ...
        console.log(`Server error (${error.statusCode}). Retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxAttempts})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Non-retryable error (validation, auth, 4xx) or last attempt — throw
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Retry logic failed unexpectedly');
}
```

**Using the retry wrapper:**

```typescript
const nodela = new Nodela(process.env.NODELA_API_KEY!);

// Wrap any SDK call with automatic retry logic
const invoice = await withRetry(
  () => nodela.invoices.create({ amount: 100, currency: 'EUR' }),
  3 // up to 3 attempts
);

console.log('Invoice created:', invoice.data?.invoice_id);

// Also works with verify and list
const verified = await withRetry(
  () => nodela.invoices.verify('inv_abc123')
);

const transactions = await withRetry(
  () => nodela.transactions.list({ page: 1, limit: 50 })
);
```

**How the backoff timing works:**

| Attempt | Wait before retry | Total elapsed |
| ------- | ----------------- | ------------- |
| 1 | — (first try) | 0s |
| 2 | 1 second | 1s |
| 3 | 2 seconds | 3s |
| 4 | 4 seconds | 7s |
| 5 | 8 seconds | 15s |

For rate limit errors, the wait time is determined by the `retryAfter` property instead of exponential backoff — the server tells you exactly how long to wait.

---

## Multi-currency storefront

If your application serves customers in multiple countries, you can let them pay in their local currency. This example validates the currency on the server side before passing it to the SDK.

**What this covers:**
- Accepting a currency from user input
- Validating it against the SDK's supported list
- Type-safe currency handling
- Returning clear error messages for unsupported currencies

```typescript
import { Nodela, SUPPORTED_CURRENCIES, SupportedCurrency } from 'nodela-sdk';

const nodela = new Nodela(process.env.NODELA_API_KEY!);

app.post('/api/checkout', async (req, res) => {
  const { amount, currency, email } = req.body;

  // Validate the currency before calling the SDK.
  // This gives you control over the error message and avoids
  // an exception from the SDK.
  const upperCurrency = String(currency).toUpperCase();

  if (!SUPPORTED_CURRENCIES.includes(upperCurrency as SupportedCurrency)) {
    return res.status(400).json({
      error: `We don't support ${currency} yet. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`,
    });
  }

  try {
    const invoice = await nodela.invoices.create({
      amount: Number(amount),
      currency: upperCurrency as SupportedCurrency,
      customer: { email },
    });

    if (invoice.success && invoice.data) {
      res.json({
        checkoutUrl: invoice.data.checkout_url,
        originalAmount: invoice.data.original_amount,
        originalCurrency: invoice.data.original_currency,
        cryptoAmount: invoice.data.amount,
        cryptoCurrency: invoice.data.currency,
        exchangeRate: invoice.data.exchange_rate,
      });
    } else {
      res.status(400).json({ error: invoice.error?.message });
    }
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Payment service error' });
  }
});
```

---

## Transaction export to CSV

This example fetches all transactions and exports them as a CSV file. Useful for accounting, auditing, or importing into spreadsheet software.

```typescript
import { Nodela, Transaction } from 'nodela-sdk';
import { writeFileSync } from 'fs';

async function exportTransactionsToCSV(nodela: Nodela, outputPath: string) {
  // Step 1: Fetch all transactions across all pages
  const allTransactions: Transaction[] = [];
  let page = 1;
  let hasMore = true;

  console.log('Fetching transactions...');

  while (hasMore) {
    const response = await nodela.transactions.list({ page, limit: 50 });
    allTransactions.push(...response.data.transactions);
    hasMore = response.data.pagination.has_more;
    console.log(`  Page ${page}: ${response.data.transactions.length} transactions`);
    page++;
  }

  console.log(`Total: ${allTransactions.length} transactions`);

  // Step 2: Build CSV content
  const headers = [
    'Transaction ID',
    'Invoice ID',
    'Reference',
    'Status',
    'Paid',
    'Original Amount',
    'Original Currency',
    'Crypto Amount',
    'Crypto Currency',
    'Exchange Rate',
    'Customer Name',
    'Customer Email',
    'Network',
    'Token',
    'Tx Hash',
    'Created At',
  ];

  const rows = allTransactions.map((tx) => [
    tx.id,
    tx.invoice_id,
    tx.reference,
    tx.status,
    tx.paid ? 'Yes' : 'No',
    tx.original_amount.toString(),
    tx.original_currency,
    tx.amount.toString(),
    tx.currency,
    tx.exchange_rate.toString(),
    tx.customer.name,
    tx.customer.email,
    tx.payment?.network ?? '',
    tx.payment?.token ?? '',
    tx.payment?.tx_hash?.join('; ') ?? '',
    tx.created_at,
  ]);

  // Escape CSV values (handle commas and quotes in data)
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Step 3: Write to file
  writeFileSync(outputPath, csv, 'utf-8');
  console.log(`Exported to ${outputPath}`);
}

// Usage
const nodela = new Nodela(process.env.NODELA_API_KEY!);
await exportTransactionsToCSV(nodela, './transactions.csv');
```

---

## Environment-based SDK initialization

A reusable pattern for initializing the SDK with proper configuration in different environments.

```typescript
import { Nodela, SDKConfigOptions } from 'nodela-sdk';

/**
 * Creates a configured Nodela instance based on environment variables.
 *
 * Required env vars:
 *   NODELA_API_KEY - Your Nodela API key
 *
 * Optional env vars:
 *   NODE_ENV          - 'production' or anything else (default: sandbox)
 *   NODELA_TIMEOUT    - Request timeout in ms (default: 5000)
 *   NODELA_MAX_RETRIES - Max retry attempts (default: 3)
 */
function createNodelClient(): Nodela {
  const apiKey = process.env.NODELA_API_KEY;

  if (!apiKey) {
    throw new Error(
      'NODELA_API_KEY environment variable is not set. ' +
      'Get your API key from the Nodela dashboard at https://nodela.co'
    );
  }

  const options: SDKConfigOptions = {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  };

  // Only set timeout if the env var is present and valid
  if (process.env.NODELA_TIMEOUT) {
    const timeout = parseInt(process.env.NODELA_TIMEOUT, 10);
    if (!isNaN(timeout) && timeout > 0) {
      options.timeout = timeout;
    }
  }

  // Only set maxRetries if the env var is present and valid
  if (process.env.NODELA_MAX_RETRIES) {
    const maxRetries = parseInt(process.env.NODELA_MAX_RETRIES, 10);
    if (!isNaN(maxRetries) && maxRetries >= 0) {
      options.maxRetries = maxRetries;
    }
  }

  return new Nodela(apiKey, options);
}

// Usage — call once at application startup
const nodela = createNodelClient();

// Now use `nodela` throughout your application
export default nodela;
```

This pattern is useful because:
- It validates that the API key environment variable is set and gives a clear error message if not
- It safely parses optional numeric environment variables with fallbacks
- It encapsulates all SDK initialization logic in one place
- You can import the initialized instance from anywhere in your app
