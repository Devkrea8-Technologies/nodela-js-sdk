---
title: Examples
description: Real-world integration patterns and recipes
section: Guides
order: 7
---

# Examples

Practical integration patterns for common use cases.

## Express Checkout Endpoint

A minimal Express.js endpoint that creates an invoice and returns the checkout URL:

```typescript
import express from 'express';
import { Nodela, ValidationError, AuthenticationError } from 'nodela-sdk';

const app = express();
app.use(express.json());

const nodela = new Nodela(process.env.NODELA_API_KEY!, {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

app.post('/api/checkout', async (req, res) => {
  try {
    const { amount, currency, email, orderId } = req.body;

    const invoice = await nodela.invoices.create({
      amount,
      currency,
      reference: orderId,
      customer: { email },
      success_url: `${process.env.APP_URL}/orders/${orderId}/success`,
      cancel_url: `${process.env.APP_URL}/orders/${orderId}`,
      webhook_url: `${process.env.APP_URL}/api/webhooks/nodela`,
    });

    if (invoice.success && invoice.data) {
      res.json({ checkoutUrl: invoice.data.checkout_url });
    } else {
      res.status(400).json({ error: invoice.error });
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(422).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

## Webhook Handler

Handle payment notifications from Nodela by verifying the invoice on receipt:

```typescript
app.post('/api/webhooks/nodela', async (req, res) => {
  const { invoice_id } = req.body;

  try {
    const result = await nodela.invoices.verify(invoice_id);

    if (result.success && result.data?.paid) {
      // Payment confirmed — fulfill the order
      await fulfillOrder(result.data.reference!, {
        amount: result.data.amount,
        currency: result.data.currency,
        network: result.data.payment?.network,
        txHash: result.data.payment?.tx_hash,
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.sendStatus(500);
  }
});
```

## Polling for Payment Status

If you don't use webhooks, you can poll the invoice status:

```typescript
async function waitForPayment(
  nodela: Nodela,
  invoiceId: string,
  timeoutMs = 600_000,
  intervalMs = 5_000
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await nodela.invoices.verify(invoiceId);

    if (result.success && result.data?.paid) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

// Usage
const invoice = await nodela.invoices.create({
  amount: 50,
  currency: 'USD',
});

const paid = await waitForPayment(nodela, invoice.data!.invoice_id);
console.log(paid ? 'Payment received!' : 'Payment timed out');
```

## Transaction Report

Generate a summary of all transactions:

```typescript
async function generateReport(nodela: Nodela) {
  const all = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await nodela.transactions.list({ page, limit: 50 });
    all.push(...response.data.transactions);
    hasMore = response.data.pagination.has_more;
    page++;
  }

  const paid = all.filter((tx) => tx.paid);
  const totalUSD = paid
    .filter((tx) => tx.original_currency === 'USD')
    .reduce((sum, tx) => sum + tx.original_amount, 0);

  console.log(`Total transactions: ${all.length}`);
  console.log(`Paid: ${paid.length}`);
  console.log(`Total USD volume: $${totalUSD.toFixed(2)}`);
}
```

## Error Retry with Backoff

A utility wrapper that retries on transient failures:

```typescript
import { Nodela, RateLimitError, APIError } from 'nodela-sdk';

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError && error.retryAfter) {
        await new Promise((r) => setTimeout(r, error.retryAfter! * 1000));
        continue;
      }

      if (error instanceof APIError && error.statusCode && error.statusCode >= 500 && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Max retry attempts reached');
}

// Usage
const invoice = await withRetry(() =>
  nodela.invoices.create({ amount: 100, currency: 'EUR' })
);
```

## Multi-Currency Storefront

Accept payments in the customer's local currency:

```typescript
import { Nodela, SupportedCurrency, SUPPORTED_CURRENCIES } from 'nodela-sdk';

const nodela = new Nodela(process.env.NODELA_API_KEY!);

app.post('/api/checkout', async (req, res) => {
  const { amount, currency, email } = req.body;

  // Validate currency before making the request
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return res.status(400).json({
      error: `Unsupported currency: ${currency}`,
    });
  }

  const invoice = await nodela.invoices.create({
    amount,
    currency: currency as SupportedCurrency,
    customer: { email },
  });

  res.json({ checkoutUrl: invoice.data?.checkout_url });
});
```
