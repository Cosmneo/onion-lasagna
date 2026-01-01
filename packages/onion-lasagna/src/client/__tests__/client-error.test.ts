import { describe, it, expect } from 'vitest';
import { ClientError } from '../types';

describe('ClientError', () => {
  describe('constructor', () => {
    it('should create error with message and status', () => {
      const error = new ClientError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.name).toBe('ClientError');
    });

    it('should create error with all properties', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ClientError('Validation failed', 400, 'VALIDATION_ERROR', details);

      expect(error.message).toBe('Validation failed');
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should be instanceof Error', () => {
      const error = new ClientError('Test', 500);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClientError);
    });
  });

  describe('static factory methods', () => {
    describe('networkError', () => {
      it('should create network error with status 0', () => {
        const error = ClientError.networkError('Connection failed');

        expect(error.message).toBe('Connection failed');
        expect(error.status).toBe(0);
        expect(error.code).toBe('NETWORK_ERROR');
      });

      it('should include cause when provided', () => {
        const cause = new Error('ECONNREFUSED');
        const error = ClientError.networkError('Connection failed', cause);

        expect(error.cause).toBe(cause);
      });
    });

    describe('timeoutError', () => {
      it('should create timeout error with formatted message', () => {
        const error = ClientError.timeoutError('http://localhost:3000/api', 5000);

        expect(error.message).toBe('Request to http://localhost:3000/api timed out after 5000ms');
        expect(error.status).toBe(0);
        expect(error.code).toBe('TIMEOUT_ERROR');
      });
    });

    describe('fromResponse', () => {
      it('should create error from response with message in body', () => {
        const body = { message: 'User not found', code: 'USER_NOT_FOUND' };
        const error = ClientError.fromResponse(404, body);

        expect(error.message).toBe('User not found');
        expect(error.status).toBe(404);
        expect(error.code).toBe('USER_NOT_FOUND');
        expect(error.details).toEqual(body);
      });

      it('should extract error from nested error object', () => {
        const body = { error: { message: 'Invalid token', code: 'INVALID_TOKEN' } };
        const error = ClientError.fromResponse(401, body);

        expect(error.message).toBe('Invalid token');
        expect(error.code).toBe('INVALID_TOKEN');
      });

      it('should use default message when body has no message', () => {
        const body = { data: null };
        const error = ClientError.fromResponse(500, body);

        expect(error.message).toBe('Request failed with status 500');
      });

      it('should handle string body', () => {
        const body = 'Internal Server Error';
        const error = ClientError.fromResponse(500, body);

        expect(error.message).toBe('Internal Server Error');
      });

      it('should extract errorMessage field', () => {
        const body = { errorMessage: 'Something went wrong' };
        const error = ClientError.fromResponse(500, body);

        expect(error.message).toBe('Something went wrong');
      });

      it('should extract error field as string', () => {
        const body = { error: 'Access denied' };
        const error = ClientError.fromResponse(403, body);

        expect(error.message).toBe('Access denied');
      });

      it('should extract errorCode field', () => {
        const body = { message: 'Error', errorCode: 'ERR_001' };
        const error = ClientError.fromResponse(400, body);

        expect(error.code).toBe('ERR_001');
      });
    });
  });

  describe('error type checks', () => {
    describe('isNetworkError', () => {
      it('should return true for status 0', () => {
        const error = ClientError.networkError('Network failed');
        expect(error.isNetworkError()).toBe(true);
      });

      it('should return false for non-zero status', () => {
        const error = new ClientError('Server error', 500);
        expect(error.isNetworkError()).toBe(false);
      });
    });

    describe('isClientError', () => {
      it('should return true for 4xx status codes', () => {
        expect(new ClientError('Bad request', 400).isClientError()).toBe(true);
        expect(new ClientError('Unauthorized', 401).isClientError()).toBe(true);
        expect(new ClientError('Forbidden', 403).isClientError()).toBe(true);
        expect(new ClientError('Not found', 404).isClientError()).toBe(true);
        expect(new ClientError('Conflict', 409).isClientError()).toBe(true);
        expect(new ClientError('Unprocessable', 422).isClientError()).toBe(true);
        expect(new ClientError('Too many requests', 429).isClientError()).toBe(true);
      });

      it('should return false for non-4xx status codes', () => {
        expect(new ClientError('Server error', 500).isClientError()).toBe(false);
        expect(new ClientError('Network error', 0).isClientError()).toBe(false);
      });
    });

    describe('isServerError', () => {
      it('should return true for 5xx status codes', () => {
        expect(new ClientError('Internal error', 500).isServerError()).toBe(true);
        expect(new ClientError('Not implemented', 501).isServerError()).toBe(true);
        expect(new ClientError('Bad gateway', 502).isServerError()).toBe(true);
        expect(new ClientError('Service unavailable', 503).isServerError()).toBe(true);
        expect(new ClientError('Gateway timeout', 504).isServerError()).toBe(true);
      });

      it('should return false for non-5xx status codes', () => {
        expect(new ClientError('Not found', 404).isServerError()).toBe(false);
        expect(new ClientError('Network error', 0).isServerError()).toBe(false);
      });
    });

    describe('shouldRetry', () => {
      it('should return true for network errors', () => {
        const error = ClientError.networkError('Failed');
        expect(error.shouldRetry()).toBe(true);
      });

      it('should return true for server errors', () => {
        expect(new ClientError('Internal error', 500).shouldRetry()).toBe(true);
        expect(new ClientError('Bad gateway', 502).shouldRetry()).toBe(true);
      });

      it('should return false for client errors', () => {
        expect(new ClientError('Not found', 404).shouldRetry()).toBe(false);
        expect(new ClientError('Bad request', 400).shouldRetry()).toBe(false);
      });
    });
  });

  describe('toJSON', () => {
    it('should serialize error to plain object', () => {
      const error = new ClientError('Test error', 400, 'TEST_CODE', { extra: 'data' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ClientError',
        message: 'Test error',
        status: 400,
        code: 'TEST_CODE',
        details: { extra: 'data' },
      });
    });

    it('should handle undefined optional fields', () => {
      const error = new ClientError('Simple error', 500);
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'ClientError',
        message: 'Simple error',
        status: 500,
        code: undefined,
        details: undefined,
      });
    });
  });
});
