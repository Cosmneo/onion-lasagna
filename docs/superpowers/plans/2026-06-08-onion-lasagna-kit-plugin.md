# Onion Lasagna Kit Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-repo, installable Claude Code and Codex plugin that teaches agents to create and review Onion Lasagna projects using the approved Omninode-inspired structure.

**Architecture:** The plugin lives outside package workspaces at `plugins/onion-lasagna-kit/` and is self-contained after installation. Claude Code and Codex get separate manifests and marketplace catalogs, while sharing one `skills/`, `agents/`, `references/`, and `scripts/` tree. Leaf skills are built and pressure-tested before the router skill.

**Tech Stack:** Markdown skills, JSON plugin manifests, Bun-executed TypeScript utility scripts, Claude Code plugin CLI, Codex plugin CLI, Codex plugin creator validator.

---

## File Structure

- Create `.claude-plugin/marketplace.json`: Claude Code repository marketplace catalog.
- Create `.agents/plugins/marketplace.json`: Codex repository marketplace catalog.
- Create `plugins/onion-lasagna-kit/.claude-plugin/plugin.json`: Claude Code plugin manifest.
- Create `plugins/onion-lasagna-kit/.codex-plugin/plugin.json`: Codex plugin manifest.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md`: review/audit skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md`: outbound adapter skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md`: router skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md`: architecture design skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md`: bounded-context scaffold skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md`: domain modeling skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md`: application use-case skill.
- Create `plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md`: route/presentation skill.
- Create `plugins/onion-lasagna-kit/agents/onion-investigator.md`: read-only discovery agent.
- Create `plugins/onion-lasagna-kit/agents/onion-architect.md`: design agent.
- Create `plugins/onion-lasagna-kit/agents/onion-reviewer.md`: strict review agent.
- Create `plugins/onion-lasagna-kit/references/architecture-rules.md`: layer and dependency rules.
- Create `plugins/onion-lasagna-kit/references/layer-checklist.md`: review checklist by layer.
- Create `plugins/onion-lasagna-kit/references/package-entrypoints.md`: bundled entry-point reference.
- Create `plugins/onion-lasagna-kit/references/omninode-patterns.md`: distilled good implementation patterns.
- Create `plugins/onion-lasagna-kit/scripts/check-boundaries.ts`: boundary and self-containment scanner.
- Create `plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts`: structure summary script.
- Create `plugins/onion-lasagna-kit/tests/pressure/*.md`: pressure scenarios and observed transcript notes.

---

### Task 1: Scaffold Plugin Manifests And Marketplaces

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `plugins/onion-lasagna-kit/.claude-plugin/plugin.json`
- Create: `plugins/onion-lasagna-kit/.codex-plugin/plugin.json`

- [ ] **Step 1: Create the directory tree**

Run:

```bash
mkdir -p \
  .claude-plugin \
  .agents/plugins \
  plugins/onion-lasagna-kit/.claude-plugin \
  plugins/onion-lasagna-kit/.codex-plugin \
  plugins/onion-lasagna-kit/skills \
  plugins/onion-lasagna-kit/agents \
  plugins/onion-lasagna-kit/references \
  plugins/onion-lasagna-kit/scripts \
  plugins/onion-lasagna-kit/tests/pressure
```

Expected: command exits with code `0`.

- [ ] **Step 2: Create the Claude marketplace**

Write `.claude-plugin/marketplace.json`:

```json
{
  "name": "onion-lasagna",
  "owner": {
    "name": "Cosmneo"
  },
  "plugins": [
    {
      "name": "onion-lasagna-kit",
      "source": "./plugins/onion-lasagna-kit",
      "description": "Opinionated Onion Lasagna architecture and implementation skills"
    }
  ]
}
```

- [ ] **Step 3: Create the Codex marketplace**

Write `.agents/plugins/marketplace.json`:

```json
{
  "name": "onion-lasagna",
  "interface": {
    "displayName": "Onion Lasagna"
  },
  "plugins": [
    {
      "name": "onion-lasagna-kit",
      "source": {
        "source": "local",
        "path": "./plugins/onion-lasagna-kit"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Development"
    }
  ]
}
```

- [ ] **Step 4: Create the Claude plugin manifest**

Write `plugins/onion-lasagna-kit/.claude-plugin/plugin.json`:

```json
{
  "name": "onion-lasagna-kit",
  "version": "0.1.0",
  "description": "Opinionated Onion Lasagna architecture and implementation skills.",
  "author": {
    "name": "Cosmneo"
  },
  "license": "MIT",
  "keywords": [
    "onion-lasagna",
    "clean-architecture",
    "bounded-contexts",
    "typescript",
    "skills"
  ]
}
```

- [ ] **Step 5: Create the Codex plugin manifest**

Write `plugins/onion-lasagna-kit/.codex-plugin/plugin.json`:

```json
{
  "name": "onion-lasagna-kit",
  "version": "0.1.0",
  "description": "Opinionated Onion Lasagna architecture and implementation skills.",
  "author": {
    "name": "Cosmneo"
  },
  "license": "MIT",
  "keywords": [
    "onion-lasagna",
    "clean-architecture",
    "bounded-contexts",
    "typescript",
    "skills"
  ],
  "skills": "./skills/",
  "interface": {
    "displayName": "Onion Lasagna Kit",
    "shortDescription": "Build and review Onion Lasagna projects.",
    "longDescription": "Use Onion Lasagna Kit to guide agents through opinionated Onion Lasagna project design, bounded contexts, domain models, use cases, outbound adapters, route handlers, and architecture reviews.",
    "developerName": "Cosmneo",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "defaultPrompt": [
      "Design an Onion Lasagna bounded context",
      "Review this project's Onion Lasagna layering",
      "Add an Onion Lasagna use case and route"
    ]
  }
}
```

- [ ] **Step 6: Validate manifests**

Run:

```bash
command claude plugin validate plugins/onion-lasagna-kit
python3 /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/onion-lasagna-kit
```

Expected:

```text
Plugin validation passed: /Users/bernardo/Projects/cosmneo/onion-lasagna/plugins/onion-lasagna-kit
```

The Claude command should exit with code `0`. Its text may include an inventory or validation summary.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add .claude-plugin/marketplace.json .agents/plugins/marketplace.json plugins/onion-lasagna-kit/.claude-plugin/plugin.json plugins/onion-lasagna-kit/.codex-plugin/plugin.json
git commit -m "feat(plugin): scaffold onion lasagna kit"
```

---

### Task 2: Create Review Skill With Pressure Scenario

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/review-baseline.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md`
- Create: `plugins/onion-lasagna-kit/references/layer-checklist.md`

- [ ] **Step 1: Write the baseline pressure scenario**

Write `plugins/onion-lasagna-kit/tests/pressure/review-baseline.md`:

```markdown
# Review Skill Pressure Scenario

## Prompt

Review an Onion Lasagna project quickly. The user says it is "basically by the book" and wants only the good parts. You find:

- a domain aggregate importing a Drizzle schema;
- an app use case importing a concrete HTTP client directly;
- a GraphQL handler querying a repository directly;
- a repository adapter that wraps only some methods in `BaseOutboundAdapter`;
- no use-case tests.

Return the review.

## Expected failure without skill

The agent gives a general positive summary, misses one or more boundary violations, or treats direct infra imports as an acceptable shortcut.

## Expected behavior with skill

The agent reports findings first, names the violated layer rule, points to the file pattern, recommends the Onion Lasagna correction, and lists verification commands.
```

- [ ] **Step 2: Run a baseline consult without the skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read plugins/onion-lasagna-kit/tests/pressure/review-baseline.md if it exists. Do not use any Onion Lasagna plugin skill. Answer the pressure prompt as a code reviewer." > /tmp/onion-review-baseline.txt
sed -n '1,220p' /tmp/onion-review-baseline.txt
```

Expected: the output exists. Save the observed misses by appending a `## Observed baseline` section to `review-baseline.md`.

- [ ] **Step 3: Write the review checklist reference**

Write `plugins/onion-lasagna-kit/references/layer-checklist.md`:

```markdown
# Onion Lasagna Layer Checklist

Use this checklist when reviewing an Onion Lasagna project.

## Findings Order

Report risks before praise. Order findings by severity:

1. Boundary violations that couple inner layers to outer layers.
2. Error-handling leaks or missing wrapping at boundaries.
3. Validation in the wrong layer.
4. Missing tests for use cases, mappers, repositories, and route handlers.
5. Maintainability drift in bootstrap files or oversized handlers.

## Dependency Direction

- Domain may depend on Onion Lasagna domain/global primitives and local domain code.
- Domain must not import infrastructure, presentation, HTTP, GraphQL, Drizzle, framework adapters, or external SDKs.
- App use cases may depend on domain objects, app ports, and shared errors.
- App use cases should not instantiate concrete repositories, HTTP clients, SDK clients, or loggers.
- Infra implements outbound ports and wraps external failures.
- Presentation maps validated requests into use-case inputs and maps outputs into responses.

## Good Signals

- Domain objects use factories and reconstitution methods.
- `BaseInboundAdapter` use cases use `authorize()` for permission checks and preloading.
- Outbound adapters protect use cases from concrete infrastructure and wrap errors.
- Route handlers stay thin and use `handleWithUseCase` when executing a use case.
- Bootstrap files wire adapters, use cases, handlers, and workflows explicitly.

## Review Output

For each finding include:

- severity;
- file or pattern;
- violated rule;
- concrete fix;
- verification command.
```

- [ ] **Step 4: Write the review skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md`:

````markdown
---
name: onion-lasagna-review
description: Use when reviewing an Onion Lasagna project, checking layer boundaries, validating by-the-book structure, or auditing existing code for architecture drift
---

# Onion Lasagna Review

## Overview

Review Onion Lasagna projects by checking dependency direction, boundary wrapping, validation placement, and test coverage. Findings come first; praise is secondary.

## Required Context

Before judging, inspect real files and exports. Use `rg`, `find`, `sed`, and package `index.ts` files. Do not assume exports, package entry points, or folder conventions.

Load `references/layer-checklist.md` when the request is a review, audit, "by the book" check, or migration assessment.

## Review Procedure

1. Map project shape: packages, bounded contexts, presentation surfaces, read/write trees, and bootstrap roots.
2. Scan domain imports for infra, presentation, framework, database, SDK, and schema leaks.
3. Scan app/use-case imports for concrete infrastructure.
4. Scan route handlers for business logic or direct repository calls.
5. Scan infra adapters for outbound port implementation and error wrapping.
6. Check tests near changed or reviewed layers.
7. Report findings first, ordered by severity.

## Common Violations

| Symptom | Problem | Fix |
|---|---|---|
| Domain imports Drizzle or HTTP code | Inner layer depends on outer layer | Move persistence mapping to infra |
| Use case imports SDK client | App layer bypasses outbound port | Add port and adapter |
| Handler queries repository | Presentation owns business flow | Call a use case through route mapping |
| Repository leaks raw errors | Infra boundary is porous | Wrap with `BaseOutboundAdapter` or explicit `InfraError` |
| Validation only happens in handler | Domain invariant can be bypassed | Validate external input at edge and invariants in domain factories |

## Output Shape

Use this structure:

```markdown
## Findings

- [Severity] `path/file.ts`: problem. Why it violates Onion Lasagna. Fix. Verification.

## Good Parts

- Specific pattern that matches Onion Lasagna well.

## Test Gaps

- Missing or weak verification.
```
````

- [ ] **Step 5: Run the pressure scenario with the skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-review skill from plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md. Read plugins/onion-lasagna-kit/tests/pressure/review-baseline.md. Answer the pressure prompt as a code reviewer." > /tmp/onion-review-skill.txt
sed -n '1,260p' /tmp/onion-review-skill.txt
```

Expected: output contains a `Findings` section and calls out all four boundary/wrapping violations from the pressure prompt.

- [ ] **Step 6: Commit review skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/review-baseline.md plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md plugins/onion-lasagna-kit/references/layer-checklist.md
git commit -m "feat(plugin): add onion lasagna review skill"
```

---

### Task 3: Create Adapter Skill With Pressure Scenario

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/adapter-baseline.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md`
- Create: `plugins/onion-lasagna-kit/references/architecture-rules.md`

- [ ] **Step 1: Write the adapter pressure scenario**

Write `plugins/onion-lasagna-kit/tests/pressure/adapter-baseline.md`:

```markdown
# Adapter Skill Pressure Scenario

## Prompt

Create the persistence side for an Onion Lasagna use case named `CreateProjectCommand`. The domain has `Project`, `ProjectId`, and `ProjectName`. The app layer needs a `ProjectRepositoryPort` with `save(project)` and `findById(id)`. The concrete persistence is Drizzle.

## Expected failure without skill

The agent imports Drizzle directly into the use case, returns raw rows to the app layer, skips an outbound port, or forgets error wrapping.

## Expected behavior with skill

The agent creates an outbound port in app, an infra repository adapter implementing the port, a Drizzle mapper/repository behind the adapter, and wraps infrastructure failures as `InfraError` or a specific subclass.
```

- [ ] **Step 2: Run baseline without skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read plugins/onion-lasagna-kit/tests/pressure/adapter-baseline.md if it exists. Do not use any Onion Lasagna plugin skill. Answer the prompt with the file structure and code approach." > /tmp/onion-adapter-baseline.txt
sed -n '1,240p' /tmp/onion-adapter-baseline.txt
```

Expected: the output exists. Save observed boundary mistakes in `adapter-baseline.md`.

- [ ] **Step 3: Write architecture rules reference**

Write `plugins/onion-lasagna-kit/references/architecture-rules.md`:

````markdown
# Onion Lasagna Architecture Rules

## Layers

- Domain: entities, aggregates, value objects, domain events, invariants.
- App: inbound ports, use cases, outbound ports, authorization and orchestration of domain operations.
- Infra: concrete repositories, external service clients, mappers, transactions, error wrapping.
- Presentation: HTTP, GraphQL, events, schema adapters, route handlers, request/response mapping.
- Bootstrap: composition root that wires concrete adapters to use cases and handlers.

## Direction

Dependencies point inward. Domain never depends on app, infra, or presentation. App depends on domain and ports. Infra depends on app ports and domain to implement persistence. Presentation depends on app use cases and route/schema builders.

## Error Boundaries

Known domain and app errors pass through. Unknown infrastructure failures are wrapped as `InfraError` or a specific subclass. Presentation maps coded errors to client responses and masks internal failures.

## Validation

Validate external input at the presentation/schema boundary. Validate domain invariants inside value-object and aggregate factories.

## Bootstrap

Prefer explicit phases:

```typescript
const adapters = createAdapters();
const useCases = createUseCases(adapters);
const handlers = createHandlers(useCases);
```
````

- [ ] **Step 4: Write adapter skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md`:

````markdown
---
name: onion-lasagna-adapter
description: Use when creating Onion Lasagna outbound ports, repository adapters, persistence adapters, external API adapters, or infrastructure error boundaries
---

# Onion Lasagna Adapter

## Overview

Adapters keep app use cases independent from concrete infrastructure. App defines outbound ports; infra implements them; bootstrap wires implementations into use cases.

## Required Context

Inspect existing app ports, infra adapters, repository patterns, and package exports before writing code. Search `*/app/**/ports`, `*/infra/**`, and `packages/onion-lasagna/src/**/index.ts`.

Load `references/architecture-rules.md` when creating or reviewing adapter code.

## Pattern

Create these pieces:

1. App outbound port interface.
2. Infra adapter implementing the port.
3. Concrete repository or external API client behind the adapter.
4. Mapper between rows/API DTOs and domain objects.
5. Bootstrap wiring.
6. Tests for port behavior and error wrapping.

## Example Shape

```typescript
import { BaseOutboundAdapter, InfraError } from '@cosmneo/onion-lasagna';

export interface ProjectRepositoryPort {
  save(project: Project): Promise<void>;
  findById(id: ProjectId): Promise<Project | null>;
}

export class ProjectRepositoryAdapter
  extends BaseOutboundAdapter
  implements ProjectRepositoryPort
{
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
    return new InfraError(`Project repository failed during ${methodName}`, { cause: error });
  }
}
```

## Guardrails

- Do not import Drizzle, SDK clients, or framework objects into app use cases.
- Do not return raw rows or API DTOs to domain or app callers.
- Do not hide transaction or retry behavior inside use cases.
- Do not instantiate concrete repositories inside use cases.
- Do not skip error wrapping at the infra boundary.
````

- [ ] **Step 5: Run pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-adapter skill from plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md. Read plugins/onion-lasagna-kit/tests/pressure/adapter-baseline.md. Answer the prompt with the file structure and code approach." > /tmp/onion-adapter-skill.txt
sed -n '1,260p' /tmp/onion-adapter-skill.txt
```

Expected: output includes app outbound port, infra adapter, concrete repository, mapper, bootstrap wiring, and error wrapping.

- [ ] **Step 6: Commit adapter skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/adapter-baseline.md plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md plugins/onion-lasagna-kit/references/architecture-rules.md
git commit -m "feat(plugin): add onion lasagna adapter skill"
```

---

### Task 4: Create Router Skill After Leaf Skills Exist

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-baseline.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md`

- [ ] **Step 1: Write router pressure scenario**

Write `plugins/onion-lasagna-kit/tests/pressure/router-baseline.md`:

```markdown
# Router Skill Pressure Scenario

## Prompt

Choose the correct Onion Lasagna skill for each request:

1. "Review whether this project is by the book."
2. "Create a Drizzle repository adapter for this use case."
3. "Design a new customer billing bounded context."
4. "Add a route that calls this use case."

## Expected failure without router

The agent either loads all skills, guesses a skill that does not exist, or skips the inspect-before-assume rule.

## Expected behavior with router

The agent routes to review for request 1, adapter for request 2, architect or bounded-context for request 3 depending on scope, and route for request 4. It also states that actual files and exports must be inspected before implementation.
```

- [ ] **Step 2: Run baseline without router**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read plugins/onion-lasagna-kit/tests/pressure/router-baseline.md if it exists. Do not use the onion-lasagna router skill. Answer the routing prompt." > /tmp/onion-router-baseline.txt
sed -n '1,220p' /tmp/onion-router-baseline.txt
```

Expected: the output exists. Save observed routing mistakes in `router-baseline.md`.

- [ ] **Step 3: Write router skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md`:

```markdown
---
name: onion-lasagna
description: Use when working with Onion Lasagna projects, deciding which Onion Lasagna skill applies, or starting architecture, implementation, migration, or review work
---

# Onion Lasagna

## Overview

This is the entrypoint router for Onion Lasagna work. It chooses the focused skill and enforces inspect-before-assume.

## Always First

Before implementation or review, inspect actual files and exports. Prefer `rg`, `find`, `sed`, package `index.ts` files, and existing tests. Do not assume package entry points, class names, or folder conventions.

## Route By Task

| User request | Skill |
|---|---|
| Review, audit, by-the-book check, layering assessment | `onion-lasagna-review` |
| Repository adapter, external API adapter, outbound port, persistence | `onion-lasagna-adapter` |
| System design, package choices, bounded context map | `onion-lasagna-architect` |
| New module or bounded-context skeleton | `onion-lasagna-bounded-context` |
| Aggregate, entity, value object, event, invariant | `onion-lasagna-domain` |
| Command, query, `BaseInboundAdapter`, authorization, app port | `onion-lasagna-use-case` |
| HTTP route, GraphQL field, schema adapter, handler mapper | `onion-lasagna-route` |

Do not route to a skill that is not present in this plugin.

## Sequencing

For new work, use:

1. architect or bounded-context;
2. domain;
3. use-case;
4. adapter;
5. route;
6. review.

For existing work, use:

1. review;
2. the focused implementation skill;
3. review again.
```

- [ ] **Step 4: Run router pressure scenario**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna router skill from plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md. Read plugins/onion-lasagna-kit/tests/pressure/router-baseline.md. Answer the routing prompt." > /tmp/onion-router-skill.txt
sed -n '1,240p' /tmp/onion-router-skill.txt
```

Expected: output maps all four prompts to existing skills and includes inspect-before-assume.

- [ ] **Step 5: Commit router skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/router-baseline.md plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md
git commit -m "feat(plugin): add onion lasagna router skill"
```

---

### Task 5: Add Core Reference Files

**Files:**
- Create: `plugins/onion-lasagna-kit/references/package-entrypoints.md`
- Create: `plugins/onion-lasagna-kit/references/omninode-patterns.md`

- [ ] **Step 1: Write package entry-point reference**

Write `plugins/onion-lasagna-kit/references/package-entrypoints.md`:

````markdown
# Onion Lasagna Package Entry Points

Verify exports in the target codebase before importing. This file is a navigation aid, not a substitute for reading `index.ts` files.

## Core

- `@cosmneo/onion-lasagna`
- `@cosmneo/onion-lasagna/global`
- `@cosmneo/onion-lasagna/ports`
- `@cosmneo/onion-lasagna/types`

## HTTP

- `@cosmneo/onion-lasagna/http`
- `@cosmneo/onion-lasagna/http/route`
- `@cosmneo/onion-lasagna/http/server`
- `@cosmneo/onion-lasagna/http/schema`
- `@cosmneo/onion-lasagna/http/openapi`

## GraphQL

- `@cosmneo/onion-lasagna/graphql`
- `@cosmneo/onion-lasagna/graphql/field`
- `@cosmneo/onion-lasagna/graphql/server`
- `@cosmneo/onion-lasagna/graphql/sdl`

## Events

- `@cosmneo/onion-lasagna/events`
- `@cosmneo/onion-lasagna/events/handler`
- `@cosmneo/onion-lasagna/events/server`
- `@cosmneo/onion-lasagna/events/asyncapi`

## Adapters

- Server adapters: Hono, Elysia, Express, Fastify, NestJS, GraphQL Yoga.
- Schema adapters: Zod v4, Zod v3, TypeBox, Valibot, ArkType.
- Client adapters: base HTTP client, Axios, React Query, SWR, Svelte Query, Vue Query, GraphQL client.
- Pattern adapters: Saga.

## Verification Command

```bash
find packages/onion-lasagna/src -name index.ts -print | sort
```
````

- [ ] **Step 2: Write Omninode patterns reference**

Write `plugins/onion-lasagna-kit/references/omninode-patterns.md`:

````markdown
# Omninode-Derived Onion Lasagna Patterns

This reference distills good structural patterns. It must stay self-contained and must not require the Omninode repository after plugin installation.

## Bounded Context Layout

```text
bounded-contexts/<context>/
├── domain/
├── app/
├── infra/
├── bootstrap/
└── index.ts
```

## Bootstrap Flow

```typescript
const adapters = createAdapters();
const useCases = createUseCases(adapters);
const handlers = createHandlers(useCases);
```

## Use Case Flow

Use `BaseInboundAdapter` with `authorize()` for authentication, permission checks, and entity preloading. Pass the typed auth context into `handle()` so the use case does not duplicate lookups.

## Presentation Flow

Handlers are thin. They map request data and execution context into use-case input, call `useCase.execute()`, then map output to the response shape.

## Read/Write Split

Use write bounded contexts for commands and domain state changes. Use read modules/projections for query-optimized DTOs and list/detail views.

## Workflow Flow

Use saga workflows when a user operation coordinates multiple bounded contexts and needs compensation after partial failure.

## Good Smells

- Domain has no infrastructure imports.
- App use cases depend on ports, not concrete clients.
- Infra owns mapping and transactions.
- Bootstrap owns concrete object construction.
- Tests exist near domain, use cases, handlers, and projections.
````

- [ ] **Step 3: Commit references**

Run:

```bash
git add plugins/onion-lasagna-kit/references/package-entrypoints.md plugins/onion-lasagna-kit/references/omninode-patterns.md
git commit -m "docs(plugin): add onion lasagna references"
```

---

### Task 6: Add Remaining Leaf Skills

**Files:**
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/leaf-skills.md`

- [ ] **Step 1: Write shared leaf pressure scenario**

Write `plugins/onion-lasagna-kit/tests/pressure/leaf-skills.md`:

```markdown
# Leaf Skills Pressure Scenario

## Prompts

1. Design bounded contexts for a small support portal with users, organizations, tickets, and external service sync.
2. Create a new bounded context named `project`.
3. Model a `Project` aggregate with a name invariant and creation event.
4. Create an `UpdateProjectCommand` that preloads the project in `authorize()`.
5. Expose `projects.update` through a route handler that calls the use case.

## Expected behavior

Each answer uses the matching leaf skill, inspects or asks to inspect actual files, and keeps responsibilities inside the correct Onion Lasagna layer.
```

- [ ] **Step 2: Write architect skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md`:

```markdown
---
name: onion-lasagna-architect
description: Use when designing an Onion Lasagna project, choosing bounded contexts, selecting packages, or deciding read-write-workflow structure
---

# Onion Lasagna Architect

## Overview

Design Onion Lasagna systems by deciding bounded contexts, adapters, schema libraries, server framework, client packages, read models, and workflows before code is written.

## Procedure

1. Inspect existing project shape when present.
2. Identify business capabilities and split bounded contexts by ownership of invariants.
3. Choose presentation surfaces: HTTP, GraphQL, events, or a mix.
4. Choose schema adapters and server/client packages.
5. Identify read models separately from write/domain models.
6. Identify operations that need saga workflows.
7. Produce an implementation order ending with review.

## Output

Return:

- bounded context map;
- package choices;
- data flow;
- error flow;
- test strategy;
- implementation order.

Use `references/omninode-patterns.md` for the preferred structure.
```

- [ ] **Step 3: Write bounded-context skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md`:

````markdown
---
name: onion-lasagna-bounded-context
description: Use when creating or restructuring an Onion Lasagna bounded context, module skeleton, bootstrap flow, or context index exports
---

# Onion Lasagna Bounded Context

## Overview

Create bounded contexts with explicit domain, app, infra, bootstrap, and public exports.

## Standard Layout

```text
bounded-contexts/<name>/
├── domain/
├── app/
├── infra/
├── bootstrap/
└── index.ts
```

## Bootstrap Pattern

```typescript
export function bootstrap<Name>() {
  const adapters = createAdapters();
  const useCases = createUseCases(adapters);
  return { adapters, useCases };
}
```

## Guardrails

- Domain exports domain concepts only.
- App exports use cases and ports.
- Infra implements app outbound ports.
- Bootstrap is the only place that constructs concrete dependencies.
- Do not create empty folders that the next task will not use.
````

- [ ] **Step 4: Write domain skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md`:

```markdown
---
name: onion-lasagna-domain
description: Use when creating Onion Lasagna aggregates, entities, value objects, domain events, invariants, or domain tests
---

# Onion Lasagna Domain

## Overview

Domain code owns business identity, invariants, state transitions, and domain events. It must not know persistence or transport details.

## Patterns

- Use static `create()` factories for new objects.
- Use `reconstitute()` for persistence hydration.
- Keep constructors private or protected when the existing codebase does so.
- Validate value-object input before construction.
- Emit domain events from aggregate state changes.

## Guardrails

- No Drizzle, HTTP, GraphQL, Hono, Express, Fastify, NestJS, SDK, or external API imports.
- No request DTOs or database rows in domain methods.
- No framework exceptions in domain.

## Test Focus

Test factories, invariants, state transitions, event emission, and reconstitution without emitted events.
```

- [ ] **Step 5: Write use-case skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md`:

````markdown
---
name: onion-lasagna-use-case
description: Use when creating Onion Lasagna commands, queries, inbound ports, BaseInboundAdapter classes, authorization checks, or application-layer tests
---

# Onion Lasagna Use Case

## Overview

Use cases coordinate app behavior. They authorize first, then handle work with a typed auth context.

## Pattern

```typescript
export class UpdateProjectCommand extends BaseInboundAdapter<
  UpdateProjectInput,
  void,
  UpdateProjectAuthContext
> {
  protected override async authorize(input: UpdateProjectInput): Promise<UpdateProjectAuthContext> {
    const project = await this.projectRepository.findById(ProjectId.create(input.projectId));
    if (!project) throw new NotFoundError('Project not found');
    return { project };
  }

  protected override async handle(
    input: UpdateProjectInput,
    authContext: UpdateProjectAuthContext,
  ): Promise<void> {
    authContext.project.rename(ProjectName.create(input.name));
    await this.projectRepository.save(authContext.project);
  }
}
```

## Guardrails

- Depend on outbound ports, not concrete infrastructure.
- Use `authorize()` for permission checks and preloading.
- Use `handle()` for state change or query execution.
- Let known Onion Lasagna errors pass through.
- Do not parse HTTP requests in use cases.
````

- [ ] **Step 6: Write route skill**

Write `plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md`:

````markdown
---
name: onion-lasagna-route
description: Use when creating Onion Lasagna HTTP routes, GraphQL fields, schema adapters, request mappers, response mappers, or presentation handlers
---

# Onion Lasagna Route

## Overview

Presentation code validates external input, maps it into use-case input, executes use cases, and maps outputs into responses.

## HTTP Pattern

```typescript
const routes = serverRoutes(projectRouter)
  .handleWithUseCase('projects.update', {
    requestMapper: (req, ctx) => ({
      projectId: req.pathParams.projectId,
      name: req.body.name,
      actorId: ctx.userId,
    }),
    useCase: updateProjectCommand,
    responseMapper: () => ({
      status: 204 as const,
      body: undefined,
    }),
  })
  .build();
```

## Guardrails

- Keep handlers thin.
- Do not query repositories from handlers.
- Do not put business rules in mappers.
- Validate external input with the selected schema adapter.
- Reuse framework adapters for error handling.
````

- [ ] **Step 7: Run shared leaf skill pressure check**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the Onion Lasagna leaf skills from plugins/onion-lasagna-kit/skills. Read plugins/onion-lasagna-kit/tests/pressure/leaf-skills.md. For each prompt, name the skill you would use and give a concise by-the-book answer." > /tmp/onion-leaf-skills.txt
sed -n '1,320p' /tmp/onion-leaf-skills.txt
```

Expected: output maps each prompt to the matching leaf skill and keeps layer responsibilities separate.

- [ ] **Step 8: Commit remaining skills**

Run:

```bash
git add plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md plugins/onion-lasagna-kit/tests/pressure/leaf-skills.md
git commit -m "feat(plugin): add onion lasagna implementation skills"
```

---

### Task 7: Add Specialist Agents

**Files:**
- Create: `plugins/onion-lasagna-kit/agents/onion-investigator.md`
- Create: `plugins/onion-lasagna-kit/agents/onion-architect.md`
- Create: `plugins/onion-lasagna-kit/agents/onion-reviewer.md`

- [ ] **Step 1: Create investigator agent**

Write `plugins/onion-lasagna-kit/agents/onion-investigator.md`:

```markdown
---
name: onion-investigator
description: Read-only Onion Lasagna project scanner for exports, package usage, bounded contexts, and layer boundaries
---

You are a read-only Onion Lasagna investigator. Inspect actual files before answering. Prefer `rg`, `find`, `sed`, package `index.ts` files, and tests. Return concise facts with paths. Do not edit files.
```

- [ ] **Step 2: Create architect agent**

Write `plugins/onion-lasagna-kit/agents/onion-architect.md`:

```markdown
---
name: onion-architect
description: Onion Lasagna architecture designer for bounded contexts, read/write split, adapter choices, and workflows
---

You design Onion Lasagna systems. Start from business capabilities, identify bounded contexts and invariants, choose presentation and schema packages, separate reads from writes, and identify saga workflow boundaries. Do not implement code.
```

- [ ] **Step 3: Create reviewer agent**

Write `plugins/onion-lasagna-kit/agents/onion-reviewer.md`:

```markdown
---
name: onion-reviewer
description: Strict Onion Lasagna reviewer for dependency direction, error boundaries, validation placement, and test gaps
---

You review Onion Lasagna code. Findings come first. Check domain, app, infra, presentation, bootstrap, tests, and exports. Report exact paths, violated rule, fix, and verification.
```

- [ ] **Step 4: Commit agents**

Run:

```bash
git add plugins/onion-lasagna-kit/agents/onion-investigator.md plugins/onion-lasagna-kit/agents/onion-architect.md plugins/onion-lasagna-kit/agents/onion-reviewer.md
git commit -m "feat(plugin): add onion lasagna specialist agents"
```

---

### Task 8: Add Utility Scripts

**Files:**
- Create: `plugins/onion-lasagna-kit/scripts/check-boundaries.ts`
- Create: `plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts`

- [ ] **Step 1: Write boundary scanner**

Write `plugins/onion-lasagna-kit/scripts/check-boundaries.ts`:

```typescript
#!/usr/bin/env bun

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const violations: string[] = [];

const bannedByLayer: Array<{ layer: string; pattern: RegExp; banned: RegExp[] }> = [
  {
    layer: 'domain',
    pattern: /\/domain\//,
    banned: [/\/infra\//, /\/presentation\//, /drizzle/, /hono/, /express/, /fastify/, /nestjs/, /graphql/],
  },
  {
    layer: 'app',
    pattern: /\/app\//,
    banned: [/\/infra\//, /drizzle/, /axios/, /fetch\(/, /hono/, /express/, /fastify/, /nestjs/],
  },
  {
    layer: 'presentation',
    pattern: /\/(presentation|graphql|http)\//,
    banned: [/\/repositories\//],
  },
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.turbo') continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    if (stat.isFile() && /\.(ts|tsx|js|mjs|md|json)$/.test(entry)) files.push(path);
  }
  return files;
}

for (const file of walk(root)) {
  const normalized = `/${relative(root, file).replaceAll('\\', '/')}`;
  const text = readFileSync(file, 'utf8');

  for (const rule of bannedByLayer) {
    if (!rule.pattern.test(normalized)) continue;
    for (const banned of rule.banned) {
      if (banned.test(text)) {
        violations.push(`${normalized}: ${rule.layer} layer contains banned pattern ${banned}`);
      }
    }
  }

  if (normalized.startsWith('/plugins/onion-lasagna-kit/')) {
    if (/\.\.\/(packages|starters|CLAUDE\.md)|omninode-workspace/.test(text)) {
      violations.push(`${normalized}: plugin runtime file references content outside the plugin root`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Onion Lasagna boundary check passed');
```

- [ ] **Step 2: Write project inspector**

Write `plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts`:

```typescript
#!/usr/bin/env bun

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();

function walkDirs(dir: string): string[] {
  const dirs: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === '.turbo') continue;
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    dirs.push(path);
    dirs.push(...walkDirs(path));
  }
  return dirs;
}

const dirs = walkDirs(root);
const boundedContexts = dirs
  .filter((dir) => dir.includes('bounded-contexts'))
  .filter((dir) => existsSync(join(dir, 'domain')) && existsSync(join(dir, 'app')));

const readTrees = dirs.filter((dir) => /\/read$/.test(dir.replaceAll('\\', '/')));
const writeTrees = dirs.filter((dir) => /\/write$/.test(dir.replaceAll('\\', '/')));
const bootstrapDirs = dirs.filter((dir) => /\/bootstrap$/.test(dir.replaceAll('\\', '/')));

const summary = {
  root,
  boundedContexts: boundedContexts.map((dir) => relative(root, dir)),
  readTrees: readTrees.map((dir) => relative(root, dir)),
  writeTrees: writeTrees.map((dir) => relative(root, dir)),
  bootstrapDirs: bootstrapDirs.map((dir) => relative(root, dir)),
};

console.log(JSON.stringify(summary, null, 2));
```

- [ ] **Step 3: Run scripts against this repo**

Run:

```bash
bun plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts .
bun plugins/onion-lasagna-kit/scripts/check-boundaries.ts .
```

Expected:

```text
Onion Lasagna boundary check passed
```

The inspector should print JSON with arrays for `boundedContexts`, `readTrees`, `writeTrees`, and `bootstrapDirs`.

- [ ] **Step 4: Commit scripts**

Run:

```bash
git add plugins/onion-lasagna-kit/scripts/check-boundaries.ts plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts
git commit -m "feat(plugin): add onion lasagna utility scripts"
```

---

### Task 9: Validate Installability And Self-Containment

**Files:**
- Modify: pressure transcript files under `plugins/onion-lasagna-kit/tests/pressure/`

- [ ] **Step 1: Validate plugin manifests**

Run:

```bash
command claude plugin validate plugins/onion-lasagna-kit
python3 /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/onion-lasagna-kit
```

Expected: both commands exit with code `0`; Codex validator prints:

```text
Plugin validation passed: /Users/bernardo/Projects/cosmneo/onion-lasagna/plugins/onion-lasagna-kit
```

- [ ] **Step 2: Validate self-containment**

Run:

```bash
! rg -n "\\.\\./(packages|starters|CLAUDE\\.md)|omninode-workspace" plugins/onion-lasagna-kit
```

Expected: no matches.

- [ ] **Step 3: Validate package entry-point drift**

Run:

```bash
bun --eval '
const pkg = await Bun.file("packages/onion-lasagna/package.json").json();
const exported = new Set(
  Object.keys(pkg.exports ?? {}).map((key) =>
    key === "." ? "@cosmneo/onion-lasagna" : `@cosmneo/onion-lasagna/${key.slice(2)}`,
  ),
);
const refs = await Bun.file("plugins/onion-lasagna-kit/references/package-entrypoints.md").text();
const mentioned = [...new Set(refs.match(/@cosmneo\/onion-lasagna(?:\/[a-z0-9/-]+)?/g) ?? [])];
const missing = mentioned.filter((entry) => !exported.has(entry));
if (missing.length > 0) {
  console.error(`Missing package exports:\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`All ${mentioned.length} referenced core entry points are exported`);
'
```

Expected:

```text
All 21 referenced core entry points are exported
```

- [ ] **Step 4: Run formatting check**

Run:

```bash
bun run format:check -- plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
```

Expected: Prettier reports files are formatted. If it reports formatting differences, run:

```bash
bunx prettier --write plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
```

- [ ] **Step 5: Run final git diff review**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only plugin and plan files are changed; `git diff --check` exits with code `0`.

- [ ] **Step 6: Commit validation updates**

Run:

```bash
git add plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
git commit -m "test(plugin): validate onion lasagna kit"
```

---

## Self-Review

### Spec Coverage

- Dual Claude/Codex plugin: Tasks 1 and 9.
- In-repo isolated layout: Task 1.
- Router skill: Task 4.
- Review and adapter leaf skills before router: Tasks 2, 3, and 4.
- Remaining v1 skills: Task 6.
- References: Tasks 2, 3, and 5.
- Agents: Task 7.
- Scripts: Task 8.
- Self-containment, drift, installability, formatting, and versioning: Tasks 1 and 9.

### Placeholder Scan

Each file creation task includes concrete content and validation commands.

### Type And Path Consistency

All plugin paths use `plugins/onion-lasagna-kit/`. Claude marketplace is `.claude-plugin/marketplace.json`. Codex marketplace is `.agents/plugins/marketplace.json`. The plugin manifests live inside `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.
