import { BaseTextVo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class ProjectDescription extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 100;

  static override create(value: ProjectDescription['value']): ProjectDescription {
    return super.create(value) as ProjectDescription;
  }
}
