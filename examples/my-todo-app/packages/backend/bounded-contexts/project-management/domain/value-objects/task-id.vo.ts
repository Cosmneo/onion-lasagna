import { v7 } from 'uuid';
import { BaseUuidV7Vo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class TaskId extends BaseUuidV7Vo {
  static override generate(): TaskId {
    return new TaskId(v7());
  }

  static override create(value: TaskId['value']): TaskId {
    const validated = BaseUuidV7Vo.create(value);
    return new TaskId(validated.value);
  }
}
