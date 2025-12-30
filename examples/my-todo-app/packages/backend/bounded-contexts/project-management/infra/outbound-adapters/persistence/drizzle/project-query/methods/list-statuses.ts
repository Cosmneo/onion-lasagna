import { eq } from 'drizzle-orm';
import type { StatusListItem } from '@repo/shared/read-models';
import { db, statuses } from '../../../../../config/drizzle';

export async function listStatuses(projectId: string): Promise<StatusListItem[]> {
  const statusRows = await db.query.statuses.findMany({
    where: eq(statuses.projectId, projectId),
  });

  return statusRows.map((row) => ({
    id: row.id,
    name: row.name,
    isFinal: row.isFinal,
    order: row.order,
  }));
}
