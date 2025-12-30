import { relations } from 'drizzle-orm';
import { projects } from './project.schema';
import { statuses } from './status.schema';
import { tasks } from './task.schema';

export const projectsRelations = relations(projects, ({ many }) => ({
  statuses: many(statuses),
  tasks: many(tasks),
}));

export const statusesRelations = relations(statuses, ({ one, many }) => ({
  project: one(projects, {
    fields: [statuses.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  status: one(statuses, {
    fields: [tasks.statusId],
    references: [statuses.id],
  }),
}));
