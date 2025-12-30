import { eq } from 'drizzle-orm';
import type { Project } from '../../../../../../domain/aggregates';
import type { ProjectId } from '../../../../../../domain/value-objects';
import { db, projects } from '../../../../../config/drizzle';
import { ProjectMapper } from '../../mappers';

export async function findById(id: ProjectId): Promise<Project | null> {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, id.value),
    with: {
      statuses: true,
      tasks: true,
    },
  });

  if (!result) {
    return null;
  }

  return ProjectMapper.toDomain(result, result.statuses, result.tasks);
}
