import {
  MemoizeError,
  assertClock,
  assertFunction,
  assertKeyFn,
  assertMaxSize,
  assertTtlMs,
} from '../src/errors';

describe('MemoizeError', () => {
  test('preserves_code_and_message', () => {
    const err = new MemoizeError('INVALID_TTL', 'msg');
    expect(err.code).toBe('INVALID_TTL');
    expect(err.message).toBe('msg');
    expect(err.name).toBe('MemoizeError');
  });

  test('is_instance_of_error_and_self', () => {
    const err = new MemoizeError('INVALID_OPTIONS', 'm');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MemoizeError);
  });
});

describe('assertFunction', () => {
  test('accepts_function', () => {
    expect(() => assertFunction(() => 0)).not.toThrow();
  });

  test('rejects_non_function', () => {
    expect(() => assertFunction(123)).toThrow(MemoizeError);
    expect(() => assertFunction(null)).toThrow(MemoizeError);
    expect(() => assertFunction(undefined)).toThrow(MemoizeError);
    expect(() => assertFunction({})).toThrow(MemoizeError);
  });
});

describe('assertMaxSize', () => {
  test('undefined_passes', () => {
    expect(() => assertMaxSize(undefined)).not.toThrow();
  });

  test('positive_integer_passes', () => {
    expect(() => assertMaxSize(1)).not.toThrow();
    expect(() => assertMaxSize(1000)).not.toThrow();
  });

  test('rejects_invalid_values', () => {
    expect(() => assertMaxSize(0)).toThrow(MemoizeError);
    expect(() => assertMaxSize(-1)).toThrow(MemoizeError);
    expect(() => assertMaxSize(1.5)).toThrow(MemoizeError);
    expect(() => assertMaxSize(NaN)).toThrow(MemoizeError);
    expect(() => assertMaxSize(Infinity)).toThrow(MemoizeError);
    expect(() =>
      assertMaxSize('1' as unknown as number),
    ).toThrow(MemoizeError);
  });
});

describe('assertTtlMs', () => {
  test('undefined_and_positive_pass', () => {
    expect(() => assertTtlMs(undefined)).not.toThrow();
    expect(() => assertTtlMs(0.5)).not.toThrow();
    expect(() => assertTtlMs(1000)).not.toThrow();
  });

  test('rejects_invalid_values', () => {
    expect(() => assertTtlMs(0)).toThrow(MemoizeError);
    expect(() => assertTtlMs(-1)).toThrow(MemoizeError);
    expect(() => assertTtlMs(NaN)).toThrow(MemoizeError);
    expect(() => assertTtlMs(Infinity)).toThrow(MemoizeError);
    expect(() =>
      assertTtlMs('5' as unknown as number),
    ).toThrow(MemoizeError);
  });
});

describe('assertKeyFn', () => {
  test('undefined_and_function_pass', () => {
    expect(() => assertKeyFn(undefined)).not.toThrow();
    expect(() => assertKeyFn(() => 0)).not.toThrow();
  });

  test('rejects_non_function', () => {
    expect(() => assertKeyFn('x')).toThrow(MemoizeError);
    expect(() => assertKeyFn(null)).toThrow(MemoizeError);
    expect(() => assertKeyFn(123)).toThrow(MemoizeError);
  });
});

describe('assertClock', () => {
  test('undefined_and_function_pass', () => {
    expect(() => assertClock(undefined)).not.toThrow();
    expect(() => assertClock(() => 0)).not.toThrow();
  });

  test('rejects_non_function', () => {
    expect(() => assertClock(123)).toThrow(MemoizeError);
    expect(() => assertClock('x')).toThrow(MemoizeError);
  });
});
