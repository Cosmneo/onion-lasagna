import { count, sql } from 'drizzle-orm';
import type {
  PaginatedData,
  PaginationInput,
} from '@cosmneo/onion-lasagna/backend/core/global';
import type { ProjectListItem } from '@repo/shared/read-models';
import { db, projects, tasks } from '../../../../../config/drizzle';

export async function listProjects(
  pagination: PaginationInput,
): Promise<PaginatedData<ProjectListItem>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  // Get total count
  const totalResult = db
    .select({ count: count() })
    .from(projects)
    .get();
  const total = totalResult?.count ?? 0;

  // Get paginated projects with task count
  const projectRows = db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      createdAt: projects.createdAt,
      taskCount: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE ${tasks.projectId} = ${projects.id})`,
    })
    .from(projects)
    .limit(pageSize)
    .offset(offset)
    .all();

  const items: ProjectListItem[] = projectRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    createdAt: row.createdAt,
    taskCount: row.taskCount,
  }));

  return { items, total };
}
