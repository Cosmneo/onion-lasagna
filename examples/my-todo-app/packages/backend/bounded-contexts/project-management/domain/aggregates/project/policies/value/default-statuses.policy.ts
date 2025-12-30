import { Status } from '../../../../entities';
import { StatusName } from '../../../../value-objects';

/**
 * Value Policy: Default statuses for new projects.
 *
 * New projects are initialized with three default statuses:
 * - To Do (order: 1)
 * - In Progress (order: 2)
 * - Complete (order: 3, isFinal: true)
 *
 * @returns Array of default Status entities
 */
export const defaultStatuses = (): Status[] => {
  return [
    Status.create(StatusName.create('To Do'), false, 1),
    Status.create(StatusName.create('In Progress'), false, 2),
    Status.create(StatusName.create('Complete'), true, 3),
  ];
};
