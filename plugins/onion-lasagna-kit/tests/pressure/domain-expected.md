# Domain Skill Expected Behavior

## RED Failure Signal

The agent mixes persistence, HTTP, request DTOs, or framework errors into domain code; skips value-object validation; creates public entity, aggregate, or value-object constructors; omits creation/reconstitution separation; or forgets domain-event and invariant tests.

## GREEN Success Signal

The agent keeps the domain pure, uses value objects and aggregate factories, validates invariants before construction, emits a creation event from the aggregate, separates `create()` from `reconstitute()`, and lists tests for factories, invariants, events, reconstitution, and any introduced transitions.
