# tsmemo

Type-safe memoize for sync and async functions with TTL, LRU eviction,
custom keys, and in-flight call de-duplication.

- Zero runtime dependencies.
- Strict TypeScript (`strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`-friendly).
- 100% statement / branch / function / line coverage.
- Sync and async variants share the same option surface.

## Install

```bash
npm install && npm run build
```

## Quick start

```ts
import { memoize, memoizeAsync } from 'tsmemo';

const slowFib = memoize(function fib(n: number): number {
  return n < 2 ? n : slowFib(n - 1) + slowFib(n - 2);
});

slowFib(40); // computed
slowFib(40); // cache hit, instantaneous

const fetchUser = memoizeAsync(
  async (id: number) => fetch(`/users/${id}`).then((r) => r.json()),
  { ttlMs: 60_000, maxSize: 200 },
);

await Promise.all([fetchUser(1), fetchUser(1), fetchUser(1)]);
// ↑ underlying fetch fires once — concurrent calls share the in-flight promise.
```

## Options

| Option            | Type                       | Notes                                                 |
| ----------------- | -------------------------- | ----------------------------------------------------- |
| `keyFn`           | `(...args) => unknown`     | Override the default key derivation.                  |
| `maxSize`         | `number` (positive int)    | LRU eviction once the cache exceeds this size.        |
| `ttlMs`           | `number > 0`               | Per-entry expiry; expired entries are evicted lazily. |
| `clock`           | `() => number`             | Inject a clock for deterministic tests.               |
| `cacheRejections` | `boolean` (async only)     | Default `false` — rejected promises are NOT cached.   |

Invalid options throw `MemoizeError` with a stable `code` field
(`NOT_A_FUNCTION`, `INVALID_MAX_SIZE`, `INVALID_TTL`, `INVALID_KEY_FN`,
`INVALID_CLOCK`, `INVALID_OPTIONS`).

## API

### `memoize(fn, options?) -> MemoizedFn`

Wraps `fn`. Returns a callable with:
- `cache: CacheLike` — the underlying store, exposing `get/set/has/delete/clear/size`.
- `invalidate(...args): boolean` — clear the entry that matches these args.

### `memoizeAsync(fn, options?) -> AsyncMemoizedFn`

Same shape, but: concurrent calls with the same key share a single
in-flight promise; rejections are not cached unless `cacheRejections: true`.

### `MemoCache<K, V>`

Map-backed LRU/TTL cache. Use directly when you want the cache without
the wrapper:

```ts
import { MemoCache } from 'tsmemo';

const cache = new MemoCache<string, number>({ maxSize: 100, ttlMs: 5_000 });
cache.set('answer', 42);
cache.get('answer')?.value; // 42
```

### Key helpers

- `defaultKey(args)` — used internally; returns the unique `NO_ARGS`
  symbol for empty calls, the single argument for 1-arg calls, and a
  stable string serialisation for 2+ args.
- `stableSerialise(value)` — public so you can compose your own keyFn.
  Sorts plain-object keys, encodes `NaN` / `±Infinity` / `BigInt` /
  `Date` / `RegExp` distinctly, and short-circuits cycles to `<cycle>`.

## Running tests

```bash
npm install
npm run typecheck   # tsc --noEmit, full strict
npm test            # jest with 100% coverage gate
```

## License

MIT — see [LICENSE](./LICENSE).
