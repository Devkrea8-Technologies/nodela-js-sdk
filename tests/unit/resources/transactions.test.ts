import {
  Transactions,
  ListTransactionsParams,
  ListTransactionsResponse,
  Transaction,
} from '../../../src/resources/Transactions';
import { HTTPClient } from '../../../src/client';

describe('Transactions', () => {
  let mockClient: jest.Mocked<HTTPClient>;
  let transactions: Transactions;

  const mockTransaction: Transaction = {
    id: 'txn_001',
    invoice_id: 'inv_123',
    reference: 'ORDER-001',
    original_amount: 100,
    original_currency: 'USD',
    amount: 100,
    currency: 'USDT',
    exchange_rate: 1,
    title: 'Test Payment',
    description: 'A test payment',
    status: 'completed',
    paid: true,
    customer: {
      email: 'customer@example.com',
      name: 'Jane Doe',
    },
    created_at: '2025-01-01T00:00:00Z',
    payment: {
      id: 'pay_001',
      network: 'ethereum',
      token: 'USDT',
      address: '0xabcdef1234567890',
      amount: 100,
      status: 'completed',
      tx_hash: ['0xhash1'],
      transaction_type: 'payment',
      payer_email: 'customer@example.com',
      created_at: '2025-01-01T00:01:00Z',
    },
  };

  const mockListResponse: ListTransactionsResponse = {
    success: true,
    data: {
      transactions: [mockTransaction],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        total_pages: 1,
        has_more: false,
      },
    },
  };

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;

    transactions = new Transactions(mockClient);
  });

  describe('constructor', () => {
    it('should set the base path to /v1/transactions', () => {
      mockClient.get.mockResolvedValue(mockListResponse);
      transactions.list();
      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions');
    });
  });

  describe('list()', () => {
    it('should list transactions without params', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      const result = await transactions.list();

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions');
      expect(result).toEqual(mockListResponse);
    });

    it('should list transactions with page parameter', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list({ page: 2 });

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions?page=2');
    });

    it('should list transactions with limit parameter', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list({ limit: 25 });

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions?limit=25');
    });

    it('should list transactions with both page and limit', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list({ page: 3, limit: 50 });

      const callArg = mockClient.get.mock.calls[0][0];
      expect(callArg).toContain('/v1/transactions?');
      expect(callArg).toContain('page=3');
      expect(callArg).toContain('limit=50');
    });

    it('should handle undefined params the same as no params', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list(undefined);

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions');
    });

    it('should handle empty params object', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list({});

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions');
    });

    it('should filter out undefined param values', async () => {
      mockClient.get.mockResolvedValue(mockListResponse);

      await transactions.list({ page: 1, limit: undefined });

      expect(mockClient.get).toHaveBeenCalledWith('/v1/transactions?page=1');
    });

    it('should return paginated response', async () => {
      const paginatedResponse: ListTransactionsResponse = {
        success: true,
        data: {
          transactions: [mockTransaction, { ...mockTransaction, id: 'txn_002' }],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            total_pages: 3,
            has_more: true,
          },
        },
      };
      mockClient.get.mockResolvedValue(paginatedResponse);

      const result = await transactions.list({ page: 1, limit: 10 });

      expect(result.data.pagination.has_more).toBe(true);
      expect(result.data.pagination.total_pages).toBe(3);
      expect(result.data.transactions).toHaveLength(2);
    });

    it('should return empty transactions array when no results', async () => {
      const emptyResponse: ListTransactionsResponse = {
        success: true,
        data: {
          transactions: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            total_pages: 0,
            has_more: false,
          },
        },
      };
      mockClient.get.mockResolvedValue(emptyResponse);

      const result = await transactions.list();

      expect(result.data.transactions).toHaveLength(0);
      expect(result.data.pagination.total).toBe(0);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Server error'));

      await expect(transactions.list()).rejects.toThrow('Server error');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(transactions.list({ page: 1 })).rejects.toThrow('ECONNREFUSED');
    });
  });
});
