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
- Create `plugins/onion-lasagna-kit/tests/pressure/*-prompt.md`: prompts shown to test agents.
- Create `plugins/onion-lasagna-kit/tests/pressure/*-expected.md`: answer keys kept away from test agents.
- Create `plugins/onion-lasagna-kit/tests/pressure/*-observed.md`: captured baseline and GREEN notes.

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
if command -v claude >/dev/null 2>&1; then
  command claude plugin validate plugins/onion-lasagna-kit
else
  echo "SKIP: claude CLI not found"
fi

if [ -f /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py ]; then
  python3 /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/onion-lasagna-kit
else
  echo "SKIP: Codex plugin validator not found"
fi
```

Expected:

```text
Plugin validation passed: /Users/bernardo/Projects/cosmneo/onion-lasagna/plugins/onion-lasagna-kit
```

The Claude command should exit with code `0`. Its text may include an inventory or validation summary.
Skipped validators are acceptable only when the relevant local tooling is unavailable.

- [ ] **Step 7: Commit scaffold**

Run:

```bash
git add .claude-plugin/marketplace.json .agents/plugins/marketplace.json plugins/onion-lasagna-kit/.claude-plugin/plugin.json plugins/onion-lasagna-kit/.codex-plugin/plugin.json
git commit -m "feat(plugin): scaffold onion lasagna kit"
```

---

### Task 2: Create Review Skill With Pressure Scenario

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/review-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/review-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/review-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md`
- Create: `plugins/onion-lasagna-kit/references/layer-checklist.md`

- [ ] **Step 1: Write the review pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/review-prompt.md`:

```markdown
# Review Skill Pressure Scenario

Review an Onion Lasagna project quickly. The user says it is "basically by the book" and wants only the good parts. You find:

- a domain aggregate importing a Drizzle schema;
- an app use case importing a concrete HTTP client directly;
- a GraphQL handler querying a repository directly;
- a repository adapter that wraps only some methods in `BaseOutboundAdapter`;
- no use-case tests.

Return the review.
```

- [ ] **Step 2: Write the review expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/review-expected.md`:

```markdown
# Review Skill Expected Behavior

## RED Failure Signal

The agent gives a general positive summary, misses one or more boundary violations, or treats direct infra imports as an acceptable shortcut.

## GREEN Success Signal

The agent reports findings first, names the violated layer rule, points to the file pattern, recommends the Onion Lasagna correction, and lists verification commands.
```

- [ ] **Step 3: Run a baseline consult without the skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/review-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the pressure prompt as a code reviewer." > /tmp/onion-review-baseline.txt
sed -n '1,220p' /tmp/onion-review-baseline.txt
```

Expected: the output exists. Write the observed misses to `plugins/onion-lasagna-kit/tests/pressure/review-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write the review checklist reference**

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

- [ ] **Step 5: Write the review skill**

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

- [ ] **Step 6: Run the pressure scenario with the skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-review skill from plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/review-prompt.md. Do not read any *-expected.md file. Answer the pressure prompt as a code reviewer." > /tmp/onion-review-skill.txt
sed -n '1,260p' /tmp/onion-review-skill.txt
```

Expected: output contains a `Findings` section and calls out all four boundary/wrapping violations from the pressure prompt.
Append the GREEN result summary to `plugins/onion-lasagna-kit/tests/pressure/review-observed.md` under a `## GREEN Observed` heading.

- [ ] **Step 7: Commit review skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/review-prompt.md plugins/onion-lasagna-kit/tests/pressure/review-expected.md plugins/onion-lasagna-kit/tests/pressure/review-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-review/SKILL.md plugins/onion-lasagna-kit/references/layer-checklist.md
git commit -m "feat(plugin): add onion lasagna review skill"
```

---

### Task 3: Create Adapter Skill With Pressure Scenario

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/adapter-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/adapter-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/adapter-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md`
- Create: `plugins/onion-lasagna-kit/references/architecture-rules.md`

- [ ] **Step 1: Write the adapter pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/adapter-prompt.md`:

```markdown
# Adapter Skill Pressure Scenario

Create the persistence side for an Onion Lasagna use case named `CreateProjectCommand`. The domain has `Project`, `ProjectId`, and `ProjectName`. The app layer needs a `ProjectRepositoryPort` with `save(project)` and `findById(id)`. The concrete persistence is Drizzle.
```

- [ ] **Step 2: Write the adapter expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/adapter-expected.md`:

```markdown
# Adapter Skill Expected Behavior

## RED Failure Signal

The agent imports Drizzle directly into the use case, returns raw rows to the app layer, skips an outbound port, or forgets error wrapping.

## GREEN Success Signal

The agent creates an outbound port in app, an infra repository adapter implementing the port, a Drizzle mapper/repository behind the adapter, and wraps infrastructure failures as `InfraError` or a specific subclass.
```

- [ ] **Step 3: Run baseline without skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/adapter-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt with the file structure and code approach." > /tmp/onion-adapter-baseline.txt
sed -n '1,240p' /tmp/onion-adapter-baseline.txt
```

Expected: the output exists. Save observed boundary mistakes in `plugins/onion-lasagna-kit/tests/pressure/adapter-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write architecture rules reference**

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

- [ ] **Step 5: Write adapter skill**

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

- [ ] **Step 6: Run pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-adapter skill from plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/adapter-prompt.md. Do not read any *-expected.md file. Answer the prompt with the file structure and code approach." > /tmp/onion-adapter-skill.txt
sed -n '1,260p' /tmp/onion-adapter-skill.txt
```

Expected: output includes app outbound port, infra adapter, concrete repository, mapper, bootstrap wiring, and error wrapping.
Append the GREEN result summary to `plugins/onion-lasagna-kit/tests/pressure/adapter-observed.md` under a `## GREEN Observed` heading.

- [ ] **Step 7: Commit adapter skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/adapter-prompt.md plugins/onion-lasagna-kit/tests/pressure/adapter-expected.md plugins/onion-lasagna-kit/tests/pressure/adapter-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-adapter/SKILL.md plugins/onion-lasagna-kit/references/architecture-rules.md
git commit -m "feat(plugin): add onion lasagna adapter skill"
```

---

### Task 4: Create Router Skill After Leaf Skills Exist

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md`

- [ ] **Step 1: Write router pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/router-prompt.md`:

```markdown
# Router Skill Pressure Scenario

Choose the correct Onion Lasagna skill for each request:

1. "Review whether this project is by the book."
2. "Create a Drizzle repository adapter for this use case."
```

- [ ] **Step 2: Write router expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/router-expected.md`:

```markdown
# Router Skill Expected Behavior

## RED Failure Signal

The agent either loads all skills, guesses a skill that does not exist, or skips the inspect-before-assume rule.

## GREEN Success Signal

The agent routes to `onion-lasagna-review` for request 1 and `onion-lasagna-adapter` for request 2. It also states that actual files and exports must be inspected before implementation.
```

- [ ] **Step 3: Run baseline without router**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/router-prompt.md. Do not read any *-expected.md file. Do not use the onion-lasagna router skill. Answer the routing prompt." > /tmp/onion-router-baseline.txt
sed -n '1,220p' /tmp/onion-router-baseline.txt
```

Expected: the output exists. Save observed routing mistakes in `plugins/onion-lasagna-kit/tests/pressure/router-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write router skill**

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

Do not route to a skill that is not present in this plugin.

## Sequencing

For new work, use:

1. adapter when outbound infrastructure is needed;
2. review when checking existing structure.

For existing work, use:

1. review;
2. the focused implementation skill;
3. review again.
```

- [ ] **Step 5: Run router pressure scenario**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna router skill from plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/router-prompt.md. Do not read any *-expected.md file. Answer the routing prompt." > /tmp/onion-router-skill.txt
sed -n '1,240p' /tmp/onion-router-skill.txt
```

Expected: output maps both prompts to existing skills and includes inspect-before-assume.
Append the GREEN result summary to `plugins/onion-lasagna-kit/tests/pressure/router-observed.md` under a `## GREEN Observed` heading.

- [ ] **Step 6: Commit router skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/router-prompt.md plugins/onion-lasagna-kit/tests/pressure/router-expected.md plugins/onion-lasagna-kit/tests/pressure/router-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md
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
- `@cosmneo/onion-lasagna/http/schema/types`
- `@cosmneo/onion-lasagna/http/shared`
- `@cosmneo/onion-lasagna/http/openapi`

## GraphQL

- `@cosmneo/onion-lasagna/graphql`
- `@cosmneo/onion-lasagna/graphql/field`
- `@cosmneo/onion-lasagna/graphql/server`
- `@cosmneo/onion-lasagna/graphql/shared`
- `@cosmneo/onion-lasagna/graphql/sdl`

## Events

- `@cosmneo/onion-lasagna/events`
- `@cosmneo/onion-lasagna/events/handler`
- `@cosmneo/onion-lasagna/events/server`
- `@cosmneo/onion-lasagna/events/shared`
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

### Task 6: Add Architect Skill

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/architect-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/architect-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/architect-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md`

- [ ] **Step 1: Write architect pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/architect-prompt.md`:

```markdown
# Architect Skill Pressure Scenario

Design bounded contexts for a small support portal with users, organizations, tickets, and external service sync. Choose Onion Lasagna packages and explain read/write/workflow boundaries.
```

- [ ] **Step 2: Write architect expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/architect-expected.md`:

```markdown
# Architect Skill Expected Behavior

## RED Failure Signal

The agent jumps straight to files or routes without naming bounded contexts, package choices, read/write split, workflow boundaries, or verification.

## GREEN Success Signal

The agent proposes bounded contexts, package choices, data flow, error flow, read/write split, saga candidates, and implementation order.
```

- [ ] **Step 3: Run baseline without architect skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/architect-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt." > /tmp/onion-architect-baseline.txt
sed -n '1,260p' /tmp/onion-architect-baseline.txt
```

Expected: output exists. Save observed misses in `plugins/onion-lasagna-kit/tests/pressure/architect-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write architect skill**

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

- [ ] **Step 5: Run architect pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-architect skill from plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/architect-prompt.md. Do not read any *-expected.md file. Answer the prompt." > /tmp/onion-architect-skill.txt
sed -n '1,320p' /tmp/onion-architect-skill.txt
```

Expected: output includes bounded context map, package choices, data flow, error flow, read/write/workflow boundaries, and implementation order. Append the GREEN summary to `architect-observed.md`.

- [ ] **Step 6: Commit architect skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/architect-prompt.md plugins/onion-lasagna-kit/tests/pressure/architect-expected.md plugins/onion-lasagna-kit/tests/pressure/architect-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-architect/SKILL.md
git commit -m "feat(plugin): add onion lasagna architect skill"
```

---

### Task 7: Add Bounded Context Skill

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/bounded-context-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/bounded-context-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/bounded-context-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md`

- [ ] **Step 1: Write bounded-context pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/bounded-context-prompt.md`:

```markdown
# Bounded Context Skill Pressure Scenario

Create a new Onion Lasagna bounded context named `project` in an existing backend package. Include the folders, public exports, and bootstrap flow.
```

- [ ] **Step 2: Write bounded-context expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/bounded-context-expected.md`:

```markdown
# Bounded Context Skill Expected Behavior

## RED Failure Signal

The agent creates arbitrary folders, skips bootstrap, exposes concrete infra directly, or creates empty unused folders.

## GREEN Success Signal

The agent uses domain/app/infra/bootstrap/index structure, names bootstrap phases, keeps exports layered, and says to inspect existing patterns first.
```

- [ ] **Step 3: Run baseline without bounded-context skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/bounded-context-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt." > /tmp/onion-bounded-context-baseline.txt
sed -n '1,260p' /tmp/onion-bounded-context-baseline.txt
```

Expected: output exists. Save observed misses in `plugins/onion-lasagna-kit/tests/pressure/bounded-context-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write bounded-context skill**

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

- [ ] **Step 5: Run bounded-context pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-bounded-context skill from plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/bounded-context-prompt.md. Do not read any *-expected.md file. Answer the prompt." > /tmp/onion-bounded-context-skill.txt
sed -n '1,320p' /tmp/onion-bounded-context-skill.txt
```

Expected: output includes the bounded context folder shape, bootstrap phases, layered exports, and inspect-first guidance. Append the GREEN summary to `bounded-context-observed.md`.

- [ ] **Step 6: Commit bounded-context skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/bounded-context-prompt.md plugins/onion-lasagna-kit/tests/pressure/bounded-context-expected.md plugins/onion-lasagna-kit/tests/pressure/bounded-context-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-bounded-context/SKILL.md
git commit -m "feat(plugin): add onion lasagna bounded context skill"
```

---

### Task 8: Add Domain Skill

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/domain-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/domain-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/domain-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md`

- [ ] **Step 1: Write domain pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/domain-prompt.md`:

```markdown
# Domain Skill Pressure Scenario

Model a `Project` aggregate with a name invariant and a creation event. Include value-object guidance and tests.
```

- [ ] **Step 2: Write domain expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/domain-expected.md`:

```markdown
# Domain Skill Expected Behavior

## RED Failure Signal

The agent includes persistence or request DTOs in domain, skips factories, or omits invariant/event tests.

## GREEN Success Signal

The agent keeps domain pure, uses factory/reconstitution patterns, validates invariants in value objects or aggregate factories, emits events, and names tests.
```

- [ ] **Step 3: Run baseline without domain skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/domain-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt." > /tmp/onion-domain-baseline.txt
sed -n '1,260p' /tmp/onion-domain-baseline.txt
```

Expected: output exists. Save observed misses in `plugins/onion-lasagna-kit/tests/pressure/domain-observed.md` under a `## RED Observed` heading.

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

- [ ] **Step 5: Run domain pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-domain skill from plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/domain-prompt.md. Do not read any *-expected.md file. Answer the prompt." > /tmp/onion-domain-skill.txt
sed -n '1,320p' /tmp/onion-domain-skill.txt
```

Expected: output keeps domain pure and includes factories, reconstitution, invariant validation, event emission, and test focus. Append the GREEN summary to `domain-observed.md`.

- [ ] **Step 6: Commit domain skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/domain-prompt.md plugins/onion-lasagna-kit/tests/pressure/domain-expected.md plugins/onion-lasagna-kit/tests/pressure/domain-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-domain/SKILL.md
git commit -m "feat(plugin): add onion lasagna domain skill"
```

---

### Task 9: Add Use Case Skill

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/use-case-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/use-case-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/use-case-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md`

- [ ] **Step 1: Write use-case pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/use-case-prompt.md`:

```markdown
# Use Case Skill Pressure Scenario

Create an `UpdateProjectCommand` that preloads the project in `authorize()`, checks permissions, renames it, and saves through an outbound port.
```

- [ ] **Step 2: Write use-case expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/use-case-expected.md`:

```markdown
# Use Case Skill Expected Behavior

## RED Failure Signal

The agent puts permission checks in the handler, imports concrete infra, duplicates repository lookups, or skips use-case tests.

## GREEN Success Signal

The agent uses `BaseInboundAdapter`, `authorize()` for checks and preload, `handle()` for state change, outbound ports, and focused tests.
```

- [ ] **Step 3: Run baseline without use-case skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/use-case-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt." > /tmp/onion-use-case-baseline.txt
sed -n '1,260p' /tmp/onion-use-case-baseline.txt
```

Expected: output exists. Save observed misses in `plugins/onion-lasagna-kit/tests/pressure/use-case-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write use-case skill**

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

- [ ] **Step 5: Run use-case pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-use-case skill from plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/use-case-prompt.md. Do not read any *-expected.md file. Answer the prompt." > /tmp/onion-use-case-skill.txt
sed -n '1,320p' /tmp/onion-use-case-skill.txt
```

Expected: output includes `BaseInboundAdapter`, typed auth context, `authorize()` preload, `handle()` state change, outbound port dependency, and tests. Append the GREEN summary to `use-case-observed.md`.

- [ ] **Step 6: Commit use-case skill**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/use-case-prompt.md plugins/onion-lasagna-kit/tests/pressure/use-case-expected.md plugins/onion-lasagna-kit/tests/pressure/use-case-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-use-case/SKILL.md
git commit -m "feat(plugin): add onion lasagna use case skill"
```

---

### Task 10: Add Route Skill And Expand Router

**Files:**
- Create: `plugins/onion-lasagna-kit/tests/pressure/route-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/route-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/route-observed.md`
- Create: `plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md`
- Modify: `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-expanded-prompt.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-expanded-expected.md`
- Create: `plugins/onion-lasagna-kit/tests/pressure/router-expanded-observed.md`

- [ ] **Step 1: Write route pressure prompt**

Write `plugins/onion-lasagna-kit/tests/pressure/route-prompt.md`:

```markdown
# Route Skill Pressure Scenario

Expose `projects.update` through a route handler that validates input, maps request and context into an `UpdateProjectCommand`, and maps the output to a response.
```

- [ ] **Step 2: Write route expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/route-expected.md`:

```markdown
# Route Skill Expected Behavior

## RED Failure Signal

The agent puts business logic in the handler, calls a repository directly, skips schema validation, or omits request/response mappers.

## GREEN Success Signal

The agent keeps the handler thin, uses route builders, schema adapters, request mapper, use case execution, response mapper, and framework error handling.
```

- [ ] **Step 3: Run baseline without route skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Read only plugins/onion-lasagna-kit/tests/pressure/route-prompt.md. Do not read any *-expected.md file. Do not use any Onion Lasagna plugin skill. Answer the prompt." > /tmp/onion-route-baseline.txt
sed -n '1,260p' /tmp/onion-route-baseline.txt
```

Expected: output exists. Save observed misses in `plugins/onion-lasagna-kit/tests/pressure/route-observed.md` under a `## RED Observed` heading.

- [ ] **Step 4: Write route skill**

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

- [ ] **Step 5: Run route pressure scenario with skill**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna-route skill from plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/route-prompt.md. Do not read any *-expected.md file. Answer the prompt." > /tmp/onion-route-skill.txt
sed -n '1,320p' /tmp/onion-route-skill.txt
```

Expected: output includes a thin handler, schema adapter, request mapper, use case execution, response mapper, and error-handler delegation. Append the GREEN summary to `route-observed.md`.

- [ ] **Step 6: Expand the router skill**

Modify `plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md` by adding these rows to `Route By Task`:

```markdown
| System design, package choices, bounded context map | `onion-lasagna-architect` |
| New module or bounded-context skeleton | `onion-lasagna-bounded-context` |
| Aggregate, entity, value object, event, invariant | `onion-lasagna-domain` |
| Command, query, `BaseInboundAdapter`, authorization, app port | `onion-lasagna-use-case` |
| HTTP route, GraphQL field, schema adapter, handler mapper | `onion-lasagna-route` |
```

Modify the `Sequencing` section to:

```markdown
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

- [ ] **Step 7: Write expanded router prompt and expected-answer key**

Write `plugins/onion-lasagna-kit/tests/pressure/router-expanded-prompt.md`:

```markdown
# Expanded Router Pressure Scenario

Choose the correct Onion Lasagna skill for each request:

1. "Design a new customer billing bounded context."
2. "Create a new project aggregate."
3. "Add an UpdateProjectCommand."
4. "Add a route that calls this use case."
```

Write `plugins/onion-lasagna-kit/tests/pressure/router-expanded-expected.md`:

```markdown
# Expanded Router Expected Behavior

The agent routes to architect or bounded-context for request 1 based on scope, domain for request 2, use-case for request 3, and route for request 4. It must mention inspect-before-assume.
```

- [ ] **Step 8: Run expanded router pressure scenario**

Run:

```bash
codex exec --sandbox read-only -C /Users/bernardo/Projects/cosmneo/onion-lasagna "Load the onion-lasagna router skill from plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md. Read only plugins/onion-lasagna-kit/tests/pressure/router-expanded-prompt.md. Do not read any *-expected.md file. Answer the routing prompt." > /tmp/onion-router-expanded-skill.txt
sed -n '1,260p' /tmp/onion-router-expanded-skill.txt
```

Expected: output maps all four prompts to existing skills and includes inspect-before-assume. Save the result summary in `plugins/onion-lasagna-kit/tests/pressure/router-expanded-observed.md`.

- [ ] **Step 9: Commit route skill and router expansion**

Run:

```bash
git add plugins/onion-lasagna-kit/tests/pressure/route-prompt.md plugins/onion-lasagna-kit/tests/pressure/route-expected.md plugins/onion-lasagna-kit/tests/pressure/route-observed.md plugins/onion-lasagna-kit/tests/pressure/router-expanded-prompt.md plugins/onion-lasagna-kit/tests/pressure/router-expanded-expected.md plugins/onion-lasagna-kit/tests/pressure/router-expanded-observed.md plugins/onion-lasagna-kit/skills/onion-lasagna-route/SKILL.md plugins/onion-lasagna-kit/skills/onion-lasagna/SKILL.md
git commit -m "feat(plugin): add onion lasagna route skill"
```

---

### Task 11: Add Specialist Agents

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

### Task 12: Add Utility Scripts

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
const externalPathTokens = ['..' + '/packages', '..' + '/starters', '..' + '/CLAUDE.md', 'omninode' + '-workspace'];

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
  const importText = text
    .split('\n')
    .filter((line) => /^\s*import\b|^\s*export\b.*\bfrom\b|require\(/.test(line))
    .join('\n');

  for (const rule of bannedByLayer) {
    if (!rule.pattern.test(normalized)) continue;
    for (const banned of rule.banned) {
      if (banned.test(importText)) {
        violations.push(`${normalized}: ${rule.layer} layer contains banned pattern ${banned}`);
      }
    }
  }

  if (normalized.startsWith('/plugins/onion-lasagna-kit/')) {
    if (externalPathTokens.some((token) => text.includes(token))) {
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

- [ ] **Step 3: Run script smoke tests**

Run:

```bash
bun plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts .
bun plugins/onion-lasagna-kit/scripts/check-boundaries.ts plugins/onion-lasagna-kit
```

Expected:

```text
Onion Lasagna boundary check passed
```

The inspector should print JSON with arrays for `boundedContexts`, `readTrees`, `writeTrees`, and `bootstrapDirs`.
The boundary scanner is intentionally scoped to the plugin root for this smoke test; full-project boundary audits should be run on a fixture or target app after tuning the rules for that project's import style.

- [ ] **Step 4: Commit scripts**

Run:

```bash
git add plugins/onion-lasagna-kit/scripts/check-boundaries.ts plugins/onion-lasagna-kit/scripts/inspect-onion-project.ts
git commit -m "feat(plugin): add onion lasagna utility scripts"
```

---

### Task 13: Validate Installability And Self-Containment

**Files:**
- Modify: pressure transcript files under `plugins/onion-lasagna-kit/tests/pressure/`

- [ ] **Step 1: Validate plugin manifests**

Run:

```bash
if command -v claude >/dev/null 2>&1; then
  command claude plugin validate plugins/onion-lasagna-kit
else
  echo "SKIP: claude CLI not found"
fi

if [ -f /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py ]; then
  python3 /Users/bernardo/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/onion-lasagna-kit
else
  echo "SKIP: Codex plugin validator not found"
fi
```

Expected: available validators exit with code `0`. If the Codex validator is available, it prints:

```text
Plugin validation passed: /Users/bernardo/Projects/cosmneo/onion-lasagna/plugins/onion-lasagna-kit
```

- [ ] **Step 2: Validate self-containment**

Run:

```bash
! rg -n "\\.\\./(packages|starters|CLAUDE\\.md)|omninode-workspace" plugins/onion-lasagna-kit
```

Expected: no matches.

- [ ] **Step 3: Run local install smoke tests**

Run:

```bash
if command -v claude >/dev/null 2>&1; then
  command claude plugin marketplace add . --scope local --sparse .claude-plugin plugins
  command claude plugin install onion-lasagna-kit@onion-lasagna --scope local
  command claude plugin list | rg "onion-lasagna-kit"
  command claude plugin uninstall onion-lasagna-kit --scope local || true
  command claude plugin marketplace remove onion-lasagna || true
else
  echo "SKIP: claude CLI not found"
fi

if command -v codex >/dev/null 2>&1; then
  codex plugin marketplace add .
  codex plugin list | rg "onion-lasagna-kit"
  codex plugin add onion-lasagna-kit@onion-lasagna
  codex plugin remove onion-lasagna-kit@onion-lasagna || true
  codex plugin marketplace remove onion-lasagna || true
else
  echo "SKIP: codex CLI not found"
fi
```

Expected: available plugin managers can add the marketplace, discover `onion-lasagna-kit`, install it, and remove it. Cleanup commands may print "not found" if a previous install step failed; that is acceptable only after the original failure is inspected.

- [ ] **Step 4: Validate package entry-point drift**

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

- [ ] **Step 5: Run formatting check**

Run:

```bash
bunx prettier --check plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
```

Expected: Prettier reports files are formatted. If it reports formatting differences, run:

```bash
bunx prettier --write plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
```

- [ ] **Step 6: Run final git diff review**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only plugin and plan files are changed; `git diff --check` exits with code `0`.

- [ ] **Step 7: Commit validation updates**

Run:

```bash
git add plugins/onion-lasagna-kit docs/superpowers/plans/2026-06-08-onion-lasagna-kit-plugin.md
git commit -m "test(plugin): validate onion lasagna kit"
```

---

## Self-Review

### Spec Coverage

- Dual Claude/Codex plugin: Tasks 1 and 13.
- In-repo isolated layout: Task 1.
- Router skill: Task 4.
- Review and adapter leaf skills before router: Tasks 2, 3, and 4.
- Remaining v1 skills: Tasks 6 through 10.
- References: Tasks 2, 3, and 5.
- Agents: Task 11.
- Scripts: Task 12.
- Self-containment, drift, installability, formatting, and versioning: Tasks 1 and 13.

### Placeholder Scan

Each file creation task includes concrete content and validation commands.

### Type And Path Consistency

All plugin paths use `plugins/onion-lasagna-kit/`. Claude marketplace is `.claude-plugin/marketplace.json`. Codex marketplace is `.agents/plugins/marketplace.json`. The plugin manifests live inside `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.
