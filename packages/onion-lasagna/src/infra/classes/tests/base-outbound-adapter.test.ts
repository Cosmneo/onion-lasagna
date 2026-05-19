import { describe, it, expect } from 'vitest';
import { BaseOutboundAdapter } from '../base-outbound-adapter.class';
import { InfraError } from '../../exceptions/infra.error';
import { DbError } from '../../exceptions/db.error';

// Module-scope classes — no per-test factory workaround needed since the
// prototype-dedup bug has been fixed (each instance is independently wrapped).

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

// Used for multi-instance regression tests at module scope.
class BoomRepo extends BaseOutboundAdapter {
  async boom(): Promise<void> {
    throw new Error('raw');
  }

  syncBoom(): string {
    throw new Error('raw sync');
  }
}

class BoomRepoCustomError extends BaseOutboundAdapter {
  protected override createInfraError(error: unknown, methodName: string): InfraError {
    return new DbError({ message: `Database error in ${methodName}`, cause: error });
  }

  async boom(): Promise<void> {
    throw new Error('raw');
  }
}

describe('BaseOutboundAdapter', () => {
  describe('successful operations', () => {
    it('should execute async methods successfully', async () => {
      const repo = new TestRepository();

      const result = await repo.findById('123');

      expect(result).toEqual({ id: '123', name: 'Test Entity' });
    });

    it('should execute sync methods successfully', () => {
      const repo = new TestRepository();

      const result = repo.syncMethod('input');

      expect(result).toBe('processed: input');
    });

    it('should return null from async methods', async () => {
      const repo = new TestRepository();

      const result = await repo.findById('not-found');

      expect(result).toBeNull();
    });

    it('should return arrays from async methods', async () => {
      const repo = new TestRepository();

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('error wrapping', () => {
    it('should wrap async errors in InfraError', async () => {
      const repo = new TestRepository();

      await expect(repo.failingMethod()).rejects.toThrow(InfraError);
    });

    it('should wrap sync errors in InfraError', () => {
      const repo = new TestRepository();

      expect(() => repo.syncFailingMethod()).toThrow(InfraError);
    });

    it('should preserve original error as cause', async () => {
      const repo = new TestRepository();

      try {
        await repo.failingMethod();
      } catch (error) {
        expect(error).toBeInstanceOf(InfraError);
        expect((error as InfraError).cause).toBeInstanceOf(Error);
        expect(((error as InfraError).cause as Error).message).toBe('Database connection lost');
      }
    });

    it('should include method name in error message', async () => {
      const repo = new TestRepository();

      try {
        await repo.failingMethod();
      } catch (error) {
        expect((error as InfraError).message).toContain('failingMethod');
      }
    });
  });

  describe('custom error factory', () => {
    it('should use custom createInfraError when overridden', async () => {
      const repo = new CustomErrorRepository();

      await expect(repo.query()).rejects.toThrow(DbError);
    });

    it('should include method name in custom error', async () => {
      const repo = new CustomErrorRepository();

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
      const repo = new RepositoryWithGetter();

      // Should work without throwing
      expect(repo.data).toBe('initial');
    });

    it('should not wrap setters', () => {
      const repo = new RepositoryWithGetter();

      // Should work without throwing
      repo.data = 'updated';
      expect(repo.data).toBe('updated');
    });

    it('should wrap regular methods alongside getters', async () => {
      const repo = new RepositoryWithGetter();
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

  describe('multi-instance regression — prototype-dedup bug fix', () => {
    it('second instance of a module-scope class wraps async errors in InfraError', async () => {
      // First instance (would have triggered prototype-dedup in the buggy version)
      const _first = new BoomRepo();
      const second = new BoomRepo();

      const err = await second.boom().catch((e: unknown) => e);

      expect(err).toBeInstanceOf(InfraError);
      expect((err as InfraError).cause).toBeInstanceOf(Error);
      expect(((err as InfraError).cause as Error).message).toBe('raw');
    });

    it('five instances all wrap async errors in InfraError', async () => {
      const instances = Array.from({ length: 5 }, () => new BoomRepo());

      for (const inst of instances) {
        const err = await inst.boom().catch((e: unknown) => e);
        expect(err).toBeInstanceOf(InfraError);
      }
    });

    it('second instance wraps sync errors in InfraError', () => {
      const _first = new BoomRepo();
      const second = new BoomRepo();

      expect(() => second.syncBoom()).toThrow(InfraError);
    });

    it('custom createInfraError override applies on the second instance', async () => {
      const _first = new BoomRepoCustomError();
      const second = new BoomRepoCustomError();

      const err = await second.boom().catch((e: unknown) => e);

      expect(err).toBeInstanceOf(DbError);
    });
  });
});
