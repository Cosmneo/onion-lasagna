import { eq, and } from 'drizzle-orm';
import type { TaskDetailView } from '@repo/shared/read-models';
import { db, tasks } from '../../../../../config/drizzle';

export async function getTaskById(
  projectId: string,
  taskId: string,
): Promise<TaskDetailView | null> {
  const taskRow = await db.query.tasks.findFirst({
    where: and(eq(tasks.projectId, projectId), eq(tasks.id, taskId)),
  });

  if (!taskRow) {
    return null;
  }

  return {
    id: taskRow.id,
    title: taskRow.title,
    description: taskRow.description ?? '',
    statusId: taskRow.statusId,
    createdAt: taskRow.createdAt,
    completedAt: taskRow.completedAt,
  };
}
