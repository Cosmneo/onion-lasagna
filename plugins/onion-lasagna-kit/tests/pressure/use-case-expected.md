# Use Case Skill Expected Behavior

## RED Failure Signal

The agent puts permission checks in the handler, imports concrete infra, duplicates repository lookups, forgets the typed auth context, or skips use-case tests.

## GREEN Success Signal

The agent uses `BaseInboundAdapter`, an outbound port dependency, `authorize()` for permission checks and preload, `handle()` for the state change/save, object-shaped app errors, and focused tests.
