import { Task } from '../../../../../domain/entities';
import { TaskId, TaskTitle, TaskDescription, StatusId } from '../../../../../domain/value-objects';
import type { TaskRow, NewTaskRow } from '../../../../config/drizzle/schemas';

export const TaskMapper = {
  toDomain(row: TaskRow): Task {
    return Task.reconstitute(
      TaskId.create(row.id),
      TaskTitle.create(row.title),
      TaskDescription.create(row.description ?? ''),
      StatusId.create(row.statusId),
      row.createdAt,
      row.completedAt,
      row.version,
    );
  },

  toRow(task: Task, projectId: string): NewTaskRow {
    return {
      id: task.id.value,
      projectId,
      title: task.title.value,
      description: task.description.value || null,
      statusId: task.statusId.value,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      version: task.version,
    };
  },
};
