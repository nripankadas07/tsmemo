/** Error codes produced by tsmemo. */
export type MemoizeErrorCode =
  | 'NOT_A_FUNCTION'
  | 'INVALID_MAX_SIZE'
  | 'INVALID_TTL'
  | 'INVALID_KEY_FN'
  | 'INVALID_CLOCK'
  | 'INVALID_OPTIONS';

/**
 * Single error type used for all configuration / argument failures.
 *
 * `code` is a stable machine-readable string callers can branch on; the
 * human-readable `message` is for developers.
 */
export class MemoizeError extends Error {
  public readonly code: MemoizeErrorCode;

  constructor(code: MemoizeErrorCode, message: string) {
    super(message);
    this.name = 'MemoizeError';
    this.code = code;
    // restore prototype for `instanceof` after transpilation to ES5 targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Throw if `fn` is not a callable function. */
export function assertFunction(fn: unknown): void {
  if (typeof fn !== 'function') {
    throw new MemoizeError(
      'NOT_A_FUNCTION',
      `expected a function, received ${typeof fn}`,
    );
  }
}

/** Validate a positive-integer `maxSize` (or undefined). */
export function assertMaxSize(maxSize: number | undefined): void {
  if (maxSize === undefined) return;
  if (
    typeof maxSize !== 'number' ||
    !Number.isFinite(maxSize) ||
    !Number.isInteger(maxSize) ||
    maxSize < 1
  ) {
    throw new MemoizeError(
      'INVALID_MAX_SIZE',
      `maxSize must be a positive integer, received ${String(maxSize)}`,
    );
  }
}

/** Validate a positive-finite `ttlMs` (or undefined). */
export function assertTtlMs(ttlMs: number | undefined): void {
  if (ttlMs === undefined) return;
  if (typeof ttlMs !== 'number' || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new MemoizeError(
      'INVALID_TTL',
      `ttlMs must be a positive finite number, received ${String(ttlMs)}`,
    );
  }
}

/** Validate that `keyFn` is a function (or undefined). */
export function assertKeyFn(keyFn: unknown): void {
  if (keyFn === undefined) return;
  if (typeof keyFn !== 'function') {
    throw new MemoizeError(
      'INVALID_KEY_FN',
      `keyFn must be a function, received ${typeof keyFn}`,
    );
  }
}

/** Validate that `clock` is a function (or undefined). */
export function assertClock(clock: unknown): void {
  if (clock === undefined) return;
  if (typeof clock !== 'function') {
    throw new MemoizeError(
      'INVALID_CLOCK',
      `clock must be a function, received ${typeof clock}`,
    );
  }
}
