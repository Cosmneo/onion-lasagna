import { BaseEntity } from '@cosmneo/onion-lasagna/backend/core/onion-layers';
import { StatusId, StatusName } from '../value-objects';

/**
 * Properties for a Status entity.
 */
export interface StatusProps {
  name: StatusName;
  isFinal: boolean;
  order: number;
}

/**
 * Entity representing a workflow status within a Project.
 *
 * Statuses define the possible states a Task can be in.
 * Each project has its own set of statuses.
 *
 * - `isFinal` marks the status as a completion state (e.g., "Complete")
 * - `order` determines the display order in the UI
 */
export class Status extends BaseEntity<StatusId, StatusProps> {
  private constructor(id: StatusId, props: StatusProps, version?: number) {
    super(id, props, version);
  }

  /**
   * Creates a new Status.
   */
  static create(name: StatusName, isFinal: boolean, order: number): Status {
    return new Status(StatusId.generate(), {
      name,
      isFinal,
      order,
    });
  }

  /**
   * Reconstitutes a Status from persistence.
   * Called by repository mappers with already-validated VOs.
   */
  static reconstitute(
    id: StatusId,
    name: StatusName,
    isFinal: boolean,
    order: number,
    version = 0,
  ): Status {
    return new Status(id, { name, isFinal, order }, version);
  }

  get name(): StatusName {
    return this.props.name;
  }

  get isFinal(): boolean {
    return this.props.isFinal;
  }

  get order(): number {
    return this.props.order;
  }

  /**
   * Updates the status name.
   */
  updateName(name: string): void {
    this._props.name = StatusName.create(name);
  }

  /**
   * Updates whether this status is a final/completion state.
   */
  updateIsFinal(isFinal: boolean): void {
    this._props.isFinal = isFinal;
  }

  /**
   * Updates the display order.
   */
  updateOrder(order: number): void {
    this._props.order = order;
  }

  /**
   * Converts to a plain object for events or persistence.
   */
  toPlain(): {
    id: string;
    name: string;
    isFinal: boolean;
    order: number;
  } {
    return {
      id: this.id.value,
      name: this.props.name.value,
      isFinal: this.props.isFinal,
      order: this.props.order,
    };
  }
}
