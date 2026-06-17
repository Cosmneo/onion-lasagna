# Schedule transport tier

Scheduled work (recurring crons + one-time timers) modeled as the fourth
transport tier alongside `http`, `graphql`, and `events`. Define a **task**
(what runs), bind it with a **trigger** (when/how), build the routes, and
invoke the matching task for a fired run.

```ts
import { defineScheduledTask, defineScheduleRouter, defineScheduleTriggers } from '@cosmneo/onion-lasagna/schedule/task';
import { scheduleRoutes, invokeScheduledTask } from '@cosmneo/onion-lasagna/schedule/server';

// 1. Task — WHAT runs (no schedule here; timing is bound separately).
const reconcile = defineScheduledTask({
  type: 'billing.reconcile',
  payload: zodSchema(z.object({ tenantId: z.string() })), // optional (one-time timers)
  docs: { summary: 'Reconcile invoices', tags: ['billing'] },
});

const router = defineScheduleRouter({ reconcile });

// 2. Trigger — WHEN/HOW (deployment-facing; kept out of the task contract).
const triggers = defineScheduleTriggers({
  reconcileDaily: { type: 'billing.reconcile', cron: '0 2 * * *', timezone: 'UTC' },
});

// 3. Bind handlers → routes.
const routes = scheduleRoutes(router)
  .handleWithUseCase('reconcile', { payloadMapper: (s) => s.payload, useCase: reconcileUseCase })
  .build();

// 4. In the app's platform shim (EventBridge / Cloudflare scheduled / ...):
const result = await invokeScheduledTask(routes, raw); // raw: { type, payload, metadata }
```

## Outcomes

A run returns a `ScheduleResult`:

- `completed` — ran successfully.
- `skipped` — intentionally nothing to do (returned **only** by a handler /
  `resultMapper`; **never** produced by error mapping).
- `retry` — transient failure; the run should be retried (`delayMs` advisory).
- `failed` — permanent failure (bad payload, domain/permission error); retrying
  won't help. Default error mapping sends validation/domain errors here, and
  infra/transient/unknown errors to `retry`.

## Non-goals (deliberately out of scope)

- **Execution only.** This tier dispatches and runs a fired schedule. Creating,
  cancelling, or rescheduling schedules is an app/infra concern (e.g. an
  EventBridge Scheduler adapter or a Cloudflare cron-trigger config).
- **No locking / overlap control.** Concurrency, single-flight, and
  at-most-once are app-owned. (`overlapPolicy` may be carried as advisory
  metadata; the tier does not enforce it.)
- **No retry policy.** Retry count and backoff are the delivery layer's
  responsibility; `retry`/`delayMs` are advisory signals, not a scheduler.
- **One task per `type`.** Fan-out is not supported — model multiple jobs as
  distinct task types / triggers. `indexScheduleRoutes` rejects duplicate types.
