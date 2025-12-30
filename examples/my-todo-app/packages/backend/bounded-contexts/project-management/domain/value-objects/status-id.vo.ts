import { v7 } from 'uuid';
import { BaseUuidV7Vo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class StatusId extends BaseUuidV7Vo {
  static override generate(): StatusId {
    return new StatusId(v7());
  }

  static override create(value: StatusId['value']): StatusId {
    const validated = BaseUuidV7Vo.create(value);
    return new StatusId(validated.value);
  }
}
