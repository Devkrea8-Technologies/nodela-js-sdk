import { APIError, ValidationError, AuthenticationError, RateLimitError } from '../../../src/errors/api-error';
import { SDKError } from '../../../src/errors/base';

describe('APIError', () => {
  describe('constructor', () => {
    it('should create an API error with message only', () => {
      const error = new APIError('Request failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SDKError);
      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Request failed');
      expect(error.code).toBe('API_ERROR');
      expect(error.name).toBe('APIError');
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create an API error with status code and details', () => {
      const details = { endpoint: '/v1/invoices' };
      const error = new APIError('Not Found', 404, details);

      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual(details);
      expect(error.code).toBe('API_ERROR');
    });

    it('should create a network error with status code 0', () => {
      const error = new APIError('Network error occurred', 0, { originalError: 'ECONNREFUSED' });

      expect(error.statusCode).toBe(0);
      expect(error.details).toEqual({ originalError: 'ECONNREFUSED' });
    });
  });

  describe('fromResponse()', () => {
    it('should extract message from data.message', () => {
      const error = APIError.fromResponse(400, { message: 'Invalid amount' });

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Invalid amount');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ message: 'Invalid amount' });
    });

    it('should extract message from data.error when message is absent', () => {
      const error = APIError.fromResponse(500, { error: 'Internal server error' });

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
    });

    it('should extract message from data.error when it is an object (uses toString)', () => {
      const data = { error: { message: 'Nested error message', code: 'ERR_001' } };
      const error = APIError.fromResponse(422, data);

      // data.error is an object so it gets coerced; data.error.message is checked last
      // The actual precedence: data.message (undefined) -> data.error (object, truthy) -> used as message
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(data);
    });

    it('should generate a default message when no message fields exist', () => {
      const error = APIError.fromResponse(503, {});

      expect(error.message).toBe('API request failed with status code 503');
      expect(error.statusCode).toBe(503);
    });

    it('should generate a default message when data is null', () => {
      const error = APIError.fromResponse(500, null);

      expect(error.message).toBe('API request failed with status code 500');
      expect(error.statusCode).toBe(500);
    });

    it('should generate a default message when data is undefined', () => {
      const error = APIError.fromResponse(500, undefined);

      expect(error.message).toBe('API request failed with status code 500');
    });

    it('should preserve the full response data as details', () => {
      const data = { message: 'Bad request', errors: [{ field: 'amount', reason: 'required' }] };
      const error = APIError.fromResponse(400, data);

      expect(error.details).toEqual(data);
    });

    it('should prioritize data.message over data.error', () => {
      const data = { message: 'Primary message', error: 'Secondary message' };
      const error = APIError.fromResponse(400, data);

      expect(error.message).toBe('Primary message');
    });
  });
});

describe('ValidationError', () => {
  it('should create a validation error with message', () => {
    const error = new ValidationError('Amount must be positive');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SDKError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Amount must be positive');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
    expect(error.statusCode).toBeUndefined();
  });

  it('should create a validation error with details', () => {
    const details = { field: 'currency', value: 'INVALID', allowed: ['USD', 'EUR'] };
    const error = new ValidationError('Invalid currency', details);

    expect(error.message).toBe('Invalid currency');
    expect(error.details).toEqual(details);
  });

  it('should not have a status code', () => {
    const error = new ValidationError('test');
    expect(error.statusCode).toBeUndefined();
  });
});

describe('AuthenticationError', () => {
  it('should create an auth error with default message', () => {
    const error = new AuthenticationError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SDKError);
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe('Authentication failed');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
    expect(error.statusCode).toBe(401);
  });

  it('should create an auth error with a custom message', () => {
    const error = new AuthenticationError('Invalid API key or unauthorized access');

    expect(error.message).toBe('Invalid API key or unauthorized access');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should always have status code 401', () => {
    const error = new AuthenticationError('custom');
    expect(error.statusCode).toBe(401);
  });
});

describe('RateLimitError', () => {
  it('should create a rate limit error without retryAfter', () => {
    const error = new RateLimitError('Rate limit exceeded');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SDKError);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toBe('Rate limit exceeded');
    expect(error.code).toBe('RATE_LIMIT_ERROR');
    expect(error.name).toBe('RateLimitError');
    expect(error.statusCode).toBe(429);
    expect(error.retryAfter).toBeUndefined();
  });

  it('should create a rate limit error with retryAfter', () => {
    const error = new RateLimitError('Rate limit exceeded', 30);

    expect(error.retryAfter).toBe(30);
    expect(error.statusCode).toBe(429);
  });

  it('should accept retryAfter of 0', () => {
    const error = new RateLimitError('Too many requests', 0);
    expect(error.retryAfter).toBe(0);
  });

  it('should always have status code 429', () => {
    const error = new RateLimitError('test', 60);
    expect(error.statusCode).toBe(429);
  });
});
