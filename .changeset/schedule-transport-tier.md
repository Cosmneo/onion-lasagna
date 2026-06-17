---
'@cosmneo/onion-lasagna': minor
---

Add a `schedule` transport tier (scheduled work: recurring crons + one-time timers) — the fourth tier alongside `http`, `graphql`, and `events`.

Define a **task** (`defineScheduledTask`, what runs) and bind it with a separate **trigger** (`defineScheduleTriggers`, when/how), group with `defineScheduleRouter`/`mergeScheduleRouters`, wire handlers via `scheduleRoutes(router).handle/.handleWithUseCase().build()` → `UnifiedScheduleInput[]`, and run a fired schedule with the invocation primitives (`indexScheduleRoutes`, `findScheduleRoute`, `invokeScheduledTask`, `resolveScheduleTrigger`). A run returns a `ScheduleResult` (`completed | skipped | retry | failed`); `skipped` is only ever an explicit handler decision, and default error mapping classifies validation/domain errors as `failed` and transient/unknown as `retry`. `generateScheduleCatalog` produces a validated task+trigger inventory.

New subpath exports: `@cosmneo/onion-lasagna/schedule`, `/schedule/task`, `/schedule/server`, `/schedule/shared`, `/schedule/catalog`. The tier is execution-only (scheduling/cancellation, locking/overlap, and retry policy are deliberately out of scope and left to the app/delivery layer).
