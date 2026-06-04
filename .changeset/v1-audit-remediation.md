---
'@cosmneo/onion-lasagna': major
---

**1.0.0 — audited & stabilized.** This release remediates a full code-quality audit (120 findings:
1 blocker, 3 critical, 42 major, plus minors/nits) across every package, each fix covered by tests.

Notable behavior changes (the reason this is a major):

- **HTTP client** — non-idempotent methods (POST/PATCH) are no longer auto-retried by default; the
  documented 30s request timeout is now actually applied; array query params serialize as repeated
  keys (`?tag=a&tag=b`); `ClientError` no longer drops non-JSON error bodies.
- **GraphQL (Yoga)** — discriminated-union outputs now resolve at runtime (were unqueryable); typed
  subscriptions validate per yielded item instead of failing; output-validation failures are masked
  rather than leaking internal field paths; `UnauthorizedError` maps to the `UNAUTHENTICATED`
  extension code (was `FORBIDDEN`).
- **Svelte Query / Vue Query** — hooks are now reactive: `useEnabled` gating and input-derived query
  keys update correctly (previously frozen at setup).
- **Errors** — `DbError` / `TimeoutError` / `PartialLoadError` are now reliably masked across
  HTTP/GraphQL even under bundling; a stable error brand replaces fragile class-name matching.
- **HTTP server** — `HandlerResponse.headers` now accepts `string | string[]` (multi-value headers
  like `Set-Cookie`); malformed request bodies normalize to 400; `defineRouter` `basePath` is now
  applied; response validation rejects undeclared status codes.
- **Domain** — value objects and domain events no longer leak mutable internal state via `.value` /
  `.occurredOn`.
- **Packaging** — `uuid` is bundled so the CommonJS build no longer breaks ESM-only consumers;
  `typescript` is now an optional peer dependency.

See PRs #11–#38 for full detail.
