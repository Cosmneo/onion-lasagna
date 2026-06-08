---
name: onion-lasagna-review
description: Use when reviewing an Onion Lasagna project, checking layer boundaries, validating by-the-book structure, or auditing existing code for architecture drift
---

# Onion Lasagna Review

## Overview

Review Onion Lasagna projects by checking dependency direction, boundary wrapping, validation placement, and test coverage. Findings come first; praise is secondary.

## Required Context

Before judging, inspect real files and exports. Use `rg`, `find`, `sed`, and package `index.ts` files. Do not assume exports, package entry points, or folder conventions.

Load `../../references/layer-checklist.md` when the request is a review, audit, "by the book" check, or migration assessment.

## Review Procedure

1. Map project shape: packages, bounded contexts, presentation surfaces, read/write trees, and bootstrap roots.
2. Scan domain imports for infra, presentation, framework, database, SDK, and schema leaks.
3. Scan app/use-case imports for concrete infrastructure.
4. Scan route handlers for business logic or direct repository calls.
5. Scan infra adapters for outbound port implementation and error wrapping.
6. Check tests near changed or reviewed layers.
7. Report findings first, ordered by severity.

## Useful Scans

Start broad, then inspect matches before judging:

```bash
rg -n "from ['\\\"].*(drizzle|schema|infra|presentation|http|graphql)" --glob '*domain*' .
rg -n "new .*Client|axios|fetch\\(" --glob '*app*' --glob '*use-case*' .
rg -n "repository\\.|Repository" --glob '*handler*' --glob '*resolver*' --glob '*route*' .
rg -n "extends BaseOutboundAdapter|createInfraError|InfraError" .
rg -n "describe\\(|it\\(" --glob '*use-case*' --glob '*tests*' .
```

## Common Violations

| Symptom                             | Problem                            | Fix                                                                |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Domain imports Drizzle or HTTP code | Inner layer depends on outer layer | Move persistence mapping to infra                                  |
| Use case imports SDK client         | App layer bypasses outbound port   | Add port and adapter                                               |
| Handler queries repository          | Presentation owns business flow    | Call a use case through route mapping                              |
| Repository leaks raw errors         | Infra boundary is porous           | Wrap with `BaseOutboundAdapter` or explicit `InfraError`           |
| Validation only happens in handler  | Domain invariant can be bypassed   | Validate external input at edge and invariants in domain factories |

## Output Shape

Use this structure:

```markdown
## Findings

- [Severity] `path/file.ts`: problem. Why it violates Onion Lasagna. Fix. Verification.

## Good Parts

- Specific pattern that matches Onion Lasagna well.

## Test Gaps

- Missing or weak verification.
```
