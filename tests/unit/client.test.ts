import axios, { AxiosError, AxiosHeaders } from 'axios';
import { HTTPClient } from '../../src/client';
import { Config } from '../../src/config';
import { APIError, AuthenticationError, RateLimitError } from '../../src/errors';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HTTPClient', () => {
  const validKey = 'nk_test_abc123';
  let config: Config;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    config = new Config(validKey, { timeout: 5000 });

    // Set up interceptors storage
    const requestInterceptors: any[] = [];
    const responseInterceptors: any[] = [];

    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn((onFulfilled, onRejected) => {
            requestInterceptors.push({ onFulfilled, onRejected });
          }),
        },
        response: {
          use: jest.fn((onFulfilled, onRejected) => {
            responseInterceptors.push({ onFulfilled, onRejected });
          }),
        },
      },
      _requestInterceptors: requestInterceptors,
      _responseInterceptors: responseInterceptors,
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('constructor', () => {
    it('should create an axios instance with correct config', () => {
      new HTTPClient(config);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.nodela.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validKey}`,
          'User-Agent': `nodela-sdk/${process.version}`,
        },
      });
    });

    it('should set up request and response interceptors', () => {
      new HTTPClient(config);

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('HTTP methods', () => {
    let client: HTTPClient;

    beforeEach(() => {
      client = new HTTPClient(config);
      mockAxiosInstance.request.mockResolvedValue({ data: { success: true } });
    });

    it('get() should make a GET request', async () => {
      const result = await client.get('/v1/test');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/v1/test',
      });
      expect(result).toEqual({ success: true });
    });

    it('get() should pass additional config', async () => {
      await client.get('/v1/test', { params: { page: 1 } });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        params: { page: 1 },
        method: 'GET',
        url: '/v1/test',
      });
    });

    it('post() should make a POST request with data', async () => {
      const postData = { amount: 100, currency: 'USD' };
      await client.post('/v1/invoices', postData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/v1/invoices',
        data: postData,
      });
    });

    it('post() should work without data', async () => {
      await client.post('/v1/invoices');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/v1/invoices',
        data: undefined,
      });
    });

    it('post() should merge additional config', async () => {
      const postData = { amount: 50 };
      await client.post('/v1/invoices', postData, {
        headers: { 'X-Custom': 'value' },
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        headers: { 'X-Custom': 'value' },
        method: 'POST',
        url: '/v1/invoices',
        data: postData,
      });
    });

    it('put() should make a PUT request with data', async () => {
      const putData = { status: 'active' };
      await client.put('/v1/invoices/123', putData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/v1/invoices/123',
        data: putData,
      });
    });

    it('put() should work without data', async () => {
      await client.put('/v1/invoices/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/v1/invoices/123',
        data: undefined,
      });
    });

    it('patch() should make a PATCH request with data', async () => {
      const patchData = { description: 'updated' };
      await client.patch('/v1/invoices/123', patchData);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/v1/invoices/123',
        data: patchData,
      });
    });

    it('patch() should work without data', async () => {
      await client.patch('/v1/invoices/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'PATCH',
        url: '/v1/invoices/123',
        data: undefined,
      });
    });

    it('delete() should make a DELETE request', async () => {
      await client.delete('/v1/invoices/123');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/v1/invoices/123',
      });
    });

    it('delete() should pass additional config', async () => {
      await client.delete('/v1/invoices/123', {
        headers: { 'X-Confirm': 'true' },
      });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        headers: { 'X-Confirm': 'true' },
        method: 'DELETE',
        url: '/v1/invoices/123',
      });
    });

    it('request() should return response data directly', async () => {
      const responseData = { id: '123', status: 'paid' };
      mockAxiosInstance.request.mockResolvedValue({ data: responseData });

      const result = await client.get('/v1/test');
      expect(result).toEqual(responseData);
    });
  });

  describe('error handling via interceptors', () => {
    let client: HTTPClient;
    let responseErrorHandler: (error: AxiosError) => Promise<never>;

    beforeEach(() => {
      client = new HTTPClient(config);
      // Get the response error handler from the interceptor
      responseErrorHandler =
        mockAxiosInstance._responseInterceptors[0].onRejected;
    });

    it('should throw APIError for network errors (no response)', async () => {
      const axiosError = {
        response: undefined,
        message: 'Network Error',
        isAxiosError: true,
      } as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(APIError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Network error occurred',
        statusCode: 0,
        details: { originalError: 'Network Error' },
      });
    });

    it('should throw AuthenticationError for 401 responses', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Invalid API key' },
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(AuthenticationError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Invalid API key',
        statusCode: 401,
      });
    });

    it('should use default message for 401 without data message', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: {},
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Invalid API key or unauthorized access',
      });
    });

    it('should throw RateLimitError for 429 responses', async () => {
      const axiosError = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
          headers: { 'retry-after': '30' },
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(RateLimitError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: 30,
      });
    });

    it('should handle 429 without retry-after header', async () => {
      const axiosError = {
        response: {
          status: 429,
          data: {},
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      const promise = responseErrorHandler(axiosError);
      await expect(promise).rejects.toThrow(RateLimitError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        retryAfter: undefined,
      });
    });

    it('should throw APIError for other status codes (e.g. 400)', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(APIError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Bad request',
        statusCode: 400,
      });
    });

    it('should throw APIError for 500 server errors', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' },
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(APIError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('should throw APIError for 404 not found', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { message: 'Resource not found' },
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(APIError);
      await expect(responseErrorHandler(axiosError)).rejects.toMatchObject({
        message: 'Resource not found',
        statusCode: 404,
      });
    });

    it('should handle empty response data for non-standard errors', async () => {
      const axiosError = {
        response: {
          status: 503,
          data: null,
          headers: {},
        },
        isAxiosError: true,
      } as unknown as AxiosError;

      await expect(responseErrorHandler(axiosError)).rejects.toThrow(APIError);
    });
  });

  describe('request interceptor', () => {
    it('should pass through the request config', () => {
      new HTTPClient(config);
      const requestInterceptor =
        mockAxiosInstance._requestInterceptors[0].onFulfilled;

      const mockConfig = { url: '/test', method: 'GET' };
      const result = requestInterceptor(mockConfig);
      expect(result).toBe(mockConfig);
    });

    it('should reject on request error', async () => {
      new HTTPClient(config);
      const requestErrorHandler =
        mockAxiosInstance._requestInterceptors[0].onRejected;

      const error = new Error('Request setup failed');
      await expect(requestErrorHandler(error)).rejects.toThrow('Request setup failed');
    });
  });

  describe('response interceptor success handler', () => {
    it('should pass through successful responses', () => {
      new HTTPClient(config);
      const responseSuccessHandler =
        mockAxiosInstance._responseInterceptors[0].onFulfilled;

      const mockResponse = { data: { success: true }, status: 200 };
      const result = responseSuccessHandler(mockResponse);
      expect(result).toBe(mockResponse);
    });
  });
});
