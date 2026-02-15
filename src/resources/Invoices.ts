import { BaseResource } from './base';
import { HTTPClient } from '../client';

export const SUPPORTED_CURRENCIES = [
  // Americas
  "USD", "CAD", "MXN", "BRL", "ARS", "CLP", "COP", "PEN", "JMD", "TTD",
  // Europe
  "EUR", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "ISK", "TRY", "RUB", "UAH",
  // Africa
  "NGN", "ZAR", "KES", "GHS", "EGP", "MAD", "TZS", "UGX", "XOF", "XAF", "ETB",
  // Asia
  "JPY", "CNY", "INR", "KRW", "IDR", "MYR", "THB", "PHP", "VND", "SGD", "HKD", "TWD", "BDT", "PKR", "LKR",
  // Middle East
  "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "ILS", "JOD",
  // Oceania
  "AUD", "NZD", "FJD",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CreateInvoiceParams {
  amount: number;
  currency: SupportedCurrency;
  success_url?: string
  cancel_url?: string;
  webhook_url?: string;
  reference?: string;
  customer?: {
    name?: string;
    email: string;
  }
  title?: string;
  description?: string;
}

export interface CreateInvoiceResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  data?: {
    id: string;
    invoice_id: string;
    original_amount: string;
    original_currency: string;
    amount: string;
    currency: string;
    exchange_rate?: string;
    webhook_url?: string;
    customer?: {
      email: string;
      name?: string;
    };
    checkout_url: string;
    status?: string;
    created_at: string
  }
}

export interface VerifyInvoiceResponse {
  success: boolean;
  data?: {
    id: string;
    invoice_id: string;
    reference?: string;
    original_amount: string;
    original_currency: string;
    amount: number;
    currency: string;
    exchange_rate?: number;
    title?: string;
    description?: string;
    status: string;
    paid: true;
    customer?: {
      email: string;
      name?: string;
    };
    created_at: string;
    payment?: {
      id: string;
      network: string;
      token: string;
      address: string;
      amount: number;
      status: string;
      tx_hash: string[];
      transaction_type: string;
      payer_email: string;
      created_at: string;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export class Invoices extends BaseResource {
  constructor(client: HTTPClient) {
    super(client, "/v1/invoices");
  }

  async create(params: CreateInvoiceParams): Promise<CreateInvoiceResponse> {
    const upper = params.currency.toUpperCase() as SupportedCurrency;
    if (!SUPPORTED_CURRENCIES.includes(upper)) {
      throw new Error(`Unsupported currency: "${params.currency}". Supported currencies: ${SUPPORTED_CURRENCIES.join(", ")}`);
    }
    return this.client.post(this.basePath, { ...params, currency: upper });
  }

  async verify(invoiceId: string): Promise<VerifyInvoiceResponse> {
    return this.client.get(this.buildPath(invoiceId, "verify"));
  }
}