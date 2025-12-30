import { eq } from 'drizzle-orm';
import type { ProjectDetailView } from '@repo/shared/read-models';
import { db, projects } from '../../../../../config/drizzle';

export async function getProjectById(
  projectId: string,
): Promise<ProjectDetailView | null> {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      statuses: true,
      tasks: true,
    },
  });

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    name: result.name,
    description: result.description ?? '',
    createdAt: result.createdAt,
    statuses: result.statuses.map((s) => ({
      id: s.id,
      name: s.name,
      isFinal: s.isFinal,
      order: s.order,
    })),
    tasks: result.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? '',
      statusId: t.statusId,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
    })),
  };
}
