import { memoize } from '../src/memoize';
import { MemoizeError } from '../src/errors';

describe('memoize_basic', () => {
  test('returns_cached_value_on_repeat_call', () => {
    let calls = 0;
    const fn = (x: number) => {
      calls += 1;
      return x * 2;
    };
    const memo = memoize(fn);
    expect(memo(3)).toBe(6);
    expect(memo(3)).toBe(6);
    expect(calls).toBe(1);
  });

  test('different_args_compute_separately', () => {
    let calls = 0;
    const memo = memoize((x: number) => {
      calls += 1;
      return x;
    });
    memo(1);
    memo(2);
    expect(calls).toBe(2);
  });

  test('zero_arg_function_is_memoized', () => {
    let calls = 0;
    const memo = memoize(() => {
      calls += 1;
      return 'value';
    });
    memo();
    memo();
    memo();
    expect(calls).toBe(1);
  });

  test('multi_arg_function_uses_stable_key', () => {
    let calls = 0;
    const memo = memoize((a: number, b: number) => {
      calls += 1;
      return a + b;
    });
    memo(1, 2);
    memo(1, 2);
    memo(2, 1);
    expect(calls).toBe(2);
  });

  test('object_args_collide_when_equivalent', () => {
    let calls = 0;
    const memo = memoize((_a: object, _b: object) => {
      calls += 1;
      return calls;
    });
    memo({ x: 1 }, { y: 2 });
    memo({ x: 1 }, { y: 2 });
    expect(calls).toBe(1);
  });
});

describe('memoize_options', () => {
  test('custom_keyfn_controls_collision', () => {
    let calls = 0;
    const memo = memoize(
      (user: { id: number; tag: string }) => {
        calls += 1;
        return user.id;
      },
      { keyFn: (user) => user.id },
    );
    memo({ id: 1, tag: 'a' });
    memo({ id: 1, tag: 'b' });
    expect(calls).toBe(1);
  });

  test('maxsize_evicts_lru', () => {
    let calls = 0;
    const memo = memoize(
      (x: number) => {
        calls += 1;
        return x;
      },
      { maxSize: 2 },
    );
    memo(1);
    memo(2);
    memo(3);
    memo(1); // evicted, should recompute
    expect(calls).toBe(4);
  });

  test('ttl_expires_entries', () => {
    let now = 1000;
    let calls = 0;
    const memo = memoize(
      (x: number) => {
        calls += 1;
        return x;
      },
      { ttlMs: 50, clock: () => now },
    );
    memo(1);
    now = 1100;
    memo(1);
    expect(calls).toBe(2);
  });

  test('cache_methods_are_accessible', () => {
    const memo = memoize((x: number) => x);
    memo(1);
    expect(memo.cache.size).toBe(1);
    memo.cache.clear();
    expect(memo.cache.size).toBe(0);
  });

  test('invalidate_clears_specific_args', () => {
    let calls = 0;
    const memo = memoize((x: number) => {
      calls += 1;
      return x;
    });
    memo(1);
    memo(1);
    expect(calls).toBe(1);
    expect(memo.invalidate(1)).toBe(true);
    memo(1);
    expect(calls).toBe(2);
    expect(memo.invalidate(99)).toBe(false);
  });
});

describe('memoize_validation', () => {
  test('non_function_throws_NOT_A_FUNCTION', () => {
    expect(() => memoize(42 as unknown as () => void)).toThrow(MemoizeError);
    try {
      memoize(42 as unknown as () => void);
    } catch (err) {
      expect((err as MemoizeError).code).toBe('NOT_A_FUNCTION');
    }
  });

  test('zero_or_negative_maxsize_throws', () => {
    const fn = () => 0;
    expect(() => memoize(fn, { maxSize: 0 })).toThrow(/maxSize/);
    expect(() => memoize(fn, { maxSize: -1 })).toThrow(/maxSize/);
    expect(() =>
      memoize(fn, { maxSize: 1.5 }),
    ).toThrow(/maxSize/);
    expect(() =>
      memoize(fn, { maxSize: NaN }),
    ).toThrow(/maxSize/);
  });

  test('zero_or_negative_ttl_throws', () => {
    const fn = () => 0;
    expect(() => memoize(fn, { ttlMs: 0 })).toThrow(/ttlMs/);
    expect(() => memoize(fn, { ttlMs: -1 })).toThrow(/ttlMs/);
    expect(() => memoize(fn, { ttlMs: Infinity })).toThrow(/ttlMs/);
  });

  test('non_function_keyfn_throws', () => {
    expect(() =>
      memoize(() => 0, { keyFn: 'k' as unknown as (...a: never[]) => unknown }),
    ).toThrow(/keyFn/);
  });

  test('non_function_clock_throws', () => {
    expect(() =>
      memoize(() => 0, { clock: 0 as unknown as () => number }),
    ).toThrow(/clock/);
  });

  test('empty_options_are_accepted', () => {
    const memo = memoize(() => 1, {});
    expect(memo()).toBe(1);
    expect(memo()).toBe(1);
  });
});
