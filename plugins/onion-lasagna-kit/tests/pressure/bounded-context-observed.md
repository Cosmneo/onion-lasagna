# Bounded Context Skill Observed Behavior

## RED Observed

The unaided baseline was stronger than the worst failure mode because it included a bounded context
root, an `index.ts`, and a bootstrap function wired into a backend bootstrap.

It still missed the intended Onion Lasagna convention. It used `application/` and `infrastructure/`
instead of the local `app/` and `infra/` layer names, placed bootstrap in a `project.bootstrap.ts`
file instead of a `bootstrap/` folder, exposed a concrete in-memory repository through the sample
composition without warning about public API boundaries, and did not say to inspect existing
bounded contexts, package exports, or tests before creating files.

## GREEN Observed

The skill-guided run moved from a generic clean-architecture answer to the local Onion Lasagna
shape. It started with discovery, described a concrete context root with composition isolated from
the public surface, and treated implementation exports as a boundary decision instead of exposing
every class by default.

It also correctly refused to invent files under the pressure prompt's read-only inspection limits,
which is consistent with the skill's inspect-first rule.
