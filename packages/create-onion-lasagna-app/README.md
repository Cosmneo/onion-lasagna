# create-onion-lasagna-app

Scaffold new onion-lasagna projects with a single command.

```bash
bunx create-onion-lasagna-app my-app
```

## Quick Start

```bash
# Interactive mode (recommended)
bunx create-onion-lasagna-app

# With project name
bunx create-onion-lasagna-app my-app

# Skip prompts with defaults
bunx create-onion-lasagna-app my-app --yes

# Full customization
bunx create-onion-lasagna-app my-app -s modules -v zod -f hono
```

## How It Works

```mermaid
flowchart LR
    A[Run CLI] --> B{Interactive?}
    B -->|Yes| C[Prompt Options]
    B -->|No| D[Use Flags/Defaults]
    C --> E[Clone Starter]
    D --> E
    E --> F[Inject Dependencies]
    F --> G[Create Config]
    G --> H{Install?}
    H -->|Yes| I[bun install]
    H -->|No| J[Done]
    I --> J
```

## Options

| Flag | Alias | Description | Values |
|------|-------|-------------|--------|
| `--starter` | `-s` | Project structure | `simple`, `modules` |
| `--validator` | `-v` | Validation library | `zod`, `valibot`, `arktype`, `typebox` |
| `--framework` | `-f` | Web framework | `hono`, `elysia`, `fastify` |
| `--yes` | `-y` | Skip prompts, use defaults | - |
| `--no-install` | - | Skip dependency installation | - |
| `--help` | `-h` | Show help | - |

## Starters

### Simple (default)

Flat structure for small to medium projects.

```
my-app/
├── packages/
│   └── backend/
│       ├── bounded-contexts/
│       │   └── example/
│       ├── orchestrations/
│       └── shared/
├── .onion-lasagna.json
└── package.json
```

### Modules

Module-based structure for large enterprise projects.

```
my-app/
├── packages/
│   ├── backend-modules/
│   │   ├── user-management/
│   │   ├── billing/
│   │   └── notifications/
│   └── backend-orchestrations/
├── .onion-lasagna.json
└── package.json
```

## Validators

```mermaid
graph TD
    subgraph Validators
        Z[Zod] -->|Most Popular| V[Validation]
        VB[Valibot] -->|Smallest Bundle| V
        A[ArkType] -->|Fastest Runtime| V
        T[TypeBox] -->|JSON Schema| V
    end
```

| Library | Best For |
|---------|----------|
| **Zod** | TypeScript-first, great inference, large ecosystem |
| **Valibot** | Bundle size critical apps, tree-shakeable |
| **ArkType** | Performance critical, complex schemas |
| **TypeBox** | JSON Schema compatibility, OpenAPI |

## Frameworks

| Framework | Runtime | Best For |
|-----------|---------|----------|
| **Hono** | Any (Node, Bun, Deno, Edge) | Universal deployment |
| **Elysia** | Bun | Maximum performance, end-to-end type safety |
| **Fastify** | Node | Enterprise, large plugin ecosystem |

## Generated Files

After scaffolding, you'll find:

| File | Purpose |
|------|---------|
| `.onion-lasagna.json` | Project configuration (starter, validator, framework) |
| `packages/backend/.env` | Environment variables |
| `packages/backend/.env.example` | Environment template |

## Examples

```bash
# Minimal API with Hono + Zod
bunx create-onion-lasagna-app api -s simple -v zod -f hono -y

# Enterprise monolith with Fastify + Valibot
bunx create-onion-lasagna-app platform -s modules -v valibot -f fastify

# High-performance Bun app with Elysia + ArkType
bunx create-onion-lasagna-app service -s simple -v arktype -f elysia -y

# Quick prototype (all defaults)
bunx create-onion-lasagna-app prototype --yes
```

## After Scaffolding

```bash
cd my-app
bun run dev    # Start development server
bun run build  # Build for production
bun run test   # Run tests
```

## Configuration

The `.onion-lasagna.json` file stores your project settings:

```json
{
  "starter": "simple",
  "validator": "zod",
  "framework": "hono",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

This config is used by `onion-lasagna-cli` for code generation.
