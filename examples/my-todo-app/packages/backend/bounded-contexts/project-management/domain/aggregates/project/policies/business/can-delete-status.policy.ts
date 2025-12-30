import type { Project } from '../../project.aggregate';
import type { StatusId } from '../../../../value-objects';

/**
 * Reasons why a status cannot be deleted.
 */
export enum DeleteStatusDeniedReason {
  /** Status is assigned to one or more tasks */
  IN_USE = 'IN_USE',
  /** Cannot delete the last remaining status */
  LAST_STATUS = 'LAST_STATUS',
  /** Cannot delete the only final status */
  ONLY_FINAL_STATUS = 'ONLY_FINAL_STATUS',
}

/**
 * Result of checking if a status can be deleted.
 */
export type CanDeleteStatusResult =
  | { allowed: true }
  | { allowed: false; reason: DeleteStatusDeniedReason };

/**
 * Business Policy: Determines if a status can be deleted.
 *
 * A status can be deleted if:
 * 1. It is not assigned to any task
 * 2. It is not the last status in the project
 * 3. It is not the only final status (if it is final)
 *
 * @param project - The project containing the status
 * @param statusId - The ID of the status to check
 * @returns Result with `allowed` boolean and reason if denied
 */
export const canDeleteStatus = (project: Project, statusId: StatusId): CanDeleteStatusResult => {
  // Check if any task uses this status
  const hasTasksWithStatus = project.tasks.some((t) => t.statusId.equals(statusId));
  if (hasTasksWithStatus) {
    return { allowed: false, reason: DeleteStatusDeniedReason.IN_USE };
  }

  // Check if it's the last status
  if (project.statuses.length <= 1) {
    return { allowed: false, reason: DeleteStatusDeniedReason.LAST_STATUS };
  }

  // Check if it's the only final status
  const status = project.statuses.find((s) => s.id.equals(statusId));
  if (status?.isFinal) {
    const finalStatusCount = project.statuses.filter((s) => s.isFinal).length;
    if (finalStatusCount <= 1) {
      return { allowed: false, reason: DeleteStatusDeniedReason.ONLY_FINAL_STATUS };
    }
  }

  return { allowed: true };
};
