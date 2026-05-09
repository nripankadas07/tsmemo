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
  AsyncMemoizedFn,
  AwaitedReturn,
  CacheLike,
  KeyFn,
  MemoizeAsyncOptions,
} from './types';

/**
 * Async variant of `memoize`.
 *
 * Concurrency: while a memoized async call is in flight, subsequent calls
 * with the same key return the SAME pending promise — the underlying
 * function is only invoked once for a given key per generation.
 *
 * Rejections are NOT cached by default: a rejected promise removes itself
 * from the in-flight map but is never written to the resolved-value cache.
 * Set `cacheRejections: true` to memoize the rejection too.
 */
export function memoizeAsync<F extends AnyFn>(
  fn: F,
  options: MemoizeAsyncOptions<F> = {},
): AsyncMemoizedFn<F> {
  validateOptions(fn, options);
  const cache = new MemoCache<unknown, AwaitedReturn<F>>({
    ...(options.maxSize !== undefined ? { maxSize: options.maxSize } : {}),
    ...(options.ttlMs !== undefined ? { ttlMs: options.ttlMs } : {}),
    ...(options.clock !== undefined ? { clock: options.clock } : {}),
  });
  const inflight = new Map<unknown, Promise<AwaitedReturn<F>>>();
  const cacheRejections = options.cacheRejections ?? false;
  const keyFn: KeyFn<F> =
    options.keyFn ?? ((...args) => defaultKey(args));
  const wrapped = buildAsyncWrapper(
    fn,
    cache,
    inflight,
    keyFn,
    cacheRejections,
  );
  attachCacheControls(wrapped, cache, keyFn);
  return wrapped;
}

function buildAsyncWrapper<F extends AnyFn>(
  fn: F,
  cache: CacheLike<unknown, AwaitedReturn<F>>,
  inflight: Map<unknown, Promise<AwaitedReturn<F>>>,
  keyFn: KeyFn<F>,
  cacheRejections: boolean,
): AsyncMemoizedFn<F> {
  return ((...args: Parameters<F>): Promise<AwaitedReturn<F>> => {
    const key = keyFn(...args);
    const hit = cache.get(key);
    if (hit !== undefined) return Promise.resolve(hit.value);
    const pending = inflight.get(key);
    if (pending !== undefined) return pending;
    const promise = runAndStore(fn, args, cache, key, cacheRejections);
    inflight.set(key, promise);
    return promise.finally(() => inflight.delete(key));
  }) as AsyncMemoizedFn<F>;
}

async function runAndStore<F extends AnyFn>(
  fn: F,
  args: Parameters<F>,
  cache: CacheLike<unknown, AwaitedReturn<F>>,
  key: unknown,
  cacheRejections: boolean,
): Promise<AwaitedReturn<F>> {
  try {
    const value = (await fn(...args)) as AwaitedReturn<F>;
    cache.set(key, value);
    return value;
  } catch (err) {
    if (cacheRejections) cache.set(key, Promise.reject(err) as never);
    throw err;
  }
}

function validateOptions<F extends AnyFn>(
  fn: unknown,
  options: MemoizeAsyncOptions<F>,
): void {
  assertFunction(fn);
  assertMaxSize(options.maxSize);
  assertTtlMs(options.ttlMs);
  assertKeyFn(options.keyFn);
  assertClock(options.clock);
}

function attachCacheControls<F extends AnyFn, V>(
  wrapped: AsyncMemoizedFn<F>,
  cache: CacheLike<unknown, V>,
  keyFn: KeyFn<F>,
): void {
  Object.defineProperty(wrapped, 'cache', { value: cache, enumerable: true });
  Object.defineProperty(wrapped, 'invalidate', {
    value: (...args: Parameters<F>) => cache.delete(keyFn(...args)),
    enumerable: true,
  });
}
