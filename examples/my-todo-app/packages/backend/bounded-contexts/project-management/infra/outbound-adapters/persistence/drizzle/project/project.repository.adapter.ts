import { BaseOutboundAdapter } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import type { ProjectRepositoryPort } from '../../../../../app/ports/outbound/project.repository.port';
import type { Project } from '../../../../../domain/aggregates';
import type { ProjectId } from '../../../../../domain/value-objects';
import {
  findById as findByIdMethod,
  save as saveMethod,
  deleteProject as deleteMethod,
  exists as existsMethod,
} from './methods';

export class ProjectRepositoryAdapter
  extends BaseOutboundAdapter
  implements ProjectRepositoryPort
{
  async findById(id: ProjectId): Promise<Project | null> {
    return findByIdMethod(id);
  }

  async save(project: Project): Promise<void> {
    return saveMethod(project);
  }

  async delete(id: ProjectId): Promise<void> {
    return deleteMethod(id);
  }

  async exists(id: ProjectId): Promise<boolean> {
    return existsMethod(id);
  }
}
