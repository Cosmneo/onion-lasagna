import { describe, it, expect } from 'vitest';
import { isHttpResponse, assertHttpResponse } from '../http-response.util';

describe('isHttpResponse', () => {
  describe('valid HttpResponse objects', () => {
    it('should return true for object with numeric statusCode', () => {
      const response = { statusCode: 200 };

      expect(isHttpResponse(response)).toBe(true);
    });

    it('should return true for response with body', () => {
      const response = { statusCode: 200, body: { data: 'test' } };

      expect(isHttpResponse(response)).toBe(true);
    });

    it('should return true for response with headers', () => {
      const response = {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
      };

      expect(isHttpResponse(response)).toBe(true);
    });

    it('should return true for various status codes', () => {
      expect(isHttpResponse({ statusCode: 200 })).toBe(true);
      expect(isHttpResponse({ statusCode: 201 })).toBe(true);
      expect(isHttpResponse({ statusCode: 400 })).toBe(true);
      expect(isHttpResponse({ statusCode: 404 })).toBe(true);
      expect(isHttpResponse({ statusCode: 500 })).toBe(true);
    });

    it('should return true for zero statusCode', () => {
      // Edge case: 0 is still a valid number
      expect(isHttpResponse({ statusCode: 0 })).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should return false for null', () => {
      expect(isHttpResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isHttpResponse(undefined)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isHttpResponse('response')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isHttpResponse(200)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isHttpResponse([200])).toBe(false);
    });

    it('should return false for empty object', () => {
      expect(isHttpResponse({})).toBe(false);
    });

    it('should return false for object without statusCode', () => {
      expect(isHttpResponse({ body: 'test' })).toBe(false);
    });

    it('should return false for object with string statusCode', () => {
      expect(isHttpResponse({ statusCode: '200' })).toBe(false);
    });

    it('should return false for object with null statusCode', () => {
      expect(isHttpResponse({ statusCode: null })).toBe(false);
    });

    it('should return false for object with undefined statusCode', () => {
      expect(isHttpResponse({ statusCode: undefined })).toBe(false);
    });

    it('should return false for object with object statusCode', () => {
      expect(isHttpResponse({ statusCode: { value: 200 } })).toBe(false);
    });
  });
});

describe('assertHttpResponse', () => {
  describe('valid HttpResponse objects', () => {
    it('should not throw for valid response', () => {
      const response = { statusCode: 200 };

      expect(() => assertHttpResponse(response)).not.toThrow();
    });

    it('should not throw for response with additional properties', () => {
      const response = {
        statusCode: 201,
        body: { id: '123' },
        headers: { 'Content-Type': 'application/json' },
      };

      expect(() => assertHttpResponse(response)).not.toThrow();
    });
  });

  describe('invalid values', () => {
    it('should throw for null', () => {
      expect(() => assertHttpResponse(null)).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but got null',
      );
    });

    it('should throw for undefined', () => {
      expect(() => assertHttpResponse(undefined)).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but got undefined',
      );
    });

    it('should throw for string', () => {
      expect(() => assertHttpResponse('response')).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but got string',
      );
    });

    it('should throw for number', () => {
      expect(() => assertHttpResponse(200)).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but got number',
      );
    });

    it('should throw for empty object', () => {
      expect(() => assertHttpResponse({})).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but got object',
      );
    });

    it('should throw with statusCode type for object with wrong statusCode type', () => {
      expect(() => assertHttpResponse({ statusCode: '200' })).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but statusCode was string',
      );
    });

    it('should throw with null type for null statusCode', () => {
      expect(() => assertHttpResponse({ statusCode: null })).toThrow(
        'Expected value to be an HttpResponse with a numeric statusCode, but statusCode was object',
      );
    });
  });

  describe('custom context', () => {
    it('should include context in error message', () => {
      expect(() => assertHttpResponse(null, 'controller output')).toThrow(
        'Expected controller output to be an HttpResponse with a numeric statusCode, but got null',
      );
    });

    it('should include context for wrong statusCode type', () => {
      expect(() => assertHttpResponse({ statusCode: 'bad' }, 'response')).toThrow(
        'Expected response to be an HttpResponse with a numeric statusCode, but statusCode was string',
      );
    });
  });

  describe('type narrowing', () => {
    it('should narrow type after assertion', () => {
      const value: unknown = { statusCode: 200, body: { data: 'test' } };

      assertHttpResponse(value);

      // After assertion, TypeScript knows this is HttpResponse
      expect(value.statusCode).toBe(200);
    });
  });
});
