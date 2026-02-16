---
title: Supported Currencies
description: Full list of 60+ supported fiat currencies
section: Reference
order: 6
---

# Supported Currencies

Nodela supports over 60 fiat currencies from every major region in the world. When you create an invoice, you specify the payment amount in one of these fiat currencies, and Nodela automatically converts it to a stablecoin equivalent (like USDT or USDC) using real-time exchange rates. This means your customers see familiar prices in their local currency while paying in cryptocurrency.

## How currency conversion works

Here is what happens when you create an invoice with a fiat currency:

1. You call `nodela.invoices.create({ amount: 100, currency: 'NGN' })` — requesting 100 Nigerian Naira
2. Nodela looks up the current exchange rate between NGN and the target stablecoin (e.g., USDT)
3. The invoice is created with both the original fiat amount (`original_amount: "100"`, `original_currency: "NGN"`) and the converted crypto amount (`amount: "0.06"`, `currency: "USDT"`)
4. The customer pays the stablecoin amount on the checkout page
5. The exchange rate used is recorded in the `exchange_rate` field of the response

This conversion is locked in at the time of invoice creation, so the customer pays exactly the amount shown — no surprises from rate fluctuations during checkout.

## Currency codes

All currency codes follow the **ISO 4217** standard — the internationally recognized 3-letter codes for currencies. For example, `USD` for United States Dollar, `EUR` for Euro, `NGN` for Nigerian Naira.

**Currency codes are case-insensitive in the SDK.** You can pass `'usd'`, `'Usd'`, or `'USD'` — the SDK automatically converts the code to uppercase before sending it to the API. This is handled internally in the `invoices.create()` method.

```typescript
// All three of these are equivalent:
await nodela.invoices.create({ amount: 50, currency: 'USD' });
await nodela.invoices.create({ amount: 50, currency: 'usd' });
await nodela.invoices.create({ amount: 50, currency: 'Usd' });
```

## Complete currency list

### Americas (10 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `USD` | United States Dollar | United States |
| `CAD` | Canadian Dollar | Canada |
| `MXN` | Mexican Peso | Mexico |
| `BRL` | Brazilian Real | Brazil |
| `ARS` | Argentine Peso | Argentina |
| `CLP` | Chilean Peso | Chile |
| `COP` | Colombian Peso | Colombia |
| `PEN` | Peruvian Sol | Peru |
| `JMD` | Jamaican Dollar | Jamaica |
| `TTD` | Trinidad and Tobago Dollar | Trinidad and Tobago |

### Europe (16 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `EUR` | Euro | Eurozone (20 countries) |
| `GBP` | British Pound Sterling | United Kingdom |
| `CHF` | Swiss Franc | Switzerland, Liechtenstein |
| `SEK` | Swedish Krona | Sweden |
| `NOK` | Norwegian Krone | Norway |
| `DKK` | Danish Krone | Denmark |
| `PLN` | Polish Zloty | Poland |
| `CZK` | Czech Koruna | Czech Republic |
| `HUF` | Hungarian Forint | Hungary |
| `RON` | Romanian Leu | Romania |
| `BGN` | Bulgarian Lev | Bulgaria |
| `HRK` | Croatian Kuna | Croatia |
| `ISK` | Icelandic Krona | Iceland |
| `TRY` | Turkish Lira | Turkey |
| `RUB` | Russian Ruble | Russia |
| `UAH` | Ukrainian Hryvnia | Ukraine |

### Africa (11 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `NGN` | Nigerian Naira | Nigeria |
| `ZAR` | South African Rand | South Africa |
| `KES` | Kenyan Shilling | Kenya |
| `GHS` | Ghanaian Cedi | Ghana |
| `EGP` | Egyptian Pound | Egypt |
| `MAD` | Moroccan Dirham | Morocco |
| `TZS` | Tanzanian Shilling | Tanzania |
| `UGX` | Ugandan Shilling | Uganda |
| `XOF` | West African CFA Franc | 8 West African countries |
| `XAF` | Central African CFA Franc | 6 Central African countries |
| `ETB` | Ethiopian Birr | Ethiopia |

### Asia (15 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `JPY` | Japanese Yen | Japan |
| `CNY` | Chinese Yuan | China |
| `INR` | Indian Rupee | India |
| `KRW` | South Korean Won | South Korea |
| `IDR` | Indonesian Rupiah | Indonesia |
| `MYR` | Malaysian Ringgit | Malaysia |
| `THB` | Thai Baht | Thailand |
| `PHP` | Philippine Peso | Philippines |
| `VND` | Vietnamese Dong | Vietnam |
| `SGD` | Singapore Dollar | Singapore |
| `HKD` | Hong Kong Dollar | Hong Kong |
| `TWD` | New Taiwan Dollar | Taiwan |
| `BDT` | Bangladeshi Taka | Bangladesh |
| `PKR` | Pakistani Rupee | Pakistan |
| `LKR` | Sri Lankan Rupee | Sri Lanka |

### Middle East (8 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `AED` | United Arab Emirates Dirham | UAE |
| `SAR` | Saudi Riyal | Saudi Arabia |
| `QAR` | Qatari Riyal | Qatar |
| `KWD` | Kuwaiti Dinar | Kuwait |
| `BHD` | Bahraini Dinar | Bahrain |
| `OMR` | Omani Rial | Oman |
| `ILS` | Israeli New Shekel | Israel |
| `JOD` | Jordanian Dinar | Jordan |

### Oceania (3 currencies)

| Code | Currency | Country/Region |
| ---- | -------- | -------------- |
| `AUD` | Australian Dollar | Australia |
| `NZD` | New Zealand Dollar | New Zealand |
| `FJD` | Fijian Dollar | Fiji |

## Using currencies in code

### Creating invoices in different currencies

```typescript
// US Dollar
await nodela.invoices.create({ amount: 99.99, currency: 'USD' });

// Nigerian Naira
await nodela.invoices.create({ amount: 50000, currency: 'NGN' });

// Euro
await nodela.invoices.create({ amount: 79.99, currency: 'EUR' });

// Japanese Yen (no decimal places — JPY is a zero-decimal currency)
await nodela.invoices.create({ amount: 5000, currency: 'JPY' });

// Kuwaiti Dinar
await nodela.invoices.create({ amount: 30, currency: 'KWD' });
```

### Checking if a currency is supported

The SDK exports the full list of supported currencies as a read-only constant array called `SUPPORTED_CURRENCIES` and a TypeScript type called `SupportedCurrency`:

```typescript
import { SUPPORTED_CURRENCIES, SupportedCurrency } from 'nodela-sdk';

// SUPPORTED_CURRENCIES is a readonly array of all 63 currency codes
console.log(SUPPORTED_CURRENCIES);
// ['USD', 'CAD', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN', 'JMD', 'TTD',
//  'EUR', 'GBP', 'CHF', ... ]

console.log(SUPPORTED_CURRENCIES.length); // 63

// Check if a specific currency is supported
const isSupported = SUPPORTED_CURRENCIES.includes('USD'); // true
const isNotSupported = SUPPORTED_CURRENCIES.includes('BTC'); // false (BTC is crypto, not fiat)
```

### Type-safe currency handling

The `SupportedCurrency` type is a union of all valid currency code strings. Use it to get compile-time validation in TypeScript:

```typescript
import type { SupportedCurrency } from 'nodela-sdk';

// This compiles — 'USD' is a valid SupportedCurrency
const currency: SupportedCurrency = 'USD';

// This would cause a TypeScript error — 'XYZ' is not in the union
// const currency: SupportedCurrency = 'XYZ';
// Error: Type '"XYZ"' is not assignable to type 'SupportedCurrency'
```

This is especially useful when building functions that accept currency parameters:

```typescript
import type { SupportedCurrency } from 'nodela-sdk';

async function createPayment(
  amount: number,
  currency: SupportedCurrency,
  email: string
) {
  return nodela.invoices.create({
    amount,
    currency,
    customer: { email },
  });
}

// TypeScript validates the currency at compile time
await createPayment(100, 'USD', 'customer@example.com'); // OK
await createPayment(100, 'EUR', 'customer@example.com'); // OK
// await createPayment(100, 'XYZ', 'customer@example.com'); // Compile error
```

### Validating user input at runtime

When you receive a currency code from user input (e.g., from a form or API request), you need to validate it at runtime since TypeScript types are erased at compile time:

```typescript
import { SUPPORTED_CURRENCIES, SupportedCurrency } from 'nodela-sdk';

function validateCurrency(input: string): SupportedCurrency {
  const upper = input.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(upper as SupportedCurrency)) {
    throw new Error(
      `Unsupported currency: "${input}". ` +
      `Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`
    );
  }
  return upper as SupportedCurrency;
}

// Usage in an Express route
app.post('/api/checkout', (req, res) => {
  try {
    const currency = validateCurrency(req.body.currency);
    // currency is now typed as SupportedCurrency
    // and guaranteed to be in the supported list
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

**Note:** You do not strictly need to validate currencies yourself before calling `invoices.create()`. The SDK performs its own validation internally and throws an `Error` if the currency is unsupported. However, validating early in your own code gives you more control over the error message and lets you return a user-friendly response before the SDK gets involved.

## What happens with unsupported currencies

If you pass a currency code that is not in the supported list to `invoices.create()`, the SDK throws an `Error` immediately — no HTTP request is made:

```typescript
try {
  await nodela.invoices.create({ amount: 100, currency: 'XYZ' as any });
} catch (error) {
  console.error(error.message);
  // 'Unsupported currency: "XYZ". Supported currencies: USD, CAD, MXN, BRL, ARS, ...'
}
```

The error message includes the full list of supported currencies so you can see exactly what is available.
