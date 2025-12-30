import { Project } from '../../../../../domain/aggregates';
import type { Status, Task } from '../../../../../domain/entities';
import { ProjectId, ProjectName, ProjectDescription } from '../../../../../domain/value-objects';
import type { ProjectRow, NewProjectRow, StatusRow, TaskRow } from '../../../../config/drizzle/schemas';
import { StatusMapper } from './status.mapper';
import { TaskMapper } from './task.mapper';

export const ProjectMapper = {
  toDomain(row: ProjectRow, statusRows: StatusRow[], taskRows: TaskRow[]): Project {
    const statuses: Status[] = statusRows.map(StatusMapper.toDomain);
    const tasks: Task[] = taskRows.map(TaskMapper.toDomain);

    return Project.reconstitute(
      ProjectId.create(row.id),
      ProjectName.create(row.name),
      ProjectDescription.create(row.description ?? ''),
      statuses,
      tasks,
      row.createdAt,
      row.version,
    );
  },

  toRow(project: Project): NewProjectRow {
    return {
      id: project.id.value,
      name: project.name.value,
      description: project.description.value || null,
      createdAt: project.createdAt,
      version: project.version,
    };
  },
};
