import type { Project } from '../../../domain/aggregates';
import type { ProjectId } from '../../../domain/value-objects';

/**
 * Outbound port for Project aggregate persistence.
 *
 * Used by command use cases to load and save the aggregate.
 */
export interface ProjectRepositoryPort {
  /**
   * Finds a project by ID.
   * Returns null if not found.
   */
  findById(id: ProjectId): Promise<Project | null>;

  /**
   * Saves a project (create or update).
   */
  save(project: Project): Promise<void>;

  /**
   * Deletes a project by ID.
   */
  delete(id: ProjectId): Promise<void>;

  /**
   * Checks if a project exists.
   */
  exists(id: ProjectId): Promise<boolean>;
}
