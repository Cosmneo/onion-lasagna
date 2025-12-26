import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import { OnionResponseInterceptor } from '../interceptors/onion-response.interceptor';
import type { ExecutionContext, CallHandler } from '@nestjs/common';

describe('OnionResponseInterceptor', () => {
  let interceptor: OnionResponseInterceptor;
  let mockResponse: {
    status: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new OnionResponseInterceptor();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;
  });

  describe('HttpResponse unwrapping', () => {
    it('should unwrap HttpResponse and return just the body', async () => {
      const httpResponse = {
        statusCode: 200,
        body: { id: 1, name: 'Test' },
      };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should set status code from HttpResponse', async () => {
      const httpResponse = {
        statusCode: 201,
        body: { created: true },
      };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should set custom headers from HttpResponse', async () => {
      const httpResponse = {
        statusCode: 200,
        body: { ok: true },
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Request-Id': '12345',
        },
      };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', '12345');
    });

    it('should skip null/undefined header values', async () => {
      const httpResponse = {
        statusCode: 200,
        body: { ok: true },
        headers: {
          'X-Valid': 'value',
          'X-Null': null,
          'X-Undefined': undefined,
        },
      };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Valid', 'value');
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(1);
    });

    it('should handle 204 with null body', async () => {
      const httpResponse = {
        statusCode: 204,
        body: null,
      };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toBeNull();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
  });

  describe('non-HttpResponse passthrough', () => {
    it('should pass through non-HttpResponse data unchanged', async () => {
      const plainData = { id: 1, name: 'Plain object' };

      const next: CallHandler = {
        handle: () => of(plainData),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      // Plain object without statusCode should pass through
      expect(result).toEqual(plainData);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass through string data unchanged', async () => {
      const stringData = 'Hello, World!';

      const next: CallHandler = {
        handle: () => of(stringData),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toBe('Hello, World!');
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass through null unchanged', async () => {
      const next: CallHandler = {
        handle: () => of(null),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toBeNull();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should pass through array data unchanged', async () => {
      const arrayData = [1, 2, 3];

      const next: CallHandler = {
        handle: () => of(arrayData),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toEqual([1, 2, 3]);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('HttpResponse detection', () => {
    it('should detect HttpResponse by statusCode (number) and body presence', async () => {
      // Has statusCode as number and body key - should be treated as HttpResponse
      const httpResponse = { statusCode: 200, body: { data: 'test' } };

      const next: CallHandler = {
        handle: () => of(httpResponse),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      expect(result).toEqual({ data: 'test' });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should NOT treat object with statusCode as string as HttpResponse', async () => {
      const notHttpResponse = { statusCode: '200', body: { data: 'test' } };

      const next: CallHandler = {
        handle: () => of(notHttpResponse),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      // Should pass through unchanged
      expect(result).toEqual(notHttpResponse);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should NOT treat object without body key as HttpResponse', async () => {
      const notHttpResponse = { statusCode: 200, data: 'test' };

      const next: CallHandler = {
        handle: () => of(notHttpResponse),
      };

      const result = await new Promise((resolve) => {
        interceptor.intercept(mockContext, next).subscribe(resolve);
      });

      // Should pass through unchanged
      expect(result).toEqual(notHttpResponse);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
