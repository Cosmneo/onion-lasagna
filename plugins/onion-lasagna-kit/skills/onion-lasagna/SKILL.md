---
name: onion-lasagna
description: Use when routing Onion Lasagna review or outbound-adapter work to the current focused skills
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
| Review, audit, by-the-book check, layering assessment | `onion-lasagna-review` |
| Repository adapter, external API adapter, outbound port, persistence | `onion-lasagna-adapter` |

Do not route to a skill that is not present in this plugin.

If no listed skill matches, inspect actual files and exports, then answer directly without inventing
a skill name.

## Sequencing

For new work, use:

1. adapter when outbound infrastructure is needed;
2. review when checking existing structure.

For existing work, use:

1. review;
2. `onion-lasagna-adapter` only when the task is outbound adapter work;
3. review again.
