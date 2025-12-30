import { eq } from 'drizzle-orm';
import type { Project } from '../../../../../../domain/aggregates';
import { db, projects, statuses, tasks } from '../../../../../config/drizzle';
import { ProjectMapper, StatusMapper, TaskMapper } from '../../mappers';

export async function save(project: Project): Promise<void> {
  const projectId = project.id.value;

  // Check if project exists
  const existingProject = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { id: true },
  });

  if (existingProject) {
    db.update(projects)
      .set({
        name: project.name.value,
        description: project.description.value || null,
        version: project.version + 1,
      })
      .where(eq(projects.id, projectId))
      .run();
  } else {
    db.insert(projects).values(ProjectMapper.toRow(project)).run();
  }

  // Sync statuses: delete removed, upsert existing/new
  const existingStatuses = await db.query.statuses.findMany({
    where: eq(statuses.projectId, projectId),
    columns: { id: true },
  });
  const existingStatusIds = existingStatuses.map((s) => s.id);
  const currentStatusIds = project.statuses.map((s) => s.id.value);

  // Delete removed statuses
  const statusesToDelete = existingStatusIds.filter(
    (id) => !currentStatusIds.includes(id),
  );
  for (const statusId of statusesToDelete) {
    db.delete(statuses).where(eq(statuses.id, statusId)).run();
  }

  // Upsert statuses
  for (const status of project.statuses) {
    const statusRow = StatusMapper.toRow(status, projectId);
    if (existingStatusIds.includes(status.id.value)) {
      db.update(statuses)
        .set({
          name: statusRow.name,
          isFinal: statusRow.isFinal,
          order: statusRow.order,
          version: status.version + 1,
        })
        .where(eq(statuses.id, status.id.value))
        .run();
    } else {
      db.insert(statuses).values(statusRow).run();
    }
  }

  // Sync tasks: delete removed, upsert existing/new
  const existingTasks = await db.query.tasks.findMany({
    where: eq(tasks.projectId, projectId),
    columns: { id: true },
  });
  const existingTaskIds = existingTasks.map((t) => t.id);
  const currentTaskIds = project.tasks.map((t) => t.id.value);

  // Delete removed tasks
  const tasksToDelete = existingTaskIds.filter(
    (id) => !currentTaskIds.includes(id),
  );
  for (const taskId of tasksToDelete) {
    db.delete(tasks).where(eq(tasks.id, taskId)).run();
  }

  // Upsert tasks
  for (const task of project.tasks) {
    const taskRow = TaskMapper.toRow(task, projectId);
    if (existingTaskIds.includes(task.id.value)) {
      db.update(tasks)
        .set({
          title: taskRow.title,
          description: taskRow.description,
          statusId: taskRow.statusId,
          completedAt: taskRow.completedAt,
          version: task.version + 1,
        })
        .where(eq(tasks.id, task.id.value))
        .run();
    } else {
      db.insert(tasks).values(taskRow).run();
    }
  }
}
