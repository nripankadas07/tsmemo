import * as api from '../src';

describe('api_surface', () => {
  test('exposes_memoize_helpers', () => {
    expect(typeof api.memoize).toBe('function');
    expect(typeof api.memoizeAsync).toBe('function');
  });

  test('exposes_cache_class', () => {
    expect(typeof api.MemoCache).toBe('function');
  });

  test('exposes_error_class', () => {
    expect(typeof api.MemoizeError).toBe('function');
    const err = new api.MemoizeError('NOT_A_FUNCTION', 'x');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(api.MemoizeError);
    expect(err.name).toBe('MemoizeError');
    expect(err.code).toBe('NOT_A_FUNCTION');
  });

  test('exposes_key_helpers', () => {
    expect(typeof api.defaultKey).toBe('function');
    expect(typeof api.stableSerialise).toBe('function');
    expect(typeof api.NO_ARGS).toBe('symbol');
  });
});
