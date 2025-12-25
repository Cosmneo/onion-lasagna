# Dependency Injection

This library works with any DI container or none at all. The factory pattern makes wiring simple.

## Manual Composition (Recommended for Serverless)

No DI container. Direct instantiation. Zero overhead.

```typescript
import { z } from 'zod';
import {
  BaseController,
  GuardedController,
} from '@cosmneo/onion-lasagna/backend/core/presentation';
import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { Dto } from '@cosmneo/onion-lasagna/backend/core/validators/zod';

// --- Schemas ---
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
type CreateUserOutput = { id: string; email: string; name: string };

// --- Repository ---
class UserRepository {
  async save(user: { email: string; name: string }) {
    // save to DB
    return { id: 'generated-id', ...user };
  }
}

// --- Use Case ---
class CreateUserUseCase extends BaseInboundAdapter<CreateUserInput, CreateUserOutput> {
  constructor(private readonly userRepo: UserRepository) {
    super();
  }

  protected async handle(input: Dto<CreateUserInput>) {
    const saved = await this.userRepo.save(input.data);
    return new Dto(z.object({ id: z.string(), email: z.string(), name: z.string() }), saved);
  }
}

// --- Wiring ---
const userRepository = new UserRepository();
const createUserUseCase = new CreateUserUseCase(userRepository);

const createUserController = BaseController.create({
  requestMapper: (req: { body: unknown }) => new Dto(createUserSchema, req.body as CreateUserInput),
  useCase: createUserUseCase,
  responseMapper: (output) => ({ status: 201, body: output.data }),
});

// --- Usage ---
const response = await createUserController.execute({ body: { email: 'a@b.com', name: 'John' } });
```

### With Access Guard

```typescript
const guardedController = GuardedController.create({
  requestMapper: (req) => new Dto(createUserSchema, req.body as CreateUserInput),
  useCase: createUserUseCase,
  responseMapper: (output) => ({ status: 201, body: output.data }),
  accessGuard: async (req) => {
    const isAdmin = req.headers?.['x-role'] === 'admin';
    return { isAllowed: isAdmin, reason: isAdmin ? undefined : 'Admin only' };
  },
});
```

---

## With Awilix

Functional DI. No decorators. Lightweight.

```bash
bun add awilix
```

```typescript
import { createContainer, asClass, asFunction } from 'awilix';
import { BaseController } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { Dto } from '@cosmneo/onion-lasagna/backend/core/validators/zod';

// --- Container Setup ---
const container = createContainer();

container.register({
  userRepository: asClass(UserRepository).singleton(),
  createUserUseCase: asClass(CreateUserUseCase).singleton(),
});

// --- Resolve and Wire ---
const createUserController = BaseController.create({
  requestMapper: (req) => new Dto(createUserSchema, req.body as CreateUserInput),
  useCase: container.resolve('createUserUseCase'),
  responseMapper: (output) => ({ status: 201, body: output.data }),
});
```

### Awilix with Scoped Dependencies

```typescript
import { asClass, Lifetime } from 'awilix';

container.register({
  userRepository: asClass(UserRepository).scoped(),
  createUserUseCase: asClass(CreateUserUseCase).scoped(),
});

// Per-request scope
function handleRequest(req: Request) {
  const scope = container.createScope();
  scope.register({ requestContext: asValue({ userId: req.userId }) });

  const controller = BaseController.create({
    requestMapper: (r) => new Dto(createUserSchema, r.body as CreateUserInput),
    useCase: scope.resolve('createUserUseCase'),
    responseMapper: (output) => ({ status: 201, body: output.data }),
  });

  return controller.execute(req);
}
```

---

## With tsyringe

Decorator-based DI. Familiar if you know Angular/NestJS.

```bash
bun add tsyringe reflect-metadata
```

```typescript
import 'reflect-metadata';
import { container, injectable, inject } from 'tsyringe';
import { BaseController } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { Dto } from '@cosmneo/onion-lasagna/backend/core/validators/zod';

// --- Repository ---
@injectable()
class UserRepository {
  async save(user: { email: string; name: string }) {
    return { id: 'generated-id', ...user };
  }
}

// --- Use Case ---
@injectable()
class CreateUserUseCase extends BaseInboundAdapter<CreateUserInput, CreateUserOutput> {
  constructor(@inject(UserRepository) private readonly userRepo: UserRepository) {
    super();
  }

  protected async handle(input: Dto<CreateUserInput>) {
    const saved = await this.userRepo.save(input.data);
    return new Dto(createUserOutputSchema, saved);
  }
}

// --- Wire Controller ---
const createUserController = BaseController.create({
  requestMapper: (req) => new Dto(createUserSchema, req.body as CreateUserInput),
  useCase: container.resolve(CreateUserUseCase),
  responseMapper: (output) => ({ status: 201, body: output.data }),
});
```

### tsyringe with Tokens

```typescript
import { container, injectable, inject } from 'tsyringe';

// Define tokens
const TOKENS = {
  UserRepository: Symbol('UserRepository'),
  CreateUserUseCase: Symbol('CreateUserUseCase'),
};

// Register
container.register(TOKENS.UserRepository, { useClass: UserRepository });
container.register(TOKENS.CreateUserUseCase, { useClass: CreateUserUseCase });

// Resolve
const useCase = container.resolve<CreateUserUseCase>(TOKENS.CreateUserUseCase);
```

---

## With inversify

Enterprise-style DI. Full-featured.

```bash
bun add inversify reflect-metadata
```

```typescript
import 'reflect-metadata';
import { Container, injectable, inject } from 'inversify';
import { BaseController } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { BaseInboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { Dto } from '@cosmneo/onion-lasagna/backend/core/validators/zod';

// --- Tokens ---
const TYPES = {
  UserRepository: Symbol.for('UserRepository'),
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
};

// --- Repository ---
@injectable()
class UserRepository {
  async save(user: { email: string; name: string }) {
    return { id: 'generated-id', ...user };
  }
}

// --- Use Case ---
@injectable()
class CreateUserUseCase extends BaseInboundAdapter<CreateUserInput, CreateUserOutput> {
  constructor(@inject(TYPES.UserRepository) private readonly userRepo: UserRepository) {
    super();
  }

  protected async handle(input: Dto<CreateUserInput>) {
    const saved = await this.userRepo.save(input.data);
    return new Dto(createUserOutputSchema, saved);
  }
}

// --- Container Setup ---
const container = new Container();
container.bind(TYPES.UserRepository).to(UserRepository).inSingletonScope();
container.bind(TYPES.CreateUserUseCase).to(CreateUserUseCase).inSingletonScope();

// --- Wire Controller ---
const createUserController = BaseController.create({
  requestMapper: (req) => new Dto(createUserSchema, req.body as CreateUserInput),
  useCase: container.get<CreateUserUseCase>(TYPES.CreateUserUseCase),
  responseMapper: (output) => ({ status: 201, body: output.data }),
});
```

---

## Comparison

| Approach  | Cold Start | Complexity | Best For                       |
| --------- | ---------- | ---------- | ------------------------------ |
| Manual    | ~0ms       | Low        | Serverless, small apps         |
| Awilix    | ~5-15ms    | Low        | Medium apps, functional style  |
| tsyringe  | ~20-50ms   | Medium     | Teams familiar with decorators |
| inversify | ~20-50ms   | High       | Large monoliths, enterprise    |

## Key Point

The library doesn't care how you create dependencies. These all work:

```typescript
// Manual
useCase: new CreateUserUseCase(new UserRepository());

// Awilix
useCase: container.resolve('createUserUseCase');

// tsyringe
useCase: container.resolve(CreateUserUseCase);

// inversify
useCase: container.get(TYPES.CreateUserUseCase);
```

Pick what fits your project. For serverless, start with manual composition.
