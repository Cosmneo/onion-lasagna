import { v7 } from 'uuid';
import { BaseUuidV7Vo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class ProjectId extends BaseUuidV7Vo {
  static override generate(): ProjectId {
    return new ProjectId(v7());
  }

  static override create(value: ProjectId['value']): ProjectId {
    const validated = BaseUuidV7Vo.create(value);
    return new ProjectId(validated.value);
  }
}
