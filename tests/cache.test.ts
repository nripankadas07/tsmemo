import { MemoCache } from '../src/cache';

describe('cache_basic', () => {
  test('set_get_has_size', () => {
    const cache = new MemoCache<string, number>();
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    expect(cache.size).toBe(1);
    expect(cache.has('a')).toBe(true);
    expect(cache.get('a')?.value).toBe(1);
  });

  test('miss_returns_undefined', () => {
    const cache = new MemoCache<string, number>();
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  test('delete_returns_true_then_false', () => {
    const cache = new MemoCache<string, number>();
    cache.set('a', 1);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
  });

  test('clear_drops_everything', () => {
    const cache = new MemoCache<string, number>();
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  test('overwrite_existing_key_keeps_one_entry', () => {
    const cache = new MemoCache<string, number>();
    cache.set('a', 1);
    cache.set('a', 2);
    expect(cache.size).toBe(1);
    expect(cache.get('a')?.value).toBe(2);
  });
});

describe('cache_lru', () => {
  test('evicts_oldest_when_full', () => {
    const cache = new MemoCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(true);
    expect(cache.has('c')).toBe(true);
  });

  test('get_promotes_to_most_recently_used', () => {
    const cache = new MemoCache<string, number>({ maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });

  test('evict_loop_drains_to_max_size', () => {
    const cache = new MemoCache<number, number>({ maxSize: 1 });
    cache.set(1, 1);
    cache.set(2, 2);
    cache.set(3, 3);
    expect(cache.size).toBe(1);
    expect(cache.has(3)).toBe(true);
  });

  test('size_unlimited_when_no_maxsize', () => {
    const cache = new MemoCache<number, number>();
    for (let i = 0; i < 100; i += 1) cache.set(i, i);
    expect(cache.size).toBe(100);
  });
});

describe('cache_ttl', () => {
  test('expired_get_returns_undefined_and_evicts', () => {
    let now = 1000;
    const cache = new MemoCache<string, number>({
      ttlMs: 50,
      clock: () => now,
    });
    cache.set('a', 1);
    now = 1100;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  test('expired_has_returns_false_and_evicts', () => {
    let now = 1000;
    const cache = new MemoCache<string, number>({
      ttlMs: 50,
      clock: () => now,
    });
    cache.set('a', 1);
    now = 1100;
    expect(cache.has('a')).toBe(false);
    expect(cache.size).toBe(0);
  });

  test('per_set_ttl_overrides_default', () => {
    let now = 1000;
    const cache = new MemoCache<string, number>({
      ttlMs: 1000,
      clock: () => now,
    });
    cache.set('short', 1, 10);
    now = 1020;
    expect(cache.has('short')).toBe(false);
  });

  test('no_ttl_never_expires', () => {
    let now = 1000;
    const cache = new MemoCache<string, number>({ clock: () => now });
    cache.set('a', 1);
    now = Number.MAX_SAFE_INTEGER;
    expect(cache.has('a')).toBe(true);
  });

  test('default_clock_is_date_now', () => {
    const cache = new MemoCache<string, number>({ ttlMs: 100000 });
    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
  });
});
