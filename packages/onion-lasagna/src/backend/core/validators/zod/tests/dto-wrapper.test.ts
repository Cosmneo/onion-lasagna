import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { Dto } from '../wrappers/dto';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('Zod Dto Wrapper', () => {
  describe('constructor', () => {
    it('should create a Dto with valid data', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });
      const dto = new Dto(schema, { name: 'John', email: 'john@example.com' });

      expect(dto).toBeInstanceOf(Dto);
      expect(dto).toBeInstanceOf(BaseDto);
    });

    it('should expose validated data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const dto = new Dto(schema, { name: 'Jane', age: 25 });

      expect(dto.data.name).toBe('Jane');
      expect(dto.data.age).toBe(25);
    });

    it('should throw ObjectValidationError for invalid data', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string().email(),
      });

      expect(
        () =>
          new Dto(schema, {
            name: 'John',
            email: 'invalid-email',
          }),
      ).toThrow(ObjectValidationError);
    });

    it('should throw for missing required fields', () => {
      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      expect(() => new Dto(schema, { name: 'John' } as { name: string; email: string })).toThrow(
        ObjectValidationError,
      );
    });

    it('should work with complex nested schemas', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          contacts: z.array(
            z.object({
              type: z.enum(['email', 'phone']),
              value: z.string(),
            }),
          ),
        }),
      });

      const dto = new Dto(schema, {
        user: {
          name: 'John',
          contacts: [
            { type: 'email', value: 'john@example.com' },
            { type: 'phone', value: '123-456-7890' },
          ],
        },
      });

      expect(dto.data.user.name).toBe('John');
      expect(dto.data.user.contacts).toHaveLength(2);
    });

    it('should apply schema transforms', () => {
      const schema = z.object({
        email: z.string().email().toLowerCase(),
      });

      const dto = new Dto(schema, { email: 'JOHN@EXAMPLE.COM' });

      expect(dto.data.email).toBe('john@example.com');
    });

    it('should apply default values', () => {
      const schema = z.object({
        name: z.string(),
        role: z.string().default('user'),
      });

      const dto = new Dto(schema, { name: 'John' } as { name: string; role: string });

      expect(dto.data.name).toBe('John');
      expect(dto.data.role).toBe('user');
    });
  });

  describe('real-world usage pattern', () => {
    it('should work with a CreateUser DTO pattern', () => {
      const createUserSchema = z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(8),
      });

      class CreateUserDto extends Dto<{
        username: string;
        email: string;
        password: string;
      }> {
        constructor(data: { username: string; email: string; password: string }) {
          super(createUserSchema, data);
        }

        static create(data: unknown) {
          return new CreateUserDto(data as { username: string; email: string; password: string });
        }
      }

      const dto = CreateUserDto.create({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'securepassword123',
      });

      expect(dto.data.username).toBe('johndoe');
      expect(dto.data.email).toBe('john@example.com');
    });
  });
});
