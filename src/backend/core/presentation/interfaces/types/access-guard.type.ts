import type { AccessGuardResult } from './access-guard-result.type';

export type AccessGuard<T = unknown> = (
  request: T,
) => AccessGuardResult | Promise<AccessGuardResult>;
