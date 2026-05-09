import type { CacheEntry, CacheLike, Clock } from './types';

/**
 * Map-backed cache with LRU eviction and optional per-entry TTL.
 *
 * Implementation note: insertion order in `Map` plus a delete-then-set
 * "touch" pattern is enough to maintain LRU order in O(1) per operation —
 * the most-recently-used key is always last.
 */
export class MemoCache<K, V> implements CacheLike<K, V> {
  private readonly entries = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number | undefined;
  private readonly defaultTtlMs: number | undefined;
  private readonly clock: Clock;

  constructor(opts: {
    maxSize?: number;
    ttlMs?: number;
    clock?: Clock;
  } = {}) {
    this.maxSize = opts.maxSize;
    this.defaultTtlMs = opts.ttlMs;
    this.clock = opts.clock ?? Date.now;
  }

  get size(): number {
    return this.entries.size;
  }

  get(key: K): CacheEntry<V> | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return undefined;
    }
    entry.lastAccess = this.clock();
    this.touch(key, entry);
    return entry;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;
    const expiresAt =
      effectiveTtl === undefined ? undefined : this.clock() + effectiveTtl;
    const entry: CacheEntry<V> = {
      value,
      expiresAt,
      lastAccess: this.clock(),
    };
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, entry);
    this.evictIfFull();
  }

  has(key: K): boolean {
    const entry = this.entries.get(key);
    if (entry === undefined) return false;
    if (this.isExpired(entry)) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    if (entry.expiresAt === undefined) return false;
    return this.clock() >= entry.expiresAt;
  }

  private touch(key: K, entry: CacheEntry<V>): void {
    // re-insert to move to most-recently-used position
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  private evictIfFull(): void {
    if (this.maxSize === undefined) return;
    while (this.entries.size > this.maxSize) {
      // size > maxSize >= 1, so there is always at least one key here
      const oldestKey = this.entries.keys().next().value as K;
      this.entries.delete(oldestKey);
    }
  }
}
