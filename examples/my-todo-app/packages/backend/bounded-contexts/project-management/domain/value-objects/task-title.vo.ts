import { BaseTextVo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class TaskTitle extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 200;

  static override create(value: TaskTitle['value']): TaskTitle {
    return super.create(value) as TaskTitle;
  }
}
