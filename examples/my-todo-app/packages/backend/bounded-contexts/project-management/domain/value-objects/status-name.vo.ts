import { BaseTextVo } from '@cosmneo/onion-lasagna/backend/core/onion-layers';

export class StatusName extends BaseTextVo {
  static override defaultMinLength = 1;
  static override defaultMaxLength = 50;

  static override create(value: StatusName['value']): StatusName {
    return super.create(value) as StatusName;
  }
}
