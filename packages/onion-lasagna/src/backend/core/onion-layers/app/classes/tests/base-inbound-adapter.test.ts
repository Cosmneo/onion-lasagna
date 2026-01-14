import { describe, it, expect } from 'vitest';
import { BaseInboundAdapter } from '../base-inbound-adapter.class';
import { UseCaseError } from '../../exceptions/use-case.error';
import { DomainError } from '../../../domain/exceptions/domain.error';
import { InfraError } from '../../../infra/exceptions/infra.error';
import { ObjectValidationError } from '../../../../global/exceptions/object-validation.error';
import { ForbiddenError } from '../../exceptions/forbidden.error';
import { NotFoundError } from '../../exceptions/not-found.error';

// Plain types for input/output
interface InputData {
  name: string;
}

interface OutputData {
  id: string;
  name: string;
}

// Concrete test implementations
class SuccessfulUseCase extends BaseInboundAdapter<InputData, OutputData> {
  protected async handle(input: InputData): Promise<OutputData> {
    return { id: 'generated-id', name: input.name };
  }
}

class FailingUseCase extends BaseInboundAdapter<InputData, OutputData> {
  constructor(private error: Error) {
    super();
  }

  protected async handle(_input: InputData): Promise<OutputData> {
    throw this.error;
  }
}

class SyncErrorUseCase extends BaseInboundAdapter<InputData, OutputData> {
  protected handle(_input: InputData): Promise<OutputData> {
    throw new Error('Synchronous error');
  }
}

describe('BaseInboundAdapter', () => {
  describe('execute', () => {
    it('should execute handle and return result', async () => {
      const useCase = new SuccessfulUseCase();
      const input: InputData = { name: 'Test User' };

      const result = await useCase.execute(input);

      expect(result).toEqual({ id: 'generated-id', name: 'Test User' });
    });

    it('should pass input to handle method', async () => {
      const useCase = new SuccessfulUseCase();
      const input: InputData = { name: 'Custom Name' };

      const result = await useCase.execute(input);

      expect(result.name).toBe('Custom Name');
    });
  });

  describe('error handling', () => {
    describe('passthrough errors', () => {
      it('should re-throw UseCaseError without wrapping', async () => {
        const originalError = new UseCaseError({ message: 'Use case failed', code: 'TEST_ERROR' });
        const useCase = new FailingUseCase(originalError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw DomainError without wrapping', async () => {
        const originalError = new DomainError({ message: 'Domain rule violated' });
        const useCase = new FailingUseCase(originalError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw InfraError without wrapping', async () => {
        const originalError = new InfraError({ message: 'Infrastructure failed' });
        const useCase = new FailingUseCase(originalError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });

      it('should re-throw ObjectValidationError without wrapping', async () => {
        const originalError = new ObjectValidationError({
          message: 'Validation failed',
          validationErrors: [{ field: 'field', message: 'required' }],
        });
        const useCase = new FailingUseCase(originalError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(originalError);
      });
    });

    describe('wrapped errors', () => {
      it('should wrap unknown errors in UseCaseError', async () => {
        const unknownError = new Error('Something unexpected');
        const useCase = new FailingUseCase(unknownError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });

      it('should preserve original error as cause', async () => {
        const unknownError = new Error('Original error');
        const useCase = new FailingUseCase(unknownError);
        const input: InputData = { name: 'Test' };

        try {
          await useCase.execute(input);
        } catch (error) {
          expect(error).toBeInstanceOf(UseCaseError);
          expect((error as UseCaseError).cause).toBe(unknownError);
        }
      });

      it('should wrap TypeError', async () => {
        const typeError = new TypeError('Cannot read property');
        const useCase = new FailingUseCase(typeError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });

      it('should wrap RangeError', async () => {
        const rangeError = new RangeError('Value out of range');
        const useCase = new FailingUseCase(rangeError);
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });
    });

    describe('synchronous errors in handle', () => {
      it('should handle synchronous throws in async method', async () => {
        const useCase = new SyncErrorUseCase();
        const input: InputData = { name: 'Test' };

        await expect(useCase.execute(input)).rejects.toThrow(UseCaseError);
      });
    });
  });

  describe('BaseInboundPort interface', () => {
    it('should implement execute method', () => {
      const useCase = new SuccessfulUseCase();

      expect(typeof useCase.execute).toBe('function');
    });
  });

  describe('subclass error hierarchy preservation', () => {
    it('should preserve ConflictError', async () => {
      const { ConflictError } = await import('../../exceptions/conflict.error');
      const conflictError = new ConflictError({ message: 'Already exists' });
      const useCase = new FailingUseCase(conflictError);
      const input: InputData = { name: 'Test' };

      await expect(useCase.execute(input)).rejects.toThrow(conflictError);
    });

    it('should preserve NotFoundError', async () => {
      const { NotFoundError } = await import('../../exceptions/not-found.error');
      const notFoundError = new NotFoundError({ message: 'Not found' });
      const useCase = new FailingUseCase(notFoundError);
      const input: InputData = { name: 'Test' };

      await expect(useCase.execute(input)).rejects.toThrow(notFoundError);
    });

    it('should preserve UnprocessableError', async () => {
      const { UnprocessableError } = await import('../../exceptions/unprocessable.error');
      const unprocessableError = new UnprocessableError({ message: 'Cannot process' });
      const useCase = new FailingUseCase(unprocessableError);
      const input: InputData = { name: 'Test' };

      await expect(useCase.execute(input)).rejects.toThrow(unprocessableError);
    });

    it('should preserve ForbiddenError', async () => {
      const forbiddenError = new ForbiddenError({ message: 'Not authorized' });
      const useCase = new FailingUseCase(forbiddenError);
      const input: InputData = { name: 'Test' };

      await expect(useCase.execute(input)).rejects.toThrow(forbiddenError);
    });
  });

  describe('authorize', () => {
    describe('basic authorization', () => {
      it('should call authorize before handle', async () => {
        const callOrder: string[] = [];

        class OrderTrackingUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(_input: InputData): Promise<void> {
            callOrder.push('authorize');
          }

          protected async handle(input: InputData): Promise<OutputData> {
            callOrder.push('handle');
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new OrderTrackingUseCase();
        await useCase.execute({ name: 'Test' });

        expect(callOrder).toEqual(['authorize', 'handle']);
      });

      it('should not call handle if authorize throws', async () => {
        let handleCalled = false;

        class FailingAuthUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(_input: InputData): Promise<void> {
            throw new ForbiddenError({ message: 'Access denied' });
          }

          protected async handle(input: InputData): Promise<OutputData> {
            handleCalled = true;
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new FailingAuthUseCase();
        await expect(useCase.execute({ name: 'Test' })).rejects.toThrow(ForbiddenError);
        expect(handleCalled).toBe(false);
      });

      it('should pass input to authorize', async () => {
        let receivedInput: InputData | null = null;

        class InputCapturingUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(input: InputData): Promise<void> {
            receivedInput = input;
          }

          protected async handle(input: InputData): Promise<OutputData> {
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new InputCapturingUseCase();
        await useCase.execute({ name: 'Captured' });

        expect(receivedInput).toEqual({ name: 'Captured' });
      });
    });

    describe('authorization errors', () => {
      it('should propagate ForbiddenError from authorize', async () => {
        class ForbiddenAuthUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(_input: InputData): Promise<void> {
            throw new ForbiddenError({ message: 'You shall not pass', code: 'GANDALF' });
          }

          protected async handle(input: InputData): Promise<OutputData> {
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new ForbiddenAuthUseCase();
        await expect(useCase.execute({ name: 'Test' })).rejects.toThrow(ForbiddenError);
      });

      it('should propagate NotFoundError from authorize', async () => {
        class NotFoundAuthUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(_input: InputData): Promise<void> {
            throw new NotFoundError({ message: 'Resource not found' });
          }

          protected async handle(input: InputData): Promise<OutputData> {
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new NotFoundAuthUseCase();
        await expect(useCase.execute({ name: 'Test' })).rejects.toThrow(NotFoundError);
      });

      it('should wrap unknown errors from authorize in UseCaseError', async () => {
        class UnknownErrorAuthUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async authorize(_input: InputData): Promise<void> {
            throw new Error('Unexpected error in authorization');
          }

          protected async handle(input: InputData): Promise<OutputData> {
            return { id: 'test', name: input.name };
          }
        }

        const useCase = new UnknownErrorAuthUseCase();
        await expect(useCase.execute({ name: 'Test' })).rejects.toThrow(UseCaseError);
      });
    });

    describe('context passing', () => {
      interface AuthContext {
        userId: string;
        permissions: string[];
      }

      it('should pass authorization context to handle', async () => {
        let receivedContext: AuthContext | null = null;

        class ContextPassingUseCase extends BaseInboundAdapter<InputData, OutputData, AuthContext> {
          protected async authorize(_input: InputData): Promise<AuthContext> {
            return {
              userId: 'user-123',
              permissions: ['read', 'write'],
            };
          }

          protected async handle(input: InputData, authContext: AuthContext): Promise<OutputData> {
            receivedContext = authContext;
            return { id: authContext.userId, name: input.name };
          }
        }

        const useCase = new ContextPassingUseCase();
        const result = await useCase.execute({ name: 'Test' });

        expect(receivedContext).toEqual({
          userId: 'user-123',
          permissions: ['read', 'write'],
        });
        expect(result.id).toBe('user-123');
      });

      it('should allow complex entity caching in context', async () => {
        interface Entity {
          id: string;
          name: string;
          ownerId: string;
        }

        interface EntityAuthContext {
          entity: Entity;
        }

        class EntityCachingUseCase extends BaseInboundAdapter<
          { entityId: string; userId: string },
          { updated: boolean },
          EntityAuthContext
        > {
          private mockEntity: Entity = { id: 'entity-1', name: 'Test Entity', ownerId: 'user-123' };
          public loadCount = 0;

          protected async authorize(input: { entityId: string; userId: string }): Promise<EntityAuthContext> {
            // Simulate loading entity from database
            this.loadCount++;
            const entity = this.mockEntity;

            if (entity.ownerId !== input.userId) {
              throw new ForbiddenError({ message: 'Not the owner' });
            }

            return { entity };
          }

          protected async handle(
            _input: { entityId: string; userId: string },
            { entity }: EntityAuthContext
          ): Promise<{ updated: boolean }> {
            // Use the cached entity without reloading
            return { updated: entity.name === 'Test Entity' };
          }
        }

        const useCase = new EntityCachingUseCase();
        const result = await useCase.execute({ entityId: 'entity-1', userId: 'user-123' });

        expect(result.updated).toBe(true);
        expect(useCase.loadCount).toBe(1); // Entity loaded only once!
      });

      it('should work with void context (default)', async () => {
        class VoidContextUseCase extends BaseInboundAdapter<InputData, OutputData> {
          protected async handle(input: InputData): Promise<OutputData> {
            return { id: 'void-context', name: input.name };
          }
        }

        const useCase = new VoidContextUseCase();
        const result = await useCase.execute({ name: 'Test' });

        expect(result).toEqual({ id: 'void-context', name: 'Test' });
      });
    });

    describe('real-world authorization patterns', () => {
      interface User {
        id: string;
        organizationId: string;
        role: 'admin' | 'member';
      }

      interface Activity {
        id: string;
        organizationId: string;
        name: string;
      }

      interface UpdateActivityInput {
        activityId: string;
        userId: string;
        organizationId: string;
        newName: string;
      }

      interface UpdateActivityContext {
        user: User;
        activity: Activity;
      }

      class UpdateActivityUseCase extends BaseInboundAdapter<
        UpdateActivityInput,
        { success: boolean },
        UpdateActivityContext
      > {
        private mockUsers: User[] = [
          { id: 'user-1', organizationId: 'org-1', role: 'admin' },
          { id: 'user-2', organizationId: 'org-2', role: 'member' },
        ];

        private mockActivities: Activity[] = [
          { id: 'activity-1', organizationId: 'org-1', name: 'Activity 1' },
          { id: 'activity-2', organizationId: 'org-2', name: 'Activity 2' },
        ];

        protected async authorize(input: UpdateActivityInput): Promise<UpdateActivityContext> {
          const user = this.mockUsers.find((u) => u.id === input.userId);
          if (!user) {
            throw new NotFoundError({ message: 'User not found' });
          }

          const activity = this.mockActivities.find((a) => a.id === input.activityId);
          if (!activity) {
            throw new NotFoundError({ message: 'Activity not found' });
          }

          // Check organization match
          if (user.organizationId !== activity.organizationId) {
            throw new ForbiddenError({ message: 'Cannot access activities from other organizations' });
          }

          // Check user belongs to the requested organization
          if (user.organizationId !== input.organizationId) {
            throw new ForbiddenError({ message: 'Organization mismatch' });
          }

          return { user, activity };
        }

        protected async handle(
          input: UpdateActivityInput,
          { activity }: UpdateActivityContext
        ): Promise<{ success: boolean }> {
          // Update activity (in real world, would persist)
          activity.name = input.newName;
          return { success: true };
        }
      }

      it('should allow authorized access', async () => {
        const useCase = new UpdateActivityUseCase();
        const result = await useCase.execute({
          activityId: 'activity-1',
          userId: 'user-1',
          organizationId: 'org-1',
          newName: 'Updated Activity',
        });

        expect(result.success).toBe(true);
      });

      it('should deny cross-organization access', async () => {
        const useCase = new UpdateActivityUseCase();

        await expect(
          useCase.execute({
            activityId: 'activity-2', // belongs to org-2
            userId: 'user-1', // belongs to org-1
            organizationId: 'org-1',
            newName: 'Hacked',
          })
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw NotFoundError for missing resources', async () => {
        const useCase = new UpdateActivityUseCase();

        await expect(
          useCase.execute({
            activityId: 'non-existent',
            userId: 'user-1',
            organizationId: 'org-1',
            newName: 'Test',
          })
        ).rejects.toThrow(NotFoundError);
      });
    });
  });
});
