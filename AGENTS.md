# Repository Guidelines

## Project Structure & Module Organization
This repository is a minimal scaffold for a full-stack TypeScript project. Key paths:
- `src/backend/` for backend services (currently empty).
- `src/frontend/` for frontend modules (currently a placeholder `readme.md`).
- `readme.md` at the root for the project overview.
Keep new code grouped by domain (e.g., `src/backend/auth/`, `src/frontend/components/`) to avoid a flat, hard-to-navigate tree.

## Build, Test, and Development Commands
There are no scripts defined in `package.json` yet. Suggested defaults:
- `bun install` to install dependencies (Bun is implied by `bun.lock`).
- `bun run <script>` once scripts are added.
- `tsc -p tsconfig.json` to type-check if/when a TypeScript build is set up.
If you add scripts, document them here and in `readme.md`.

## Coding Style & Naming Conventions
No formatter or linter is configured. Follow existing conventions:
- Use 2-space indentation in JSON files (as seen in `package.json`).
- Keep filenames lowercase (e.g., `readme.md`) and prefer descriptive directory names.
- For TypeScript, prefer `camelCase` for variables/functions and `PascalCase` for types/components.
If you introduce a formatter (e.g., Prettier/ESLint), add it to `package.json` and note the rules.

## Testing Guidelines
No testing framework is configured. If tests are added, place them near the code they cover or under a `tests/` directory and document:
- Framework (e.g., Vitest, Jest).
- Naming (e.g., `*.test.ts`).
- Command to run tests (e.g., `bun test`).

## Commit & Pull Request Guidelines
This repository has no Git history yet. If you initialize Git:
- Prefer Conventional Commits (e.g., `feat: add auth guard`).
- Keep PRs focused, include a short summary, and link issues when available.
- Add screenshots for UI changes and note any manual testing performed.

## Configuration & Security Notes
Avoid committing secrets. Keep configuration in environment variables and add a `.env.example` when needed.
