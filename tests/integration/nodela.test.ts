import axios, { AxiosHeaders } from 'axios';
import { Nodela } from '../../src/index';
import {
  APIError,
  AuthenticationError,
  RateLimitError,
  SDKError,
  ValidationError,
} from '../../src/errors';
import { SUPPORTED_CURRENCIES, SupportedCurrency } from '../../src/resources/Invoices';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * Integration tests that exercise the full SDK stack (Nodela -> HTTPClient -> mocked axios)
 * without making real network requests. These test the interaction between all components.
 */
describe('Nodela SDK Integration Tests', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((onFulfilled, onRejected) => {
            mockAxiosInstance._reqInterceptor = { onFulfilled, onRejected };
          }),
        },
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            mockAxiosInstance._resInterceptor = { onFulfilled, onRejected };
          }),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('SDK initialization and configuration flow', () => {
    it('should initialize with test API key and use correct base URL', () => {
      new Nodela('nk_test_mykey123');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.nodela.co',
          headers: expect.objectContaining({
            Authorization: 'Bearer nk_test_mykey123',
          }),
        })
      );
    });

    it('should initialize with live API key', () => {
      new Nodela('nk_live_prodkey456');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer nk_live_prodkey456',
          }),
        })
      );
    });

    it('should apply custom timeout to HTTP client', () => {
      new Nodela('nk_test_mykey123', { timeout: 30000 });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });

    it('should use default timeout when not specified', () => {
      new Nodela('nk_test_mykey123');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });

    it('should include User-Agent header with node version', () => {
      new Nodela('nk_test_mykey123');

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': `nodela-sdk/${process.version}`,
          }),
        })
      );
    });

    it('should reject invalid API keys before creating HTTP client', () => {
      expect(() => new Nodela('invalid_key')).toThrow('Invalid API key');
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });

    it('should reject empty API keys', () => {
      expect(() => new Nodela('')).toThrow('Invalid API key');
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });

    it('should validate options before creating HTTP client', () => {
      expect(() => new Nodela('nk_test_key', { timeout: -1 })).toThrow('Invalid timeout');
      expect(mockedAxios.create).not.toHaveBeenCalled();
    });
  });

  describe('Invoice creation flow', () => {
    let nodela: Nodela;

    beforeEach(() => {
      nodela = new Nodela('nk_test_key123');
    });

    it('should create an invoice and return the checkout URL', async () => {
      const apiResponse = {
        data: {
          success: true,
          data: {
            id: 'inv_abc123',
            invoice_id: 'INV-2025-001',
            original_amount: '100.00',
            original_currency: 'USD',
            amount: '100.00',
            currency: 'USDT',
            exchange_rate: '1.0',
            checkout_url: 'https://checkout.nodela.co/inv_abc123',
            status: 'pending',
            created_at: '2025-06-01T12:00:00Z',
          },
        },
      };
      mockAxiosInstance.request.mockResolvedValue(apiResponse);

      const result = await nodela.invoices.create({
        amount: 100,
        currency: 'USD',
      });

      expect(result.success).toBe(true);
      expect(result.data?.checkout_url).toBe('https://checkout.nodela.co/inv_abc123');
      expect(result.data?.invoice_id).toBe('INV-2025-001');
    });

    it('should create an invoice with customer details and webhook', async () => {
      const apiResponse = {
        data: {
          success: true,
          data: {
            id: 'inv_def456',
            invoice_id: 'INV-2025-002',
            original_amount: '250.50',
            original_currency: 'EUR',
            amount: '270.00',
            currency: 'USDT',
            exchange_rate: '1.078',
            webhook_url: 'https://myapp.com/webhooks/nodela',
            customer: {
              email: 'alice@example.com',
              name: 'Alice Smith',
            },
            checkout_url: 'https://checkout.nodela.co/inv_def456',
            created_at: '2025-06-01T12:30:00Z',
          },
        },
      };
      mockAxiosInstance.request.mockResolvedValue(apiResponse);

      const result = await nodela.invoices.create({
        amount: 250.5,
        currency: 'EUR',
        webhook_url: 'https://myapp.com/webhooks/nodela',
        customer: {
          name: 'Alice Smith',
          email: 'alice@example.com',
        },
        title: 'Premium Plan',
        description: 'Annual subscription',
      });

      expect(result.success).toBe(true);
      expect(result.data?.customer?.email).toBe('alice@example.com');

      // Verify the request was made with correct params
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/v1/invoices',
          data: expect.objectContaining({
            amount: 250.5,
            currency: 'EUR',
            webhook_url: 'https://myapp.com/webhooks/nodela',
          }),
        })
      );
    });

    it('should reject invoice creation with unsupported currency without calling API', async () => {
      await expect(
        nodela.invoices.create({
          amount: 100,
          currency: 'DOGE' as SupportedCurrency,
        })
      ).rejects.toThrow('Unsupported currency');

      expect(mockAxiosInstance.request).not.toHaveBeenCalled();
    });

    it('should uppercase currency before API call', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { success: true, data: { id: 'inv_x', invoice_id: 'INV-X', original_amount: '50', original_currency: 'NGN', amount: '50', currency: 'USDT', checkout_url: 'https://x', created_at: '2025-01-01' } },
      });

      await nodela.invoices.create({
        amount: 50,
        currency: 'ngn' as SupportedCurrency,
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currency: 'NGN',
          }),
        })
      );
    });
  });

  describe('Invoice verification flow', () => {
    let nodela: Nodela;

    beforeEach(() => {
      nodela = new Nodela('nk_test_key123');
    });

    it('should verify a paid invoice', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'inv_abc123',
            invoice_id: 'INV-001',
            original_amount: '100',
            original_currency: 'USD',
            amount: 100,
            currency: 'USDT',
            status: 'paid',
            paid: true,
            created_at: '2025-01-01T00:00:00Z',
            payment: {
              id: 'pay_789',
              network: 'ethereum',
              token: 'USDT',
              address: '0x1234',
              amount: 100,
              status: 'completed',
              tx_hash: ['0xabc'],
              transaction_type: 'payment',
              payer_email: 'user@test.com',
              created_at: '2025-01-01T00:05:00Z',
            },
          },
        },
      });

      const result = await nodela.invoices.verify('inv_abc123');

      expect(result.success).toBe(true);
      expect(result.data?.paid).toBe(true);
      expect(result.data?.status).toBe('paid');
      expect(result.data?.payment?.tx_hash).toContain('0xabc');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/v1/invoices/inv_abc123/verify',
        })
      );
    });

    it('should handle pending invoice verification', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'inv_pending',
            invoice_id: 'INV-PENDING',
            original_amount: '50',
            original_currency: 'GBP',
            amount: 50,
            currency: 'USDT',
            status: 'pending',
            paid: true,
            created_at: '2025-01-01T00:00:00Z',
          },
        },
      });

      const result = await nodela.invoices.verify('inv_pending');
      expect(result.data?.status).toBe('pending');
    });
  });

  describe('Transaction listing flow', () => {
    let nodela: Nodela;

    beforeEach(() => {
      nodela = new Nodela('nk_test_key123');
    });

    it('should list transactions with pagination', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          data: {
            transactions: [
              {
                id: 'txn_001',
                invoice_id: 'inv_001',
                reference: 'REF-001',
                original_amount: 100,
                original_currency: 'USD',
                amount: 100,
                currency: 'USDT',
                exchange_rate: 1,
                title: 'Payment',
                description: 'Test',
                status: 'completed',
                paid: true,
                customer: { email: 'a@b.com', name: 'A' },
                created_at: '2025-01-01',
                payment: {
                  id: 'pay_001',
                  network: 'polygon',
                  token: 'USDT',
                  address: '0x111',
                  amount: 100,
                  status: 'completed',
                  tx_hash: ['0xhash1'],
                  transaction_type: 'payment',
                  payer_email: 'a@b.com',
                  created_at: '2025-01-01',
                },
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 50,
              total_pages: 5,
              has_more: true,
            },
          },
        },
      });

      const result = await nodela.transactions.list({ page: 1, limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data.transactions).toHaveLength(1);
      expect(result.data.pagination.total).toBe(50);
      expect(result.data.pagination.has_more).toBe(true);
    });

    it('should list transactions without params', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          data: {
            transactions: [],
            pagination: { page: 1, limit: 10, total: 0, total_pages: 0, has_more: false },
          },
        },
      });

      const result = await nodela.transactions.list();

      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/v1/transactions',
        })
      );
      expect(result.data.transactions).toHaveLength(0);
    });

    it('should append query params for pagination', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          success: true,
          data: {
            transactions: [],
            pagination: { page: 3, limit: 25, total: 100, total_pages: 4, has_more: true },
          },
        },
      });

      await nodela.transactions.list({ page: 3, limit: 25 });

      const callUrl = mockAxiosInstance.request.mock.calls[0][0].url;
      expect(callUrl).toContain('page=3');
      expect(callUrl).toContain('limit=25');
    });
  });

  describe('Error handling flow', () => {
    let nodela: Nodela;
    let responseErrorHandler: (error: any) => Promise<never>;

    beforeEach(() => {
      nodela = new Nodela('nk_test_key123');
      responseErrorHandler = mockAxiosInstance._resInterceptor.onRejected;
    });

    it('should throw AuthenticationError on 401 and propagate through resource methods', async () => {
      // Simulate the interceptor transforming the error
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'API key expired' },
          headers: {},
        },
        isAxiosError: true,
      };

      mockAxiosInstance.request.mockImplementation(async () => {
        return responseErrorHandler(axiosError);
      });

      await expect(nodela.invoices.verify('inv_123')).rejects.toThrow(AuthenticationError);
      await expect(nodela.invoices.verify('inv_123')).rejects.toMatchObject({
        message: 'API key expired',
        statusCode: 401,
        code: 'AUTHENTICATION_ERROR',
      });
    });

    it('should throw RateLimitError on 429 with retry-after', async () => {
      const axiosError = {
        response: {
          status: 429,
          data: {},
          headers: { 'retry-after': '60' },
        },
        isAxiosError: true,
      };

      mockAxiosInstance.request.mockImplementation(async () => {
        return responseErrorHandler(axiosError);
      });

      await expect(nodela.transactions.list()).rejects.toThrow(RateLimitError);
      await expect(nodela.transactions.list()).rejects.toMatchObject({
        retryAfter: 60,
        statusCode: 429,
      });
    });

    it('should throw APIError for network errors', async () => {
      const axiosError = {
        response: undefined,
        message: 'ECONNREFUSED',
        isAxiosError: true,
      };

      mockAxiosInstance.request.mockImplementation(async () => {
        return responseErrorHandler(axiosError);
      });

      await expect(nodela.invoices.create({ amount: 100, currency: 'USD' })).rejects.toThrow(
        APIError
      );
      await expect(
        nodela.invoices.create({ amount: 100, currency: 'USD' })
      ).rejects.toMatchObject({
        message: 'Network error occurred',
        statusCode: 0,
      });
    });

    it('should throw APIError for 500 server errors', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
          headers: {},
        },
        isAxiosError: true,
      };

      mockAxiosInstance.request.mockImplementation(async () => {
        return responseErrorHandler(axiosError);
      });

      await expect(nodela.invoices.verify('inv_x')).rejects.toThrow(APIError);
      await expect(nodela.invoices.verify('inv_x')).rejects.toMatchObject({
        message: 'Internal server error',
        statusCode: 500,
      });
    });

    it('should throw APIError for 404 not found', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Invoice not found' },
          headers: {},
        },
        isAxiosError: true,
      };

      mockAxiosInstance.request.mockImplementation(async () => {
        return responseErrorHandler(axiosError);
      });

      await expect(nodela.invoices.verify('inv_nonexistent')).rejects.toThrow(APIError);
    });

    it('should properly extend Error hierarchy for all error types', () => {
      const apiErr = new APIError('test', 400);
      const authErr = new AuthenticationError('test');
      const rateErr = new RateLimitError('test', 30);
      const valErr = new ValidationError('test');

      // All should be instances of Error and SDKError
      [apiErr, authErr, rateErr, valErr].forEach((err) => {
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(SDKError);
        expect(err.stack).toBeDefined();
      });
    });
  });

  describe('Exports', () => {
    it('should export Nodela as default and named export', () => {
      // The default export is tested by import
      expect(Nodela).toBeDefined();
      expect(typeof Nodela).toBe('function');
    });

    it('should re-export error classes', () => {
      expect(SDKError).toBeDefined();
      expect(APIError).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(AuthenticationError).toBeDefined();
      expect(RateLimitError).toBeDefined();
    });

    it('should re-export SUPPORTED_CURRENCIES', () => {
      expect(SUPPORTED_CURRENCIES).toBeDefined();
      expect(Array.isArray(SUPPORTED_CURRENCIES)).toBe(true);
      expect(SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple resource operations in sequence', () => {
    it('should handle sequential invoice create then verify', async () => {
      const nodela = new Nodela('nk_test_key123');

      // First call: create invoice
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'inv_seq1',
            invoice_id: 'INV-SEQ-001',
            original_amount: '75',
            original_currency: 'CAD',
            amount: '55',
            currency: 'USDT',
            checkout_url: 'https://checkout.nodela.co/inv_seq1',
            created_at: '2025-01-01T00:00:00Z',
          },
        },
      });

      const createResult = await nodela.invoices.create({ amount: 75, currency: 'CAD' });
      expect(createResult.success).toBe(true);
      const invoiceId = createResult.data!.id;

      // Second call: verify invoice
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: invoiceId,
            invoice_id: 'INV-SEQ-001',
            original_amount: '75',
            original_currency: 'CAD',
            amount: 55,
            currency: 'USDT',
            status: 'paid',
            paid: true,
            created_at: '2025-01-01T00:00:00Z',
            payment: {
              id: 'pay_seq1',
              network: 'polygon',
              token: 'USDT',
              address: '0xseq',
              amount: 55,
              status: 'completed',
              tx_hash: ['0xseqhash'],
              transaction_type: 'payment',
              payer_email: 'seq@test.com',
              created_at: '2025-01-01T00:05:00Z',
            },
          },
        },
      });

      const verifyResult = await nodela.invoices.verify(invoiceId);
      expect(verifyResult.data?.paid).toBe(true);
      expect(verifyResult.data?.id).toBe(invoiceId);

      // Verify both calls were made
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should handle invoice creation followed by transaction listing', async () => {
      const nodela = new Nodela('nk_test_key123');

      mockAxiosInstance.request
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              id: 'inv_mixed',
              invoice_id: 'INV-MIXED',
              original_amount: '200',
              original_currency: 'GBP',
              amount: '250',
              currency: 'USDT',
              checkout_url: 'https://checkout.nodela.co/inv_mixed',
              created_at: '2025-01-01',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              transactions: [],
              pagination: { page: 1, limit: 10, total: 0, total_pages: 0, has_more: false },
            },
          },
        });

      await nodela.invoices.create({ amount: 200, currency: 'GBP' });
      await nodela.transactions.list();

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);

      // Verify first call was POST to invoices
      expect(mockAxiosInstance.request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: '/v1/invoices',
      });

      // Verify second call was GET to transactions
      expect(mockAxiosInstance.request.mock.calls[1][0]).toMatchObject({
        method: 'GET',
        url: '/v1/transactions',
      });
    });
  });

  describe('Config reflects in getConfig()', () => {
    it('should return production defaults', () => {
      const nodela = new Nodela('nk_test_key123');
      const config = nodela.getConfig();

      expect(config.environment).toBe('production');
      expect(config.timeout).toBe(5000);
      expect(config.maxRetries).toBe(3);
      expect(config.baseURL).toBe('https://api.nodela.co');
    });

    it('should reflect sandbox environment', () => {
      const nodela = new Nodela('nk_test_key123', { environment: 'sandbox' });
      expect(nodela.getConfig().environment).toBe('sandbox');
    });
  });
});
