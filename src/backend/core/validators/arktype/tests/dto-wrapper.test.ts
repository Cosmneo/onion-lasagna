import { describe, it, expect } from 'vitest';
import { type } from 'arktype';
import { Dto } from '../wrappers/dto';
import { BaseDto } from '../../../global/classes/base-dto.class';
import { ObjectValidationError } from '../../../global/exceptions/object-validation.error';

describe('ArkType Dto Wrapper', () => {
  describe('constructor', () => {
    it('should create a Dto with valid data', () => {
      const schema = type({
        name: 'string',
        email: 'string.email',
      });
      const dto = new Dto(schema, { name: 'John', email: 'john@example.com' });

      expect(dto).toBeInstanceOf(Dto);
      expect(dto).toBeInstanceOf(BaseDto);
    });

    it('should expose validated data', () => {
      const schema = type({
        name: 'string',
        age: 'number',
      });
      const dto = new Dto(schema, { name: 'Jane', age: 25 });

      expect(dto.data.name).toBe('Jane');
      expect(dto.data.age).toBe(25);
    });

    it('should throw ObjectValidationError for invalid data', () => {
      const schema = type({
        name: 'string',
        email: 'string.email',
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
      const schema = type({
        name: 'string',
        email: 'string',
      });

      expect(() => new Dto(schema, { name: 'John' } as { name: string; email: string })).toThrow(
        ObjectValidationError,
      );
    });

    it('should work with complex nested schemas', () => {
      const schema = type({
        user: {
          name: 'string',
          contacts: type({
            type: "'email'|'phone'",
            value: 'string',
          }).array(),
        },
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
  });

  describe('real-world usage pattern', () => {
    it('should work with a CreateUser DTO pattern', () => {
      const createUserSchema = type({
        username: 'string>=3',
        email: 'string.email',
        password: 'string>=8',
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
          return new CreateUserDto(
            data as { username: string; email: string; password: string },
          );
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
