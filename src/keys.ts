/**
 * Default key derivation for memoized calls.
 *
 * - 0 args → a unique sentinel (so the no-arg case is still memoized).
 * - 1 arg  → the argument value itself (Map can key any value, including
 *            `undefined`, `NaN`, objects via reference equality).
 * - 2+ args → a stable JSON serialisation. Plain objects are emitted with
 *            sorted keys so `{a:1, b:2}` and `{b:2, a:1}` collide, and
 *            `BigInt`, `undefined`, functions, and symbols are encoded
 *            with explicit type tags so they don't collide with strings.
 */
export const NO_ARGS: unique symbol = Symbol('tsmemo.no-args');

export function defaultKey(args: readonly unknown[]): unknown {
  if (args.length === 0) return NO_ARGS;
  if (args.length === 1) return args[0];
  return stableSerialise(args);
}

/**
 * JSON-like stable serialiser. Public so callers can pass it as a custom
 * `keyFn` or compose with one of their own.
 */
export function stableSerialise(value: unknown): string {
  const seen = new WeakSet<object>();
  return serialise(value, seen);
}

function serialise(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return 'null';
  if (value === undefined) return 'u';
  const t = typeof value;
  if (t === 'string') return `s:${JSON.stringify(value)}`;
  if (t === 'number') return serialiseNumber(value as number);
  if (t === 'boolean') return value ? 'true' : 'false';
  if (t === 'bigint') return `bi:${(value as bigint).toString()}`;
  if (t === 'symbol') return `sy:${(value as symbol).toString()}`;
  if (t === 'function') return `fn:${(value as () => unknown).name || '_'}`;
  return serialiseObject(value as object, seen);
}

function serialiseNumber(n: number): string {
  if (Number.isNaN(n)) return 'NaN';
  if (n === Infinity) return '+Inf';
  if (n === -Infinity) return '-Inf';
  return `n:${String(n)}`;
}

function serialiseObject(value: object, seen: WeakSet<object>): string {
  if (seen.has(value)) return '<cycle>';
  seen.add(value);
  if (Array.isArray(value)) return serialiseArray(value, seen);
  if (value instanceof Date) return `d:${value.getTime()}`;
  if (value instanceof RegExp) return `r:${value.source}/${value.flags}`;
  return serialisePlainObject(value as Record<string, unknown>, seen);
}

function serialiseArray(value: readonly unknown[], seen: WeakSet<object>): string {
  const parts = value.map((item) => serialise(item, seen));
  return `a:[${parts.join(',')}]`;
}

function serialisePlainObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>,
): string {
  const keys = Object.keys(value).sort();
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${serialise(value[key], seen)}`,
  );
  return `o:{${parts.join(',')}}`;
}
