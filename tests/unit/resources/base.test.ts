import { BaseResource } from '../../../src/resources/base';
import { HTTPClient } from '../../../src/client';

// Create a concrete implementation since BaseResource is abstract
class TestResource extends BaseResource {
  constructor(client: HTTPClient) {
    super(client, '/v1/test');
  }

  // Expose protected methods for testing
  public testBuildPath(...segments: (string | number)[]): string {
    return this.buildPath(...segments);
  }

  public testBuildQueryString(params?: Record<string, any>): string {
    return this.buildQueryString(params);
  }

  public getBasePath(): string {
    return this.basePath;
  }

  public getClient(): HTTPClient {
    return this.client;
  }
}

describe('BaseResource', () => {
  let mockClient: jest.Mocked<HTTPClient>;
  let resource: TestResource;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      request: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;

    resource = new TestResource(mockClient);
  });

  describe('constructor', () => {
    it('should store the client reference', () => {
      expect(resource.getClient()).toBe(mockClient);
    });

    it('should store the base path', () => {
      expect(resource.getBasePath()).toBe('/v1/test');
    });
  });

  describe('buildPath()', () => {
    it('should return the base path when no segments are provided', () => {
      expect(resource.testBuildPath()).toBe('/v1/test');
    });

    it('should append a single string segment', () => {
      expect(resource.testBuildPath('123')).toBe('/v1/test/123');
    });

    it('should append a single numeric segment', () => {
      expect(resource.testBuildPath(456)).toBe('/v1/test/456');
    });

    it('should append multiple segments', () => {
      expect(resource.testBuildPath('invoices', '123', 'verify')).toBe(
        '/v1/test/invoices/123/verify'
      );
    });

    it('should handle mixed string and number segments', () => {
      expect(resource.testBuildPath('items', 42, 'details')).toBe('/v1/test/items/42/details');
    });

    it('should handle empty string segments', () => {
      expect(resource.testBuildPath('')).toBe('/v1/test/');
    });

    it('should handle zero as a segment', () => {
      expect(resource.testBuildPath(0)).toBe('/v1/test/0');
    });
  });

  describe('buildQueryString()', () => {
    it('should return empty string when params is undefined', () => {
      expect(resource.testBuildQueryString()).toBe('');
    });

    it('should return empty string when params is empty object', () => {
      expect(resource.testBuildQueryString({})).toBe('');
    });

    it('should build query string with single parameter', () => {
      expect(resource.testBuildQueryString({ page: 1 })).toBe('?page=1');
    });

    it('should build query string with multiple parameters', () => {
      const result = resource.testBuildQueryString({ page: 1, limit: 10 });
      expect(result).toContain('?');
      expect(result).toContain('page=1');
      expect(result).toContain('limit=10');
      expect(result).toContain('&');
    });

    it('should filter out undefined values', () => {
      const result = resource.testBuildQueryString({ page: 1, limit: undefined });
      expect(result).toBe('?page=1');
    });

    it('should filter out null values', () => {
      const result = resource.testBuildQueryString({ page: 1, limit: null });
      expect(result).toBe('?page=1');
    });

    it('should return empty string when all values are undefined or null', () => {
      expect(resource.testBuildQueryString({ a: undefined, b: null })).toBe('');
    });

    it('should encode special characters in keys and values', () => {
      const result = resource.testBuildQueryString({ 'my key': 'my value' });
      expect(result).toBe('?my%20key=my%20value');
    });

    it('should handle string values', () => {
      const result = resource.testBuildQueryString({ status: 'paid' });
      expect(result).toBe('?status=paid');
    });

    it('should handle boolean values', () => {
      const result = resource.testBuildQueryString({ active: true });
      expect(result).toBe('?active=true');
    });

    it('should handle zero as a value', () => {
      const result = resource.testBuildQueryString({ offset: 0 });
      expect(result).toBe('?offset=0');
    });

    it('should handle empty string as a value', () => {
      const result = resource.testBuildQueryString({ name: '' });
      expect(result).toBe('?name=');
    });
  });
});
