# Onion Lasagna Starters

Turborepo-based starter templates for building backend applications with onion architecture.

## Quick Start

```bash
# Simple backend (flat structure)
npx degit Cosmneo/onion-lasagna/starters/simple-starter my-project

# Module-based backend (for complex systems)
npx degit Cosmneo/onion-lasagna/starters/modules-starter my-project
```

## Starters

### simple-starter
Flat structure for smaller systems, microservices, and simple APIs.

```
packages/backend/
├── bounded-contexts/
├── orchestrations/
└── shared/
```

### modules-starter
Module-based structure for complex systems with multiple teams or domains.

```
packages/backend/
├── modules/
│   └── my-module/
│       ├── bounded-contexts/
│       ├── orchestrations/
│       └── shared/
└── shared/
```

## Setup

```bash
cd my-project
bun install
bun run build
```

## Learn More

- [Onion Lasagna Documentation](https://github.com/Cosmneo/onion-lasagna)
- [Turborepo Documentation](https://turborepo.com/docs)
