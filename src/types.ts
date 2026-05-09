/**
 * Public types for tsmemo.
 *
 * `AnyFn` is intentionally permissive (the user supplies their own typed
 * function, and `memoize` re-types the result via `MemoizedFn<F>`).
 */
export type AnyFn = (...args: never[]) => unknown;

/** Function that produces a cache key from a call's arguments. */
export type KeyFn<F extends AnyFn> = (
  ...args: Parameters<F>
) => unknown;

/**
 * Read-side view of a cache entry. `expiresAt` is `undefined` when no TTL
 * is configured. `lastAccess` is updated by `Cache.get` and is used by the
 * LRU eviction policy.
 */
export interface CacheEntry<V> {
  readonly value: V;
  readonly expiresAt: number | undefined;
  lastAccess: number;
}

/** Common storage contract used by `memoize` / `memoizeAsync`. */
export interface CacheLike<K, V> {
  get(key: K): CacheEntry<V> | undefined;
  set(key: K, value: V, ttlMs?: number): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
}

/** Source of "current time" — injectable for deterministic tests. */
export type Clock = () => number;

/** Options accepted by `memoize` (the sync variant). */
export interface MemoizeOptions<F extends AnyFn> {
  readonly keyFn?: KeyFn<F>;
  readonly maxSize?: number;
  readonly ttlMs?: number;
  readonly clock?: Clock;
}

/** Options accepted by `memoizeAsync`. */
export interface MemoizeAsyncOptions<F extends AnyFn>
  extends MemoizeOptions<F> {
  /**
   * If `true` (default) a rejected promise is NOT cached — subsequent calls
   * with the same key invoke the underlying function again.
   */
  readonly cacheRejections?: boolean;
}

/**
 * The shape returned by `memoize`. The cache is exposed as a typed
 * `CacheLike` so callers can `.delete(key)` etc. `invalidate(...args)` is a
 * sugar that re-derives the cache key with the same `keyFn`.
 */
export interface MemoizedFn<F extends AnyFn> {
  (...args: Parameters<F>): ReturnType<F>;
  readonly cache: CacheLike<unknown, ReturnType<F>>;
  invalidate(...args: Parameters<F>): boolean;
}

/** Async variant — same as `MemoizedFn` but the value type is awaited. */
export type AwaitedReturn<F extends AnyFn> = Awaited<ReturnType<F>>;

export interface AsyncMemoizedFn<F extends AnyFn> {
  (...args: Parameters<F>): Promise<AwaitedReturn<F>>;
  readonly cache: CacheLike<unknown, AwaitedReturn<F>>;
  invalidate(...args: Parameters<F>): boolean;
}
