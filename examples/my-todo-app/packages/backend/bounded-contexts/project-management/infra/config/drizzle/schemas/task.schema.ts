import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './project.schema';
import { statuses } from './status.schema';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title', { length: 200 }).notNull(),
  description: text('description'),
  statusId: text('status_id')
    .notNull()
    .references(() => statuses.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  version: integer('version').notNull().default(1),
});

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
