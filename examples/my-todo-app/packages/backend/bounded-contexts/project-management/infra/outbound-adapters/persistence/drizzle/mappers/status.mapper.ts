import { Status } from '../../../../../domain/entities';
import { StatusId, StatusName } from '../../../../../domain/value-objects';
import type { StatusRow, NewStatusRow } from '../../../../config/drizzle/schemas';

export const StatusMapper = {
  toDomain(row: StatusRow): Status {
    return Status.reconstitute(
      StatusId.create(row.id),
      StatusName.create(row.name),
      row.isFinal,
      row.order,
      row.version,
    );
  },

  toRow(status: Status, projectId: string): NewStatusRow {
    return {
      id: status.id.value,
      projectId,
      name: status.name.value,
      isFinal: status.isFinal,
      order: status.order,
      version: status.version,
    };
  },
};
