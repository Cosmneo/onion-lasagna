# @cosmneo/onion-lasagna-saga — Assessment

## What it does

Sequential saga orchestrator for in-process distributed operations. Executes a chain of steps with automatic reverse-order compensation on failure.

## Capabilities

- **Per-step retry** — independent retry policies for actions and compensations, with `retryOn` predicates and custom backoff functions
- **Built-in exponential backoff with jitter** — `exponentialBackoff(minMs, maxMs)` helper prevents thundering herd in distributed retries
- **Compensation strategy** — `continueOnCompensationError` chooses between best-effort rollback (default) or fail-fast
- **Timeout + abort propagation** — per-attempt `AbortController` with proper cleanup, global `AbortSignal` forwarding
- **Non-Error throw safety** — wraps string/object throws into proper `Error` instances
- **Compile-time unique step names** — `EnsureUniqueName` type helper catches duplicate names at build time
- **Full result tracking** — `completedSteps`, `compensatedSteps`, `failedCompensations`, `failedStep`, `compensationFailedStep`
- **Lifecycle hooks** — `onStepComplete`, `onStepFail`, `onCompensate`, `onCompensationError` for observability

## Known trade-offs

| Trade-off | Why it stays |
|-----------|-------------|
| **No persistence** | This is an in-process orchestrator, not a workflow engine. Durable sagas need an event store, outbox, and checkpointing — a different library. |
| **No parallel steps** | Sequential is the correct default for compensatable operations. Parallel-with-compensation is a fundamentally different execution model with partial failure semantics. Consumers can wrap concurrent work in a single step. |
| **No idempotency guarantees** | Idempotency is a property of the operation, not the orchestrator. Consumers must make their actions and compensations idempotent. |
| **Timeout does not kill the action** | JS has no way to forcefully terminate a running function. The `AbortSignal` is propagated — it is the action's responsibility to respect it. |
| **Mutable shared context** | Pass-by-reference is intentional. Steps communicate results through context mutation. Deep-cloning before each step would be unreliable (functions, symbols, circular refs) and expensive. |

## Scope boundaries

This package is a lightweight in-process saga orchestrator. The following are explicitly out of scope:

- Durable/persistent sagas (use a workflow engine)
- Saga state machine with external observability
- Context snapshotting or rollback
- Cross-process coordination
