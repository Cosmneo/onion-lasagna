import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './project.schema';

export const statuses = sqliteTable('statuses', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name', { length: 50 }).notNull(),
  isFinal: integer('is_final', { mode: 'boolean' }).notNull().default(false),
  order: integer('order').notNull(),
  version: integer('version').notNull().default(1),
});

export type StatusRow = typeof statuses.$inferSelect;
export type NewStatusRow = typeof statuses.$inferInsert;
