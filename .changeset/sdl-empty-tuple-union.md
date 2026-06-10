---
'@cosmneo/onion-lasagna': patch
---

**GraphQL SDL: zero-variant unions no longer emit unparseable SDL.** A schema
shape carrying an empty `anyOf` / `oneOf` — most commonly zod's `z.tuple([])`
("always-empty array"), which Zod v4 converts to
`{ type: 'array', items: { anyOf: [] } }` — made the generator emit
`union X = ` with no members. That is invalid SDL, so the **entire** generated
schema failed to parse at server boot, surfacing as a misleading syntax error
on whatever definition happened to follow the union. Zero-variant unions now
fall back to the `JSON` scalar, consistent with the generator's handling of
other unrepresentable shapes (mixed-type unions, empty objects).
