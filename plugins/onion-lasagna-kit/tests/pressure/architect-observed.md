# Architect Skill Observed Behavior

## RED Observed

The unaided baseline was stronger than the planned weak case: it named bounded contexts,
identified separate write ownership, described read projections, and placed cross-context
coordination outside entity packages.

It still missed several Onion Lasagna architecture outputs: explicit package choices, data flow,
error flow, saga candidates, test strategy, verification, and a concrete implementation order.

## GREEN Observed

The skill-guided run included the required architecture structure:

- bounded context map for identity, organizations, tickets, and external sync;
- concrete package choices including `@cosmneo/onion-lasagna`, HTTP route/server entry
  points, `@cosmneo/onion-lasagna-hono`, `@cosmneo/onion-lasagna-zod`,
  event entry points, `@cosmneo/onion-lasagna-client`,
  `@cosmneo/onion-lasagna-react-query`, and `@cosmneo/onion-lasagna-saga`;
- read, write, and workflow boundaries;
- saga candidates for onboarding, sync, user removal, and organization suspension;
- data flow from API/client through owning contexts into events and read models;
- error flow with known domain/application errors passed through, infrastructure failures wrapped
  as `InfraError` or subclasses, and presentation masking internal failures;
- test strategy across domain, use cases, contracts, adapters, sagas, and projections;
- implementation order ending with a boundary review.
