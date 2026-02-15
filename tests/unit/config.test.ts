import { Config, SDKConfig, SDKConfigOptions } from '../../src/config';

describe('Config', () => {
  const validTestKey = 'nk_test_abc123';
  const validLiveKey = 'nk_live_abc123';

  describe('constructor', () => {
    it('should create a config with a valid test API key and default options', () => {
      const config = new Config(validTestKey);

      expect(config.get('apiKey')).toBe(validTestKey);
      expect(config.get('baseURL')).toBe('https://api.nodela.com');
      expect(config.get('timeout')).toBe(5000);
      expect(config.get('maxRetries')).toBe(3);
      expect(config.get('environment')).toBe('production');
    });

    it('should create a config with a valid live API key', () => {
      const config = new Config(validLiveKey);
      expect(config.get('apiKey')).toBe(validLiveKey);
    });

    it('should apply custom options when provided', () => {
      const options: SDKConfigOptions = {
        timeout: 10000,
        maxRetries: 5,
        environment: 'sandbox',
      };
      const config = new Config(validTestKey, options);

      expect(config.get('timeout')).toBe(10000);
      expect(config.get('maxRetries')).toBe(5);
      expect(config.get('environment')).toBe('sandbox');
    });

    it('should use defaults for options not provided', () => {
      const config = new Config(validTestKey, { timeout: 8000 });

      expect(config.get('timeout')).toBe(8000);
      expect(config.get('maxRetries')).toBe(3);
      expect(config.get('environment')).toBe('production');
    });

    it('should accept maxRetries of 0', () => {
      const config = new Config(validTestKey, { maxRetries: 0 });
      expect(config.get('maxRetries')).toBe(0);
    });
  });

  describe('API key validation', () => {
    it('should throw an error for an empty string API key', () => {
      expect(() => new Config('')).toThrow('Invalid API key provided');
    });

    it('should throw an error for a whitespace-only API key', () => {
      expect(() => new Config('   ')).toThrow('Invalid API key provided');
    });

    it('should throw an error for a null API key', () => {
      expect(() => new Config(null as unknown as string)).toThrow('Invalid API key provided');
    });

    it('should throw an error for an undefined API key', () => {
      expect(() => new Config(undefined as unknown as string)).toThrow('Invalid API key provided');
    });

    it('should throw an error for a non-string API key', () => {
      expect(() => new Config(12345 as unknown as string)).toThrow('Invalid API key provided');
    });

    it('should throw an error for an API key without the nk_ prefix', () => {
      expect(() => new Config('sk_test_abc123')).toThrow('Invalid API key provided');
    });

    it('should throw an error for an API key with nk_ but no environment prefix', () => {
      expect(() => new Config('nk_abc123')).toThrow('Invalid API key provided');
    });

    it('should accept an API key starting with nk_test_', () => {
      expect(() => new Config('nk_test_x')).not.toThrow();
    });

    it('should accept an API key starting with nk_live_', () => {
      expect(() => new Config('nk_live_x')).not.toThrow();
    });
  });

  describe('options validation', () => {
    it('should throw an error for a negative timeout', () => {
      expect(() => new Config(validTestKey, { timeout: -1 })).toThrow(
        'Invalid timeout value. Timeout must be a positive number.'
      );
    });

    it('should throw an error for a zero timeout', () => {
      expect(() => new Config(validTestKey, { timeout: 0 })).toThrow(
        'Invalid timeout value. Timeout must be a positive number.'
      );
    });

    it('should throw an error for a non-number timeout', () => {
      expect(() => new Config(validTestKey, { timeout: 'fast' as unknown as number })).toThrow(
        'Invalid timeout value. Timeout must be a positive number.'
      );
    });

    it('should throw an error for negative maxRetries', () => {
      expect(() => new Config(validTestKey, { maxRetries: -1 })).toThrow(
        'Invalid maxRetries value. maxRetries must be a non-negative number.'
      );
    });

    it('should throw an error for non-number maxRetries', () => {
      expect(
        () => new Config(validTestKey, { maxRetries: 'three' as unknown as number })
      ).toThrow('Invalid maxRetries value. maxRetries must be a non-negative number.');
    });

    it('should throw an error for an invalid environment', () => {
      expect(
        () =>
          new Config(validTestKey, {
            environment: 'staging' as unknown as 'production' | 'sandbox',
          })
      ).toThrow('Invalid environment value. Environment must be either "production" or "sandbox".');
    });

    it('should not throw when options object is empty', () => {
      expect(() => new Config(validTestKey, {})).not.toThrow();
    });

    it('should not throw when options have only valid values', () => {
      expect(
        () =>
          new Config(validTestKey, {
            timeout: 1,
            maxRetries: 0,
            environment: 'sandbox',
          })
      ).not.toThrow();
    });
  });

  describe('get()', () => {
    it('should return individual config values by key', () => {
      const config = new Config(validTestKey, { timeout: 7000, environment: 'sandbox' });

      expect(config.get('apiKey')).toBe(validTestKey);
      expect(config.get('baseURL')).toBe('https://api.nodela.com');
      expect(config.get('timeout')).toBe(7000);
      expect(config.get('maxRetries')).toBe(3);
      expect(config.get('environment')).toBe('sandbox');
    });
  });

  describe('getAll()', () => {
    it('should return a copy of the full configuration', () => {
      const config = new Config(validTestKey, { timeout: 9000 });
      const allConfig = config.getAll();

      expect(allConfig).toEqual({
        apiKey: validTestKey,
        baseURL: 'https://api.nodela.com',
        timeout: 9000,
        maxRetries: 3,
        environment: 'production',
      });
    });

    it('should return a new object each time (no reference leaking)', () => {
      const config = new Config(validTestKey);
      const all1 = config.getAll();
      const all2 = config.getAll();

      expect(all1).toEqual(all2);
      expect(all1).not.toBe(all2);
    });

    it('should not allow external mutation of internal config', () => {
      const config = new Config(validTestKey);
      const allConfig = config.getAll();
      (allConfig as any).apiKey = 'nk_test_hacked';

      expect(config.get('apiKey')).toBe(validTestKey);
    });
  });
});
