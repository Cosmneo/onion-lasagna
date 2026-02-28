import { describe, it, expect, vi } from 'vitest';
import {
  wrapError,
  wrapErrorAsync,
  wrapErrorUnless,
  wrapErrorUnlessAsync,
} from '../wrap-error.util';

class CustomError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CustomError';
  }
}

class PassthroughError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassthroughError';
  }
}

class AnotherPassthroughError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnotherPassthroughError';
  }
}

describe('wrapError', () => {
  describe('successful execution', () => {
    it('should return result when function succeeds', () => {
      const result = wrapError(
        () => 'success',
        () => new CustomError('should not be called'),
      );

      expect(result).toBe('success');
    });

    it('should return complex objects', () => {
      const data = { id: 1, name: 'test', items: [1, 2, 3] };
      const result = wrapError(
        () => data,
        () => new CustomError('error'),
      );

      expect(result).toEqual(data);
    });
  });

  describe('error transformation', () => {
    it('should transform thrown error using factory', () => {
      const originalError = new Error('Original');

      expect(() =>
        wrapError(
          () => {
            throw originalError;
          },
          (cause) => new CustomError('Wrapped', cause),
        ),
      ).toThrow(CustomError);
    });

    it('should pass cause to error factory', () => {
      const originalError = new Error('Original message');
      const factorySpy = vi.fn((cause) => new CustomError('Wrapped', cause));

      try {
        wrapError(() => {
          throw originalError;
        }, factorySpy);
      } catch {
        // Expected
      }

      expect(factorySpy).toHaveBeenCalledWith(originalError);
    });

    it('should handle non-Error throws', () => {
      const result = vi.fn((cause) => new CustomError(`Caught: ${cause}`, cause));

      try {
        wrapError(() => {
          throw 'string error';
        }, result);
      } catch {
        // Expected
      }

      expect(result).toHaveBeenCalledWith('string error');
    });
  });
});

describe('wrapErrorAsync', () => {
  describe('successful execution', () => {
    it('should return result when async function succeeds', async () => {
      const result = await wrapErrorAsync(
        async () => 'async success',
        () => new CustomError('error'),
      );

      expect(result).toBe('async success');
    });

    it('should handle delayed results', async () => {
      const result = await wrapErrorAsync(
        () => new Promise((resolve) => setTimeout(() => resolve('delayed'), 10)),
        () => new CustomError('error'),
      );

      expect(result).toBe('delayed');
    });
  });

  describe('error transformation', () => {
    it('should transform async errors', async () => {
      await expect(
        wrapErrorAsync(
          async () => {
            throw new Error('Async error');
          },
          (cause) => new CustomError('Wrapped async', cause),
        ),
      ).rejects.toThrow(CustomError);
    });

    it('should transform rejected promises', async () => {
      await expect(
        wrapErrorAsync(
          () => Promise.reject(new Error('Rejected')),
          () => new CustomError('Wrapped rejection'),
        ),
      ).rejects.toThrow('Wrapped rejection');
    });
  });
});

describe('wrapErrorUnless', () => {
  describe('passthrough behavior', () => {
    it('should re-throw passthrough errors without transformation', () => {
      const passthroughError = new PassthroughError('Should pass through');

      expect(() =>
        wrapErrorUnless(
          () => {
            throw passthroughError;
          },
          () => new CustomError('Should not be created'),
          [PassthroughError],
        ),
      ).toThrow(passthroughError);
    });

    it('should handle multiple passthrough types', () => {
      const error1 = new PassthroughError('First type');
      const error2 = new AnotherPassthroughError('Second type');

      expect(() =>
        wrapErrorUnless(
          () => {
            throw error1;
          },
          () => new CustomError('wrapped'),
          [PassthroughError, AnotherPassthroughError],
        ),
      ).toThrow(error1);

      expect(() =>
        wrapErrorUnless(
          () => {
            throw error2;
          },
          () => new CustomError('wrapped'),
          [PassthroughError, AnotherPassthroughError],
        ),
      ).toThrow(error2);
    });
  });

  describe('transformation behavior', () => {
    it('should transform non-passthrough errors', () => {
      const regularError = new Error('Regular error');

      expect(() =>
        wrapErrorUnless(
          () => {
            throw regularError;
          },
          (cause) => new CustomError('Transformed', cause),
          [PassthroughError],
        ),
      ).toThrow(CustomError);
    });

    it('should return result when function succeeds', () => {
      const result = wrapErrorUnless(
        () => 'success',
        () => new CustomError('error'),
        [PassthroughError],
      );

      expect(result).toBe('success');
    });
  });
});

describe('wrapErrorUnlessAsync', () => {
  describe('passthrough behavior', () => {
    it('should re-throw async passthrough errors without transformation', async () => {
      const passthroughError = new PassthroughError('Async passthrough');

      await expect(
        wrapErrorUnlessAsync(
          async () => {
            throw passthroughError;
          },
          () => new CustomError('Should not be created'),
          [PassthroughError],
        ),
      ).rejects.toThrow(passthroughError);
    });

    it('should handle rejected promises with passthrough errors', async () => {
      const passthroughError = new PassthroughError('Rejected passthrough');

      await expect(
        wrapErrorUnlessAsync(
          () => Promise.reject(passthroughError),
          () => new CustomError('wrapped'),
          [PassthroughError],
        ),
      ).rejects.toThrow(passthroughError);
    });
  });

  describe('transformation behavior', () => {
    it('should transform non-passthrough async errors', async () => {
      await expect(
        wrapErrorUnlessAsync(
          async () => {
            throw new Error('Regular async error');
          },
          () => new CustomError('Transformed async'),
          [PassthroughError],
        ),
      ).rejects.toThrow(CustomError);
    });

    it('should return result when async function succeeds', async () => {
      const result = await wrapErrorUnlessAsync(
        async () => 'async success',
        () => new CustomError('error'),
        [PassthroughError],
      );

      expect(result).toBe('async success');
    });
  });

  describe('inheritance checking', () => {
    it('should passthrough subclass errors when parent is in passthrough list', async () => {
      class ParentError extends Error {}
      class ChildError extends ParentError {}

      const childError = new ChildError('Child error');

      await expect(
        wrapErrorUnlessAsync(
          async () => {
            throw childError;
          },
          () => new CustomError('wrapped'),
          [ParentError],
        ),
      ).rejects.toThrow(childError);
    });
  });
});
