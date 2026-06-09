# Router Skill Observed Behavior

## RED Observed

Unaided baseline guessed two made-up, task-specific skill names instead of routing to the existing review and adapter skills. It also did not state the inspect-before-assume rule.

## GREEN Observed

With the router loaded, the run mapped request 1 to `onion-lasagna-review` and request 2 to `onion-lasagna-adapter`. It also stated that actual files and exports must be inspected before implementation or review.
