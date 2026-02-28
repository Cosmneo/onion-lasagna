import { describe, it, expect } from 'vitest';
import { InfraError } from '../infra.error';
import { DbError } from '../db.error';
import { NetworkError } from '../network.error';
import { TimeoutError } from '../timeout.error';
import { ExternalServiceError } from '../external-service.error';
import { CodedError } from '../../../global/exceptions/coded-error.error';

describe('InfraError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new InfraError({ message: 'Infrastructure failed' });

      expect(error.message).toBe('Infrastructure failed');
      expect(error.code).toBe('INFRA_ERROR');
      expect(error.name).toBe('InfraError');
    });

    it('should accept custom code', () => {
      const error = new InfraError({
        message: 'Custom infra error',
        code: 'CUSTOM_INFRA_CODE',
      });

      expect(error.code).toBe('CUSTOM_INFRA_CODE');
    });

    it('should preserve cause', () => {
      const cause = new Error('Original cause');
      const error = new InfraError({
        message: 'Wrapped infra error',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of CodedError', () => {
      const error = new InfraError({ message: 'Test' });

      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Original message');
      const error = InfraError.fromError(original);

      expect(error).toBeInstanceOf(InfraError);
      expect(error.message).toBe('Original message');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = InfraError.fromError('string error');

      expect(error.message).toBe('Infrastructure error');
      expect(error.cause).toBe('string error');
    });
  });
});

describe('DbError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new DbError({ message: 'Database query failed' });

      expect(error.message).toBe('Database query failed');
      expect(error.code).toBe('DB_ERROR');
      expect(error.name).toBe('DbError');
    });

    it('should accept custom code', () => {
      const error = new DbError({
        message: 'Connection lost',
        code: 'DB_CONNECTION_LOST',
      });

      expect(error.code).toBe('DB_CONNECTION_LOST');
    });

    it('should preserve cause', () => {
      const cause = new Error('PostgreSQL error');
      const error = new DbError({
        message: 'Query failed',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of InfraError', () => {
      const error = new DbError({ message: 'Test' });

      expect(error).toBeInstanceOf(InfraError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Constraint violation');
      const error = DbError.fromError(original);

      expect(error).toBeInstanceOf(DbError);
      expect(error.message).toBe('Constraint violation');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = DbError.fromError(null);

      expect(error.message).toBe('Database error');
      expect(error.cause).toBeNull();
    });
  });
});

describe('NetworkError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new NetworkError({ message: 'Connection refused' });

      expect(error.message).toBe('Connection refused');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.name).toBe('NetworkError');
    });

    it('should accept custom code', () => {
      const error = new NetworkError({
        message: 'DNS resolution failed',
        code: 'DNS_FAILURE',
      });

      expect(error.code).toBe('DNS_FAILURE');
    });

    it('should preserve cause', () => {
      const cause = new Error('ECONNREFUSED');
      const error = new NetworkError({
        message: 'Cannot connect',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of InfraError', () => {
      const error = new NetworkError({ message: 'Test' });

      expect(error).toBeInstanceOf(InfraError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Socket closed');
      const error = NetworkError.fromError(original);

      expect(error).toBeInstanceOf(NetworkError);
      expect(error.message).toBe('Socket closed');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = NetworkError.fromError(undefined);

      expect(error.message).toBe('Network error');
      expect(error.cause).toBeUndefined();
    });
  });
});

describe('TimeoutError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new TimeoutError({ message: 'Request timed out' });

      expect(error.message).toBe('Request timed out');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.name).toBe('TimeoutError');
    });

    it('should accept custom code', () => {
      const error = new TimeoutError({
        message: 'Query timeout',
        code: 'QUERY_TIMEOUT',
      });

      expect(error.code).toBe('QUERY_TIMEOUT');
    });

    it('should preserve cause', () => {
      const cause = new Error('AbortError');
      const error = new TimeoutError({
        message: 'Operation cancelled',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of InfraError', () => {
      const error = new TimeoutError({ message: 'Test' });

      expect(error).toBeInstanceOf(InfraError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Deadline exceeded');
      const error = TimeoutError.fromError(original);

      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toBe('Deadline exceeded');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = TimeoutError.fromError({ timeout: 5000 });

      expect(error.message).toBe('Operation timed out');
      expect(error.cause).toEqual({ timeout: 5000 });
    });
  });
});

describe('ExternalServiceError', () => {
  describe('constructor', () => {
    it('should create with message and default code', () => {
      const error = new ExternalServiceError({ message: 'Payment gateway failed' });

      expect(error.message).toBe('Payment gateway failed');
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.name).toBe('ExternalServiceError');
    });

    it('should accept custom code', () => {
      const error = new ExternalServiceError({
        message: 'Stripe API error',
        code: 'STRIPE_ERROR',
      });

      expect(error.code).toBe('STRIPE_ERROR');
    });

    it('should preserve cause', () => {
      const cause = new Error('API returned 500');
      const error = new ExternalServiceError({
        message: 'Third-party failure',
        cause,
      });

      expect(error.cause).toBe(cause);
    });
  });

  describe('inheritance', () => {
    it('should be instance of InfraError', () => {
      const error = new ExternalServiceError({ message: 'Test' });

      expect(error).toBeInstanceOf(InfraError);
      expect(error).toBeInstanceOf(CodedError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('fromError', () => {
    it('should create from Error instance', () => {
      const original = new Error('Rate limit exceeded');
      const error = ExternalServiceError.fromError(original);

      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.cause).toBe(original);
    });

    it('should handle non-Error values', () => {
      const error = ExternalServiceError.fromError({ status: 503 });

      expect(error.message).toBe('External service error');
      expect(error.cause).toEqual({ status: 503 });
    });
  });
});

describe('error hierarchy', () => {
  it('should allow catching InfraError to catch all subtypes', () => {
    const errors: InfraError[] = [
      new InfraError({ message: 'Base infra' }),
      new DbError({ message: 'Database' }),
      new NetworkError({ message: 'Network' }),
      new TimeoutError({ message: 'Timeout' }),
      new ExternalServiceError({ message: 'External' }),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(InfraError);
    }
  });

  it('should distinguish between error types', () => {
    const db = new DbError({ message: 'DB' });
    const network = new NetworkError({ message: 'Network' });
    const timeout = new TimeoutError({ message: 'Timeout' });
    const external = new ExternalServiceError({ message: 'External' });

    expect(db).toBeInstanceOf(DbError);
    expect(db).not.toBeInstanceOf(NetworkError);
    expect(db).not.toBeInstanceOf(TimeoutError);
    expect(db).not.toBeInstanceOf(ExternalServiceError);

    expect(network).toBeInstanceOf(NetworkError);
    expect(network).not.toBeInstanceOf(DbError);

    expect(timeout).toBeInstanceOf(TimeoutError);
    expect(timeout).not.toBeInstanceOf(NetworkError);

    expect(external).toBeInstanceOf(ExternalServiceError);
    expect(external).not.toBeInstanceOf(TimeoutError);
  });

  it('should represent different infrastructure concerns', () => {
    // DbError - Database operations
    // NetworkError - Network connectivity
    // TimeoutError - Time-based failures
    // ExternalServiceError - Third-party services
    const db = new DbError({ message: 'test' });
    const network = new NetworkError({ message: 'test' });
    const timeout = new TimeoutError({ message: 'test' });
    const external = new ExternalServiceError({ message: 'test' });

    expect(db.code).toBe('DB_ERROR');
    expect(network.code).toBe('NETWORK_ERROR');
    expect(timeout.code).toBe('TIMEOUT_ERROR');
    expect(external.code).toBe('EXTERNAL_SERVICE_ERROR');
  });
});
