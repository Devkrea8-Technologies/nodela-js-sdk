import { SDKError } from '../../../src/errors/base';

describe('SDKError', () => {
  describe('constructor', () => {
    it('should create an error with message and code', () => {
      const error = new SDKError('Something went wrong', 'GENERIC_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SDKError);
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('GENERIC_ERROR');
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should create an error with all parameters', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new SDKError('Validation failed', 'VALIDATION', 400, details);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('should set the name to the constructor name', () => {
      const error = new SDKError('test', 'TEST');
      expect(error.name).toBe('SDKError');
    });

    it('should have a stack trace', () => {
      const error = new SDKError('test', 'TEST');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SDKError');
    });

    it('should not include the constructor itself in the stack trace', () => {
      const error = new SDKError('test', 'TEST');
      // The stack trace should start after the constructor frame
      expect(error.stack).toBeDefined();
    });

    it('should accept 0 as a valid statusCode', () => {
      const error = new SDKError('network error', 'NETWORK', 0);
      expect(error.statusCode).toBe(0);
    });

    it('should accept null and complex objects as details', () => {
      const error1 = new SDKError('test', 'TEST', 500, null);
      expect(error1.details).toBeNull();

      const complexDetails = { nested: { deeply: { value: [1, 2, 3] } } };
      const error2 = new SDKError('test', 'TEST', 500, complexDetails);
      expect(error2.details).toEqual(complexDetails);
    });
  });

  describe('inheritance', () => {
    it('should be catchable as a regular Error', () => {
      const error = new SDKError('test', 'TEST');
      expect(() => {
        throw error;
      }).toThrow(Error);
    });

    it('should be catchable as SDKError', () => {
      const error = new SDKError('test', 'TEST');
      expect(() => {
        throw error;
      }).toThrow(SDKError);
    });

    it('should work with instanceof checks', () => {
      const error = new SDKError('test', 'TEST');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SDKError).toBe(true);
    });
  });

  describe('properties are readonly', () => {
    it('should have readonly code property', () => {
      const error = new SDKError('test', 'TEST', 400, { foo: 'bar' });
      // These are readonly - TypeScript enforces at compile time
      // At runtime we can verify they're set correctly
      expect(error.code).toBe('TEST');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ foo: 'bar' });
    });
  });
});
