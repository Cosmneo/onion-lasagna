# Review Skill Observed Behavior

## RED Observed

The default `codex` shim failed with a missing vendor binary, so the controller reran the
baseline with an alternate working `codex` CLI earlier in `PATH`.

The baseline response was stronger than the planned RED failure signal: it reported findings
first and caught the domain Drizzle import, app concrete HTTP client import, GraphQL direct
repository query, partial `BaseOutboundAdapter` wrapping, and missing use-case tests. It did not
name Onion Lasagna-specific verification commands as consistently as the skill-guided response.

This scenario is therefore a smoke test for Onion Lasagna-specific output shape and verification
quality, not a strong discriminator for whether an unaided agent can notice obvious boundary
violations.

## GREEN Observed

The skill-guided response contained a `Findings` section and called out all four boundary/wrapping
violations from the prompt:

- domain aggregate importing Drizzle schema;
- app use case importing a concrete HTTP client;
- GraphQL handler querying a repository directly;
- repository adapter wrapping only some methods in `BaseOutboundAdapter`.

It also included `Good Parts` and `Test Gaps` sections and attached verification guidance to each
finding, such as import-boundary checks, fake-port use-case tests, handler delegation tests, and
error-path tests for adapter methods.
