# Domain Skill Observed Behavior

## RED Observed

The unaided baseline produced a plausible DDD shape but treated the aggregate like a standalone
application artifact. It mixed in persistence-oriented serialization, skipped the local inspect-first
step, did not clearly separate new creation from loading existing state, and left event behavior
under-tested.

## GREEN Observed

The skill-guided run stayed focused on pure domain modeling. It first looked for local base-class and
starter conventions, kept infrastructure concerns out of the model, made invariant protection part of
the domain construction path, and named the test surfaces that catch regressions in aggregate
behavior.
