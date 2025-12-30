import { eq, count, and } from 'drizzle-orm';
import type {
  PaginatedData,
  PaginationInput,
} from '@cosmneo/onion-lasagna/backend/core/global';
import type { TaskListItem } from '@repo/shared/read-models';
import { db, tasks } from '../../../../../config/drizzle';

export async function listTasksByStatus(
  projectId: string,
  statusId: string,
  pagination?: PaginationInput,
): Promise<PaginatedData<TaskListItem>> {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 10;
  const offset = (page - 1) * pageSize;

  // Get total count
  const totalResult = db
    .select({ count: count() })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.statusId, statusId)))
    .get();
  const total = totalResult?.count ?? 0;

  // Get paginated tasks
  const taskRows = await db.query.tasks.findMany({
    where: and(eq(tasks.projectId, projectId), eq(tasks.statusId, statusId)),
    limit: pageSize,
    offset,
  });

  const items: TaskListItem[] = taskRows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    statusId: row.statusId,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  }));

  return { items, total };
}
