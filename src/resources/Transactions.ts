import { BaseResource } from './base';
import { HTTPClient } from '../client';

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
}

export interface TransactionCustomer {
  email: string;
  name: string;
}

export interface TransactionPayment {
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
}

export interface Transaction {
  id: string;
  invoice_id: string;
  reference: string;
  original_amount: number;
  original_currency: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  title: string;
  description: string;
  status: string;
  paid: boolean;
  customer: TransactionCustomer;
  created_at: string;
  payment: TransactionPayment;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface ListTransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: Pagination;
  };
}

export class Transactions extends BaseResource {
  constructor(client: HTTPClient) {
    super(client, '/v1/transactions');
  }

  async list(params?: ListTransactionsParams): Promise<ListTransactionsResponse> {
    return this.client.get(this.basePath + this.buildQueryString(params));
  }
}
