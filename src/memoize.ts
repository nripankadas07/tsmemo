import { MemoCache } from './cache';
import {
  assertClock,
  assertFunction,
  assertKeyFn,
  assertMaxSize,
  assertTtlMs,
} from './errors';
import { defaultKey } from './keys';
import type {
  AnyFn,
  CacheLike,
  KeyFn,
  MemoizeOptions,
  MemoizedFn,
} from './types';

/**
 * Wrap `fn` so repeated calls with the same key return the cached result.
 *
 * - Custom `keyFn` overrides the default arg serialiser.
 * - `maxSize` triggers LRU eviction.
 * - `ttlMs` causes entries to expire after the configured age. Expired
 *   entries are evicted lazily on the next access of that key.
 *
 * Throws `MemoizeError` if any option is invalid.
 */
export function memoize<F extends AnyFn>(
  fn: F,
  options: MemoizeOptions<F> = {},
): MemoizedFn<F> {
  validateOptions(fn, options);
  const cache = new MemoCache<unknown, ReturnType<F>>({
    ...(options.maxSize !== undefined ? { maxSize: options.maxSize } : {}),
    ...(options.ttlMs !== undefined ? { ttlMs: options.ttlMs } : {}),
    ...(options.clock !== undefined ? { clock: options.clock } : {}),
  });
  const keyFn: KeyFn<F> =
    options.keyFn ?? ((...args) => defaultKey(args));
  const wrapped = ((...args: Parameters<F>): ReturnType<F> => {
    const key = keyFn(...args);
    const hit = cache.get(key);
    if (hit !== undefined) return hit.value;
    const value = fn(...args) as ReturnType<F>;
    cache.set(key, value);
    return value;
  }) as MemoizedFn<F>;
  attachCacheControls(wrapped, cache, keyFn);
  return wrapped;
}

function validateOptions<F extends AnyFn>(
  fn: unknown,
  options: MemoizeOptions<F>,
): void {
  assertFunction(fn);
  assertMaxSize(options.maxSize);
  assertTtlMs(options.ttlMs);
  assertKeyFn(options.keyFn);
  assertClock(options.clock);
}

function attachCacheControls<F extends AnyFn, V>(
  wrapped: MemoizedFn<F>,
  cache: CacheLike<unknown, V>,
  keyFn: KeyFn<F>,
): void {
  Object.defineProperty(wrapped, 'cache', { value: cache, enumerable: true });
  Object.defineProperty(wrapped, 'invalidate', {
    value: (...args: Parameters<F>) => cache.delete(keyFn(...args)),
    enumerable: true,
  });
}
