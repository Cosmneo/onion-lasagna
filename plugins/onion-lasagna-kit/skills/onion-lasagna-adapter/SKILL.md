---
name: onion-lasagna-adapter
description: Use when creating Onion Lasagna outbound ports, repository adapters, persistence adapters, external API adapters, or infrastructure error boundaries
---

# Onion Lasagna Adapter

## Overview

Adapters keep app use cases independent from concrete infrastructure. App defines outbound ports; infra implements them; bootstrap wires implementations into use cases.

## Required Context

Inspect existing app ports, infra adapters, repository patterns, and package exports before writing code. Search `*/app/**/ports`, `*/infra/**`, and `packages/onion-lasagna/src/**/index.ts`.

Load `../../references/architecture-rules.md` when creating or reviewing adapter code.

## Pattern

Create these pieces:

1. App outbound port interface.
2. Infra adapter implementing the port.
3. Concrete repository or external API client behind the adapter.
4. Mapper between rows/API DTOs and domain objects.
5. Bootstrap wiring.
6. Tests for port behavior and error wrapping.

## Example Shape

App port, under `app/**/ports`:

```typescript
export interface ProjectRepositoryPort {
  save(project: Project): Promise<void>;
  findById(id: ProjectId): Promise<Project | null>;
}
```

Infra adapter, under `infra/**`:

```typescript
import { BaseOutboundAdapter, InfraError } from '@cosmneo/onion-lasagna';

export class ProjectRepositoryAdapter extends BaseOutboundAdapter implements ProjectRepositoryPort {
  constructor(private readonly repository: DrizzleProjectRepository) {
    super();
  }

  save(project: Project): Promise<void> {
    return this.repository.save(project);
  }

  findById(id: ProjectId): Promise<Project | null> {
    return this.repository.findById(id);
  }

  protected override createInfraError(error: unknown, methodName: string): InfraError {
    return new InfraError({
      message: `Project repository failed during ${methodName}`,
      cause: error,
    });
  }
}
```

Bootstrap/composition root:

```typescript
const drizzleRepository = new DrizzleProjectRepository(db);
const projectRepository = new ProjectRepositoryAdapter(drizzleRepository);
const createProjectCommand = new CreateProjectCommand(projectRepository);
```

## Guardrails

- Do not import Drizzle, SDK clients, or framework objects into app use cases.
- Do not return raw rows or API DTOs to domain or app callers.
- Do not hide transaction or retry behavior inside use cases.
- Do not instantiate concrete repositories inside use cases.
- Do not skip error wrapping at the infra boundary.
