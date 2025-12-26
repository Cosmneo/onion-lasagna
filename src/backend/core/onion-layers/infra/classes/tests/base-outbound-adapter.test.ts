import { describe, it, expect } from 'vitest';
import { BaseOutboundAdapter } from '../base-outbound-adapter.class';
import { InfraError } from '../../exceptions/infra.error';
import { DbError } from '../../exceptions/db.error';

// Factory functions to create fresh classes for each test
// This is needed because BaseOutboundAdapter uses prototype-level markers
function createTestRepository() {
  class TestRepository extends BaseOutboundAdapter {
    async findById(id: string): Promise<{ id: string; name: string } | null> {
      if (id === 'not-found') return null;
      return { id, name: 'Test Entity' };
    }

    async findAll(): Promise<{ id: string }[]> {
      return [{ id: '1' }, { id: '2' }];
    }

    syncMethod(value: string): string {
      return `processed: ${value}`;
    }

    async failingMethod(): Promise<void> {
      throw new Error('Database connection lost');
    }

    syncFailingMethod(): string {
      throw new Error('Sync operation failed');
    }
  }
  return new TestRepository();
}

function createCustomErrorRepository() {
  class CustomErrorRepository extends BaseOutboundAdapter {
    protected override createInfraError(error: unknown, methodName: string): InfraError {
      return new DbError({
        message: `Database error in ${methodName}`,
        cause: error,
      });
    }

    async query(): Promise<void> {
      throw new Error('Query failed');
    }
  }
  return new CustomErrorRepository();
}

function createRepositoryWithGetter() {
  class RepositoryWithGetter extends BaseOutboundAdapter {
    private _data = 'initial';

    get data(): string {
      return this._data;
    }

    set data(value: string) {
      this._data = value;
    }

    async fetchData(): Promise<string> {
      return this._data;
    }
  }
  return new RepositoryWithGetter();
}

describe('BaseOutboundAdapter', () => {
  describe('successful operations', () => {
    it('should execute async methods successfully', async () => {
      const repo = createTestRepository();

      const result = await repo.findById('123');

      expect(result).toEqual({ id: '123', name: 'Test Entity' });
    });

    it('should execute sync methods successfully', () => {
      const repo = createTestRepository();

      const result = repo.syncMethod('input');

      expect(result).toBe('processed: input');
    });

    it('should return null from async methods', async () => {
      const repo = createTestRepository();

      const result = await repo.findById('not-found');

      expect(result).toBeNull();
    });

    it('should return arrays from async methods', async () => {
      const repo = createTestRepository();

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('error wrapping', () => {
    it('should wrap async errors in InfraError', async () => {
      const repo = createTestRepository();

      await expect(repo.failingMethod()).rejects.toThrow(InfraError);
    });

    it('should wrap sync errors in InfraError', () => {
      const repo = createTestRepository();

      expect(() => repo.syncFailingMethod()).toThrow(InfraError);
    });

    it('should preserve original error as cause', async () => {
      const repo = createTestRepository();

      try {
        await repo.failingMethod();
      } catch (error) {
        expect(error).toBeInstanceOf(InfraError);
        expect((error as InfraError).cause).toBeInstanceOf(Error);
        expect(((error as InfraError).cause as Error).message).toBe('Database connection lost');
      }
    });

    it('should include method name in error message', async () => {
      const repo = createTestRepository();

      try {
        await repo.failingMethod();
      } catch (error) {
        expect((error as InfraError).message).toContain('failingMethod');
      }
    });
  });

  describe('custom error factory', () => {
    it('should use custom createInfraError when overridden', async () => {
      const repo = createCustomErrorRepository();

      await expect(repo.query()).rejects.toThrow(DbError);
    });

    it('should include method name in custom error', async () => {
      const repo = createCustomErrorRepository();

      try {
        await repo.query();
      } catch (error) {
        expect(error).toBeInstanceOf(DbError);
        expect((error as DbError).message).toContain('query');
      }
    });
  });

  describe('getters and setters', () => {
    it('should not wrap getters', () => {
      const repo = createRepositoryWithGetter();

      // Should work without throwing
      expect(repo.data).toBe('initial');
    });

    it('should not wrap setters', () => {
      const repo = createRepositoryWithGetter();

      // Should work without throwing
      repo.data = 'updated';
      expect(repo.data).toBe('updated');
    });

    it('should wrap regular methods alongside getters', async () => {
      const repo = createRepositoryWithGetter();
      repo.data = 'test data';

      const result = await repo.fetchData();

      expect(result).toBe('test data');
    });
  });

  describe('promise handling', () => {
    it('should handle rejected promises', async () => {
      class RejectingRepo extends BaseOutboundAdapter {
        async rejectingMethod(): Promise<string> {
          return Promise.reject(new Error('Rejected'));
        }
      }

      const repo = new RejectingRepo();

      await expect(repo.rejectingMethod()).rejects.toThrow(InfraError);
    });

    it('should handle promise that resolves then throws', async () => {
      class DelayedErrorRepo extends BaseOutboundAdapter {
        async delayedError(): Promise<string> {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error('Delayed error');
        }
      }

      const repo = new DelayedErrorRepo();

      await expect(repo.delayedError()).rejects.toThrow(InfraError);
    });
  });
});
