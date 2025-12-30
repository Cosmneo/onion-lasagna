import { eq } from 'drizzle-orm';
import type { ProjectId } from '../../../../../../domain/value-objects';
import { db, projects } from '../../../../../config/drizzle';

export async function deleteProject(id: ProjectId): Promise<void> {
  // FK cascade will delete statuses and tasks
  db.delete(projects).where(eq(projects.id, id.value)).run();
}
