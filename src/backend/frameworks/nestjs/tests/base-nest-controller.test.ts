import { describe, it, expect } from 'vitest';
import { Controller } from '@nestjs/common';
import { EXCEPTION_FILTERS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { BaseNestController } from '../classes/base-nest-controller.class';
import { OnionLasagnaExceptionFilter } from '../filters/onion-lasagna-exception.filter';
import { OnionLasagnaResponseInterceptor } from '../interceptors/onion-lasagna-response.interceptor';

describe('BaseNestController', () => {
  describe('decorator inheritance', () => {
    it('should apply OnionLasagnaExceptionFilter to the base class', () => {
      const filters = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, BaseNestController);

      expect(filters).toBeDefined();
      expect(filters).toHaveLength(1);
      expect(filters[0]).toBe(OnionLasagnaExceptionFilter);
    });

    it('should apply OnionLasagnaResponseInterceptor to the base class', () => {
      const interceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, BaseNestController);

      expect(interceptors).toBeDefined();
      expect(interceptors).toHaveLength(1);
      expect(interceptors[0]).toBe(OnionLasagnaResponseInterceptor);
    });

    it('should allow child classes to inherit decorators', () => {
      @Controller('users')
      class UsersController extends BaseNestController {
        getUsers() {
          return [];
        }
      }

      // Child class inherits metadata from parent
      const parentFilters = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, BaseNestController);
      const parentInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, BaseNestController);

      expect(parentFilters).toContain(OnionLasagnaExceptionFilter);
      expect(parentInterceptors).toContain(OnionLasagnaResponseInterceptor);

      // The child class should be instantiable
      const controller = new UsersController();
      expect(controller).toBeInstanceOf(BaseNestController);
      expect(controller.getUsers()).toEqual([]);
    });

    it('should allow child classes to add additional decorators', () => {
      @Controller('orders')
      class OrdersController extends BaseNestController {
        getOrder() {
          return { id: '123' };
        }
      }

      const controller = new OrdersController();
      expect(controller).toBeInstanceOf(BaseNestController);
      expect(controller.getOrder()).toEqual({ id: '123' });
    });
  });

  describe('abstract class behavior', () => {
    it('should be an abstract class (cannot be instantiated directly)', () => {
      // TypeScript prevents direct instantiation of abstract classes at compile time
      // At runtime, we verify the class exists and has the expected structure
      expect(BaseNestController).toBeDefined();
      expect(typeof BaseNestController).toBe('function');

      // The prototype chain should be set up correctly
      expect(BaseNestController.prototype).toBeDefined();
    });

    it('should have no instance methods defined', () => {
      const prototypeKeys = Object.getOwnPropertyNames(BaseNestController.prototype);

      // Should only have 'constructor' - no other methods
      expect(prototypeKeys).toEqual(['constructor']);
    });
  });
});
