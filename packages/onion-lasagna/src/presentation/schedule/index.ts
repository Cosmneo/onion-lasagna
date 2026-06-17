/**
 * @fileoverview Schedule transport tier — scheduled work (recurring crons +
 * one-time timers) modeled as the events/http/graphql sibling.
 *
 * - `task/`    — define tasks (WHAT runs) + trigger bindings (WHEN/HOW).
 * - `server/`  — the scheduleRoutes builder + invocation primitives.
 * - `shared/`  — ScheduleResult + error mapping.
 * - `catalog/` — a validated inventory of tasks + triggers.
 *
 * @module schedule
 */

export * from './task';
export * from './server';
export * from './shared';
export * from './catalog';
