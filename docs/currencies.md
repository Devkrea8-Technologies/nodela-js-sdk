---
title: Supported Currencies
description: Full list of 60+ supported fiat currencies
section: Reference
order: 6
---

# Supported Currencies

Nodela supports 60+ fiat currencies. When you create an invoice, the fiat amount is automatically converted to a stablecoin equivalent at the current exchange rate.

Pass any of these currency codes as the `currency` parameter when creating an invoice:

```typescript
await nodela.invoices.create({
  amount: 100,
  currency: 'USD', // Any code from the tables below
});
```

## Americas

| Code | Currency |
|---|---|
| `USD` | United States Dollar |
| `CAD` | Canadian Dollar |
| `MXN` | Mexican Peso |
| `BRL` | Brazilian Real |
| `ARS` | Argentine Peso |
| `CLP` | Chilean Peso |
| `COP` | Colombian Peso |
| `PEN` | Peruvian Sol |
| `JMD` | Jamaican Dollar |
| `TTD` | Trinidad and Tobago Dollar |

## Europe

| Code | Currency |
|---|---|
| `EUR` | Euro |
| `GBP` | British Pound Sterling |
| `CHF` | Swiss Franc |
| `SEK` | Swedish Krona |
| `NOK` | Norwegian Krone |
| `DKK` | Danish Krone |
| `PLN` | Polish Zloty |
| `CZK` | Czech Koruna |
| `HUF` | Hungarian Forint |
| `RON` | Romanian Leu |
| `BGN` | Bulgarian Lev |
| `HRK` | Croatian Kuna |
| `ISK` | Icelandic Krona |
| `TRY` | Turkish Lira |
| `RUB` | Russian Ruble |
| `UAH` | Ukrainian Hryvnia |

## Africa

| Code | Currency |
|---|---|
| `NGN` | Nigerian Naira |
| `ZAR` | South African Rand |
| `KES` | Kenyan Shilling |
| `GHS` | Ghanaian Cedi |
| `EGP` | Egyptian Pound |
| `MAD` | Moroccan Dirham |
| `TZS` | Tanzanian Shilling |
| `UGX` | Ugandan Shilling |
| `XOF` | West African CFA Franc |
| `XAF` | Central African CFA Franc |
| `ETB` | Ethiopian Birr |

## Asia

| Code | Currency |
|---|---|
| `JPY` | Japanese Yen |
| `CNY` | Chinese Yuan |
| `INR` | Indian Rupee |
| `KRW` | South Korean Won |
| `IDR` | Indonesian Rupiah |
| `MYR` | Malaysian Ringgit |
| `THB` | Thai Baht |
| `PHP` | Philippine Peso |
| `VND` | Vietnamese Dong |
| `SGD` | Singapore Dollar |
| `HKD` | Hong Kong Dollar |
| `TWD` | New Taiwan Dollar |
| `BDT` | Bangladeshi Taka |
| `PKR` | Pakistani Rupee |
| `LKR` | Sri Lankan Rupee |

## Middle East

| Code | Currency |
|---|---|
| `AED` | United Arab Emirates Dirham |
| `SAR` | Saudi Riyal |
| `QAR` | Qatari Riyal |
| `KWD` | Kuwaiti Dinar |
| `BHD` | Bahraini Dinar |
| `OMR` | Omani Rial |
| `ILS` | Israeli New Shekel |
| `JOD` | Jordanian Dinar |

## Oceania

| Code | Currency |
|---|---|
| `AUD` | Australian Dollar |
| `NZD` | New Zealand Dollar |
| `FJD` | Fijian Dollar |

## Validating Currencies in Code

The SDK exports the full list of supported currencies as a constant and a type:

```typescript
import { SUPPORTED_CURRENCIES, SupportedCurrency } from 'nodela-sdk';

// Check if a currency is supported
const isSupported = SUPPORTED_CURRENCIES.includes('USD'); // true

// Type-safe currency parameter
const currency: SupportedCurrency = 'EUR';
```

If you pass an unsupported currency to `invoices.create()`, the SDK throws a `ValidationError` before making any network request.
