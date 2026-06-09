---
name: onion-lasagna-bounded-context
description: Use when creating or restructuring an Onion Lasagna bounded context, bounded-context skeleton, bootstrap flow, or context index exports
---

# Onion Lasagna Bounded Context

## Overview

Create bounded contexts with explicit domain, app, infra, presentation, bootstrap, and public exports.

## Always First

Inspect existing bounded contexts, module roots, package exports, and tests before creating files. Match local naming and bootstrap patterns instead of inventing a new convention.

## Standard Layout

```text
bounded-contexts/<name>/
|-- domain/
|-- app/
|-- infra/
|-- presentation/
|   |-- bootstrap/
|   |   `-- index.ts
|   `-- http/
`-- index.ts
```

## Bootstrap Pattern

```typescript
export function bootstrap<Name>() {
  const adapters = createAdapters();
  const useCases = createUseCases(adapters);
  return { adapters, useCases };
}
```

## Public Exports

- Context `index.ts` exports domain and app contracts.
- Export bootstrap factories when the composition root needs them.
- Do not export concrete infra classes as public API unless an existing package convention requires it.

## Guardrails

- Domain exports domain concepts only.
- App exports use cases and ports.
- Infra implements app outbound ports.
- Presentation contains transport handlers and the bootstrap composition root.
- Bootstrap is the only place that constructs concrete dependencies.
- Do not create empty folders that the next task will not use.
