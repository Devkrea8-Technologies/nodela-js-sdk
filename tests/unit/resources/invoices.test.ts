import {
  Invoices,
  CreateInvoiceParams,
  CreateInvoiceResponse,
  VerifyInvoiceResponse,
  SUPPORTED_CURRENCIES,
  SupportedCurrency,
} from '../../../src/resources/invoices';
import { HTTPClient } from '../../../src/client';

describe('Invoices', () => {
  let mockClient: jest.Mocked<HTTPClient>;
  let invoices: Invoices;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;

    invoices = new Invoices(mockClient);
  });

  describe('constructor', () => {
    it('should set the base path to /v1/invoices', () => {
      // Verify by calling create and checking the path used
      mockClient.post.mockResolvedValue({ success: true });
      invoices.create({ amount: 10, currency: 'USD' });
      expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices', expect.any(Object));
    });
  });

  describe('create()', () => {
    const validParams: CreateInvoiceParams = {
      amount: 100,
      currency: 'USD',
    };

    const mockResponse: CreateInvoiceResponse = {
      success: true,
      data: {
        id: 'inv_123',
        invoice_id: 'INV-001',
        original_amount: '100',
        original_currency: 'USD',
        amount: '100',
        currency: 'USDT',
        checkout_url: 'https://checkout.nodela.com/inv_123',
        created_at: '2025-01-01T00:00:00Z',
      },
    };

    it('should create an invoice with minimal required params', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await invoices.create(validParams);

      expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices', {
        amount: 100,
        currency: 'USD',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create an invoice with all optional params', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      const fullParams: CreateInvoiceParams = {
        amount: 250.5,
        currency: 'EUR',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        webhook_url: 'https://example.com/webhook',
        reference: 'ORDER-123',
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        title: 'Premium Plan',
        description: 'Monthly subscription payment',
      };

      await invoices.create(fullParams);

      expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices', {
        ...fullParams,
        currency: 'EUR',
      });
    });

    it('should uppercase the currency before sending', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      await invoices.create({ amount: 50, currency: 'usd' as SupportedCurrency });

      expect(mockClient.post).toHaveBeenCalledWith('/v1/invoices', {
        amount: 50,
        currency: 'USD',
      });
    });

    it('should throw an error for unsupported currency', async () => {
      await expect(
        invoices.create({ amount: 100, currency: 'XYZ' as SupportedCurrency })
      ).rejects.toThrow('Unsupported currency: "XYZ"');
    });

    it('should throw an error for unsupported lowercase currency', async () => {
      await expect(
        invoices.create({ amount: 100, currency: 'xyz' as SupportedCurrency })
      ).rejects.toThrow('Unsupported currency');
    });

    it('should include supported currencies in the error message', async () => {
      await expect(
        invoices.create({ amount: 100, currency: 'FAKE' as SupportedCurrency })
      ).rejects.toThrow('Supported currencies:');
    });

    it('should not call the API when currency is unsupported', async () => {
      try {
        await invoices.create({ amount: 100, currency: 'INVALID' as SupportedCurrency });
      } catch {
        // expected
      }

      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('should pass through customer with email only', async () => {
      mockClient.post.mockResolvedValue(mockResponse);

      await invoices.create({
        amount: 100,
        currency: 'USD',
        customer: { email: 'user@example.com' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        '/v1/invoices',
        expect.objectContaining({
          customer: { email: 'user@example.com' },
        })
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('API Error'));

      await expect(invoices.create(validParams)).rejects.toThrow('API Error');
    });

    it('should handle error responses from the API', async () => {
      const errorResponse: CreateInvoiceResponse = {
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Amount must be greater than 0',
        },
      };
      mockClient.post.mockResolvedValue(errorResponse);

      const result = await invoices.create(validParams);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verify()', () => {
    const mockVerifyResponse: VerifyInvoiceResponse = {
      success: true,
      data: {
        id: 'inv_123',
        invoice_id: 'INV-001',
        original_amount: '100',
        original_currency: 'USD',
        amount: 100,
        currency: 'USDT',
        status: 'paid',
        paid: true,
        created_at: '2025-01-01T00:00:00Z',
        payment: {
          id: 'pay_456',
          network: 'ethereum',
          token: 'USDT',
          address: '0x1234567890abcdef',
          amount: 100,
          status: 'completed',
          tx_hash: ['0xabc123'],
          transaction_type: 'payment',
          payer_email: 'user@example.com',
          created_at: '2025-01-01T00:01:00Z',
        },
      },
    };

    it('should verify an invoice by ID', async () => {
      mockClient.get.mockResolvedValue(mockVerifyResponse);

      const result = await invoices.verify('inv_123');

      expect(mockClient.get).toHaveBeenCalledWith('/v1/invoices/inv_123/verify');
      expect(result).toEqual(mockVerifyResponse);
    });

    it('should build the correct verify path', async () => {
      mockClient.get.mockResolvedValue(mockVerifyResponse);

      await invoices.verify('inv_abc-def');

      expect(mockClient.get).toHaveBeenCalledWith('/v1/invoices/inv_abc-def/verify');
    });

    it('should return error response for invalid invoice ID', async () => {
      const errorResponse: VerifyInvoiceResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Invoice not found',
        },
      };
      mockClient.get.mockResolvedValue(errorResponse);

      const result = await invoices.verify('invalid_id');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'));

      await expect(invoices.verify('inv_123')).rejects.toThrow('Network error');
    });

    it('should return unpaid invoice data', async () => {
      const unpaidResponse: VerifyInvoiceResponse = {
        success: true,
        data: {
          id: 'inv_789',
          invoice_id: 'INV-002',
          original_amount: '50',
          original_currency: 'EUR',
          amount: 50,
          currency: 'USDT',
          status: 'pending',
          paid: true,
          created_at: '2025-01-02T00:00:00Z',
        },
      };
      mockClient.get.mockResolvedValue(unpaidResponse);

      const result = await invoices.verify('inv_789');
      expect(result.data?.status).toBe('pending');
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('should include major currencies', () => {
      const majorCurrencies: SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
      majorCurrencies.forEach((currency) => {
        expect(SUPPORTED_CURRENCIES).toContain(currency);
      });
    });

    it('should include African currencies', () => {
      const africanCurrencies: SupportedCurrency[] = ['NGN', 'ZAR', 'KES', 'GHS', 'EGP'];
      africanCurrencies.forEach((currency) => {
        expect(SUPPORTED_CURRENCIES).toContain(currency);
      });
    });

    it('should include Middle Eastern currencies', () => {
      const meCurrencies: SupportedCurrency[] = ['AED', 'SAR', 'QAR', 'KWD'];
      meCurrencies.forEach((currency) => {
        expect(SUPPORTED_CURRENCIES).toContain(currency);
      });
    });

    it('should include Asian currencies', () => {
      const asianCurrencies: SupportedCurrency[] = ['JPY', 'CNY', 'INR', 'KRW', 'SGD'];
      asianCurrencies.forEach((currency) => {
        expect(SUPPORTED_CURRENCIES).toContain(currency);
      });
    });

    it('should not include unsupported currencies', () => {
      expect(SUPPORTED_CURRENCIES).not.toContain('BTC');
      expect(SUPPORTED_CURRENCIES).not.toContain('ETH');
      expect(SUPPORTED_CURRENCIES).not.toContain('USDT');
    });

    it('should have all currencies as 3-letter codes', () => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        expect(currency).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should have no duplicate currencies', () => {
      const uniqueCurrencies = new Set(SUPPORTED_CURRENCIES);
      expect(uniqueCurrencies.size).toBe(SUPPORTED_CURRENCIES.length);
    });
  });
});
