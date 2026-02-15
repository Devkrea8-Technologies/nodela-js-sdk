import { Nodela } from '../../src/index';
import { Transactions } from '../../src/resources/Transactions';
import { Invoices } from '../../src/resources/Invoices';

// Mock the HTTPClient so we don't make real HTTP requests
jest.mock('../../src/client');

describe('Nodela', () => {
  const validTestKey = 'nk_test_abc123';
  const validLiveKey = 'nk_live_abc123';

  describe('constructor', () => {
    it('should create an instance with a valid test API key', () => {
      const nodela = new Nodela(validTestKey);
      expect(nodela).toBeInstanceOf(Nodela);
    });

    it('should create an instance with a valid live API key', () => {
      const nodela = new Nodela(validLiveKey);
      expect(nodela).toBeInstanceOf(Nodela);
    });

    it('should throw an error for an invalid API key', () => {
      expect(() => new Nodela('')).toThrow('Invalid API key');
    });

    it('should throw an error for a non-Nodela API key', () => {
      expect(() => new Nodela('sk_test_123')).toThrow('Invalid API key');
    });

    it('should accept optional configuration options', () => {
      const nodela = new Nodela(validTestKey, {
        timeout: 10000,
        maxRetries: 5,
        environment: 'sandbox',
      });
      expect(nodela).toBeInstanceOf(Nodela);
    });

    it('should work with partial options', () => {
      const nodela = new Nodela(validTestKey, { timeout: 8000 });
      expect(nodela).toBeInstanceOf(Nodela);
    });
  });

  describe('resource accessors', () => {
    let nodela: Nodela;

    beforeEach(() => {
      nodela = new Nodela(validTestKey);
    });

    it('should expose a transactions resource', () => {
      expect(nodela.transactions).toBeDefined();
      expect(nodela.transactions).toBeInstanceOf(Transactions);
    });

    it('should expose an invoices resource', () => {
      expect(nodela.invoices).toBeDefined();
      expect(nodela.invoices).toBeInstanceOf(Invoices);
    });

    it('should return the same transactions instance on multiple accesses', () => {
      const t1 = nodela.transactions;
      const t2 = nodela.transactions;
      expect(t1).toBe(t2);
    });

    it('should return the same invoices instance on multiple accesses', () => {
      const i1 = nodela.invoices;
      const i2 = nodela.invoices;
      expect(i1).toBe(i2);
    });
  });

  describe('getConfig()', () => {
    it('should return the full configuration', () => {
      const nodela = new Nodela(validTestKey);
      const config = nodela.getConfig();

      expect(config).toEqual({
        apiKey: validTestKey,
        baseURL: 'https://api.nodela.com',
        timeout: 5000,
        maxRetries: 3,
        environment: 'production',
      });
    });

    it('should reflect custom options in config', () => {
      const nodela = new Nodela(validTestKey, {
        timeout: 15000,
        maxRetries: 1,
        environment: 'sandbox',
      });
      const config = nodela.getConfig();

      expect(config.timeout).toBe(15000);
      expect(config.maxRetries).toBe(1);
      expect(config.environment).toBe('sandbox');
    });

    it('should return a new object each time (no reference leak)', () => {
      const nodela = new Nodela(validTestKey);
      const config1 = nodela.getConfig();
      const config2 = nodela.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    it('should not allow external mutation of config', () => {
      const nodela = new Nodela(validTestKey);
      const config = nodela.getConfig();
      (config as any).apiKey = 'nk_test_hacked';

      expect(nodela.getConfig().apiKey).toBe(validTestKey);
    });
  });
});
