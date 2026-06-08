---
name: onion-lasagna
description: Use when choosing which Onion Lasagna architecture, bounded-context, domain, use-case, route, adapter, or review skill to load
---

# Onion Lasagna

## Overview

This is the entrypoint router for Onion Lasagna work. It chooses the focused skill and enforces inspect-before-assume.

## Always First

Before implementation or review, inspect actual files and exports. Prefer `rg`, `find`, `sed`, package `index.ts` files, and existing tests. Do not assume package entry points, class names, or folder conventions.

When answering a routing request, state that actual files and exports must be inspected before implementation.

## Route By Task

| User request | Skill |
|---|---|
| System design, package choices, bounded context map | `onion-lasagna-architect` |
| New module or bounded-context skeleton | `onion-lasagna-bounded-context` |
| Aggregate, entity, value object, event, invariant | `onion-lasagna-domain` |
| Command, query, `BaseInboundAdapter`, authorization, app port | `onion-lasagna-use-case` |
| HTTP route, GraphQL field, schema adapter, handler mapper | `onion-lasagna-route` |
| Review, audit, by-the-book check, layering assessment | `onion-lasagna-review` |
| Repository adapter, external API adapter, outbound port, persistence | `onion-lasagna-adapter` |

Do not route to a skill that is not present in this plugin.

If no listed skill matches, inspect actual files and exports, then answer directly without inventing
a skill name.

## Sequencing

For new work, use:

1. architect or bounded-context;
2. domain;
3. use-case;
4. adapter;
5. route;
6. review.

For existing work, use:

1. review;
2. the focused implementation skill;
3. review again.
