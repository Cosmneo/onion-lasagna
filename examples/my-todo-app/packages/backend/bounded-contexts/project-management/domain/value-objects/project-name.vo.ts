import { BaseTextVo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class ProjectName extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 100;

  static override create(value: ProjectName['value']): ProjectName {
    return super.create(value) as ProjectName;
  }
}
