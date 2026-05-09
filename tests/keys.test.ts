import {
  NO_ARGS,
  defaultKey,
  stableSerialise,
} from '../src/keys';

describe('default_key', () => {
  test('zero_args_returns_sentinel', () => {
    expect(defaultKey([])).toBe(NO_ARGS);
  });

  test('single_arg_returns_value_directly', () => {
    expect(defaultKey([42])).toBe(42);
    const obj = {};
    expect(defaultKey([obj])).toBe(obj);
  });

  test('multi_arg_returns_string', () => {
    const k = defaultKey([1, 2, 3]);
    expect(typeof k).toBe('string');
  });

  test('multi_arg_keys_collide_when_equivalent', () => {
    expect(defaultKey([1, 2])).toBe(defaultKey([1, 2]));
    expect(defaultKey([1, 2])).not.toBe(defaultKey([2, 1]));
  });
});

describe('stable_serialise', () => {
  test('null_and_undefined', () => {
    expect(stableSerialise(null)).toBe('null');
    expect(stableSerialise(undefined)).toBe('u');
  });

  test('strings_and_booleans', () => {
    expect(stableSerialise('hi')).toContain('hi');
    expect(stableSerialise(true)).toBe('true');
    expect(stableSerialise(false)).toBe('false');
  });

  test('numbers_normalise_special_values', () => {
    expect(stableSerialise(NaN)).toBe('NaN');
    expect(stableSerialise(Infinity)).toBe('+Inf');
    expect(stableSerialise(-Infinity)).toBe('-Inf');
    expect(stableSerialise(3.14)).toBe('n:3.14');
  });

  test('bigint_and_symbol_and_function', () => {
    expect(stableSerialise(10n)).toBe('bi:10');
    expect(stableSerialise(Symbol('x'))).toMatch(/^sy:/);
    function named() {}
    expect(stableSerialise(named)).toBe('fn:named');
    expect(stableSerialise(() => 0)).toBe('fn:_');
  });

  test('arrays_and_plain_objects_with_sorted_keys', () => {
    expect(stableSerialise([1, 'x'])).toBe('a:[n:1,s:"x"]');
    expect(stableSerialise({ b: 1, a: 2 })).toBe(
      stableSerialise({ a: 2, b: 1 }),
    );
  });

  test('date_and_regexp_have_dedicated_encodings', () => {
    expect(stableSerialise(new Date(1000))).toBe('d:1000');
    expect(stableSerialise(/x/gi)).toMatch(/^r:x\//);
  });

  test('cycles_are_handled', () => {
    const cyc: Record<string, unknown> = { name: 'a' };
    cyc.self = cyc;
    expect(stableSerialise(cyc)).toContain('<cycle>');
  });
});
