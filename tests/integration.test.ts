import { memoize, memoizeAsync, MemoCache } from '../src';

describe('integration', () => {
  test('expensive_fib_is_correctly_memoized', () => {
    let calls = 0;
    const fib = memoize(
      function compute(n: number): number {
        calls += 1;
        if (n < 2) return n;
        return fib(n - 1) + fib(n - 2);
      },
    );
    expect(fib(20)).toBe(6765);
    expect(calls).toBe(21);
  });

  test('async_memoize_with_ttl_and_maxsize', async () => {
    let now = 0;
    const memo = memoizeAsync(
      async (n: number) => n * 2,
      { ttlMs: 100, maxSize: 3, clock: () => now },
    );
    await memo(1);
    await memo(2);
    await memo(3);
    await memo(4);
    expect(memo.cache.size).toBe(3);
    expect(memo.cache.has(1)).toBe(false);
    now = 200;
    expect(memo.cache.has(2)).toBe(false);
  });

  test('cache_independent_from_wrapper_can_be_shared', () => {
    const cache = new MemoCache<number, number>({ maxSize: 5 });
    cache.set(1, 10);
    cache.set(2, 20);
    expect(cache.get(1)?.value).toBe(10);
    expect(cache.size).toBe(2);
  });
});
