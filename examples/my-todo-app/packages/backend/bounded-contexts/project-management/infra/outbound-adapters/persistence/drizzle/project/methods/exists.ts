import { eq } from 'drizzle-orm';
import type { ProjectId } from '../../../../../../domain/value-objects';
import { db, projects } from '../../../../../config/drizzle';

export async function exists(id: ProjectId): Promise<boolean> {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, id.value),
    columns: { id: true },
  });

  return result !== undefined;
}
