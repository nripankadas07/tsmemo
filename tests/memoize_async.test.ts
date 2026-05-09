import { memoizeAsync } from '../src/memoize-async';
import { MemoizeError } from '../src/errors';

describe('memoize_async_basic', () => {
  test('caches_resolved_value', async () => {
    let calls = 0;
    const memo = memoizeAsync(async (x: number) => {
      calls += 1;
      return x * 2;
    });
    expect(await memo(3)).toBe(6);
    expect(await memo(3)).toBe(6);
    expect(calls).toBe(1);
  });

  test('different_args_compute_separately', async () => {
    let calls = 0;
    const memo = memoizeAsync(async (x: number) => {
      calls += 1;
      return x;
    });
    await memo(1);
    await memo(2);
    expect(calls).toBe(2);
  });

  test('zero_arg_function_is_memoized', async () => {
    let calls = 0;
    const memo = memoizeAsync(async () => {
      calls += 1;
      return 'ok';
    });
    await memo();
    await memo();
    expect(calls).toBe(1);
  });
});

describe('memoize_async_inflight', () => {
  test('concurrent_calls_share_one_promise', async () => {
    let calls = 0;
    let resolveInner: ((value: number) => void) | undefined;
    const memo = memoizeAsync(async (x: number) => {
      calls += 1;
      return new Promise<number>((resolve) => {
        resolveInner = (v) => resolve(v + x);
      });
    });
    const p1 = memo(10);
    const p2 = memo(10);
    const p3 = memo(10);
    expect(calls).toBe(1);
    resolveInner?.(5);
    expect(await p1).toBe(15);
    expect(await p2).toBe(15);
    expect(await p3).toBe(15);
  });

  test('rejection_is_not_cached_by_default', async () => {
    let calls = 0;
    const memo = memoizeAsync(async (shouldFail: boolean) => {
      calls += 1;
      if (shouldFail) throw new Error('boom');
      return 'ok';
    });
    await expect(memo(true)).rejects.toThrow('boom');
    await expect(memo(true)).rejects.toThrow('boom');
    expect(calls).toBe(2);
  });

  test('rejection_is_cached_when_opt_in', async () => {
    let calls = 0;
    const memo = memoizeAsync(
      async () => {
        calls += 1;
        throw new Error('boom');
      },
      { cacheRejections: true },
    );
    await expect(memo()).rejects.toThrow('boom');
    await expect(memo()).rejects.toThrow('boom');
    expect(calls).toBe(1);
  });

  test('inflight_entry_is_cleared_on_resolve', async () => {
    const memo = memoizeAsync(async () => 1);
    await memo();
    expect(memo.cache.size).toBe(1);
    memo.cache.clear();
    await memo();
    expect(memo.cache.size).toBe(1);
  });

  test('inflight_entry_is_cleared_on_reject', async () => {
    let calls = 0;
    const memo = memoizeAsync(async () => {
      calls += 1;
      throw new Error('x');
    });
    await expect(memo()).rejects.toThrow('x');
    await expect(memo()).rejects.toThrow('x');
    expect(calls).toBe(2);
  });
});

describe('memoize_async_options', () => {
  test('ttl_expires_resolved_entry', async () => {
    let now = 1000;
    let calls = 0;
    const memo = memoizeAsync(
      async (x: number) => {
        calls += 1;
        return x;
      },
      { ttlMs: 50, clock: () => now },
    );
    await memo(1);
    now = 1100;
    await memo(1);
    expect(calls).toBe(2);
  });

  test('maxsize_evicts_old_entries', async () => {
    let calls = 0;
    const memo = memoizeAsync(
      async (x: number) => {
        calls += 1;
        return x;
      },
      { maxSize: 2 },
    );
    await memo(1);
    await memo(2);
    await memo(3);
    await memo(1);
    expect(calls).toBe(4);
  });

  test('custom_keyfn_collapses_calls', async () => {
    let calls = 0;
    const memo = memoizeAsync(
      async (user: { id: number; tag: string }) => {
        calls += 1;
        return user.id;
      },
      { keyFn: (user) => user.id },
    );
    await memo({ id: 7, tag: 'a' });
    await memo({ id: 7, tag: 'b' });
    expect(calls).toBe(1);
  });

  test('invalidate_drops_specific_key', async () => {
    let calls = 0;
    const memo = memoizeAsync(async (x: number) => {
      calls += 1;
      return x;
    });
    await memo(1);
    expect(memo.invalidate(1)).toBe(true);
    await memo(1);
    expect(calls).toBe(2);
  });
});

describe('memoize_async_validation', () => {
  test('non_function_throws', async () => {
    expect(() => memoizeAsync('x' as unknown as () => Promise<number>)).toThrow(
      MemoizeError,
    );
  });

  test('invalid_options_throw', () => {
    const fn = async () => 0;
    expect(() => memoizeAsync(fn, { maxSize: 0 })).toThrow(/maxSize/);
    expect(() => memoizeAsync(fn, { ttlMs: 0 })).toThrow(/ttlMs/);
    expect(() =>
      memoizeAsync(fn, {
        keyFn: 1 as unknown as (...a: never[]) => unknown,
      }),
    ).toThrow(/keyFn/);
    expect(() =>
      memoizeAsync(fn, { clock: 'x' as unknown as () => number }),
    ).toThrow(/clock/);
  });
});
