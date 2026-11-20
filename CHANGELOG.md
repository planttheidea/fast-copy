# fast-copy CHANGELOG

## 4.3.3

### Enhancements

- [#167](https://github.com/planttheidea/fast-copy/pull/167) - Improve `copyStrict` performance by assigning standard
  (configurable, enumerable, and writable) properties of plain objects and arrays instead of defining them with
  `Object.defineProperty`, and by not redefining an array `length` that already matches; copies are unchanged, and
  properties are still defined whenever the prototype chain may contain a `Proxy`, such as for custom prototypes or when
  the chain of `Array.prototype` was modified before `fast-copy` loaded (thanks [@g4lb](https://github.com/g4lb))

### Bug fixes

- Preserve accessor properties in `strict` mode when `value` or `writable` is defined on `Object.prototype`; these were
  previously copied as data properties with the getter's current value, since `Object.defineProperty` also reads
  inherited fields of the descriptor
- [#164](https://github.com/planttheidea/fast-copy/pull/164) - Deep copy `Map` keys in addition to values; object keys
  were previously reused by reference, so the copy was not a true deep copy and retained references to the original
  objects, potentially leaking them (reported in [#163](https://github.com/planttheidea/fast-copy/issues/163), thanks
  [@mayankdhingra02](https://github.com/mayankdhingra02))

## 4.3.2

### Bug fixes

- [#166](https://github.com/planttheidea/fast-copy/pull/166) - Copy own properties that shadow an inherited read-only or
  getter-only property in loose mode; `copy` previously threw a `TypeError` for these (reported in
  [#165](https://github.com/planttheidea/fast-copy/issues/165))

## 4.3.1

### Bug fixes

- [#157](https://github.com/planttheidea/fast-copy/pull/157) - Copy `SharedArrayBuffer`s with the `arrayBuffer` method,
  preserving their contents; they previously fell through to the object copier, so copies were empty, and a `strict`
  copy of an object containing both a `SharedArrayBuffer` and a `DataView` over it could throw (thanks
  [@mayankdhingra02](https://github.com/mayankdhingra02))
- [#159](https://github.com/planttheidea/fast-copy/pull/159) - Copy the buffer of a `DataView` with the `arrayBuffer`
  method, so that a custom `arrayBuffer` override is honored; the default copier was previously always used
- [#158](https://github.com/planttheidea/fast-copy/pull/158) - Preserve the subclass of copied resizable `ArrayBuffer`s
  and growable `SharedArrayBuffer`s; copies were previously instances of the base class (thanks
  [@umtong](https://github.com/umtong))
- [#160](https://github.com/planttheidea/fast-copy/pull/160) - Preserve the subclass of copied empty, fixed-length
  `SharedArrayBuffer`s; copies were previously instances of the base class

## 4.3.0

### Enhancements

- [#155](https://github.com/planttheidea/fast-copy/pull/155) - Preserve own `RegExp` properties in `strict` mode (thanks
  [@blueDaydreaming725](https://github.com/blueDaydreaming725))
- [#156](https://github.com/planttheidea/fast-copy/pull/156) - Preserve own properties in `strict` mode for all
  remaining copied types: `ArrayBuffer`, typed arrays (including `Buffer`), `Blob`, `DataView`, and primitive wrappers
  (`Boolean`, `Number`, and `String`)
- [#156](https://github.com/planttheidea/fast-copy/pull/156) - In `strict` mode, circular and repeated references to any
  of these types now resolve to a single copy, including a `DataView` and the buffer it views

### Bug fixes

- [#156](https://github.com/planttheidea/fast-copy/pull/156) - Keep copies of resizable `ArrayBuffer`s and growable
  `SharedArrayBuffer`s resizable, with the same `maxByteLength`; copies were previously fixed-length

## 4.2.0

### Enhancements

- [#150](https://github.com/planttheidea/fast-copy/pull/150) - Preserve own `Date` properties in `strict` mode (thanks
  [@xiehuanyi](https://github.com/xiehuanyi))

### Bug fixes

- [#146](https://github.com/planttheidea/fast-copy/pull/146) - Ensure `Constructor` is a function before performing
  native code check, preventing edge case throw condition (thanks [@fhgffy](https://github.com/fhgffy))
- [#147](https://github.com/planttheidea/fast-copy/pull/147) - Preserve own `__proto__` properties when copying objects
  (thanks [@feritcemkahraman](https://github.com/feritcemkahraman))

## 4.1.2

- [#143](https://github.com/planttheidea/fast-copy/pull/143) - Preserve the `byteOffset` and `byteLength` of a copied
  `DataView`. The copy previously covered the entire backing buffer, so a view over part of a buffer read from the wrong
  position, and reads beyond its original bounds no longer threw.

Thanks to [@pralav-25](https://github.com/pralav-25) for identifying and fixing this.

## 4.1.1

- [#141](https://github.com/planttheidea/fast-copy/pull/141) - Copy the contents of a `Buffer` into memory it owns,
  instead of returning a view over the original's memory. `Buffer` overrides `slice` with one that does not copy, so
  mutating the copy previously mutated the original.
- [#141](https://github.com/planttheidea/fast-copy/pull/141) - Use a `null` prototype for the internal map of
  tag-specific copiers, so that a value carrying a custom `Symbol.toStringTag` cannot resolve to an inherited
  `Object.prototype` member as its copier. Tags such as `toString`, `valueOf`, or `hasOwnProperty` previously produced a
  garbage copy or threw.

## 4.1.0

- [#137](https://github.com/planttheidea/fast-copy/pull/137) - Add `maxDepth` option to `createCopier`, bounding the
  number of nested objects traversed (defaults to `1000`, pass `Infinity` to traverse without a limit)
- [#137](https://github.com/planttheidea/fast-copy/pull/137) - Throw the new `MaxDepthExceededError` when a value is
  nested more deeply than `maxDepth`, instead of exhausting the call stack with a native `RangeError`; the error extends
  `RangeError`, so existing handling continues to work

Thanks to [@lenny-ts](https://github.com/lenny-ts) for identifying this.

### Internal changes

- The `State` object passed to custom `methods` now includes a `depth` property. This is maintained internally and
  should not be modified, but it is a required property on the exported `State` type, so any code constructing a `State`
  directly (such as a test mock) will need to provide it.

## 4.0.4

- [#136](https://github.com/planttheidea/fast-copy/pull/136) - Change `for...in` loop with `hasOwnProperty` check to
  just use `Object.keys` (slight hit to small object iterations, but big win in large objects)
- [#136](https://github.com/planttheidea/fast-copy/pull/136) - Change `for` loops to instead be `for...of` (flat or
  improved across the board)
- [#136](https://github.com/planttheidea/fast-copy/pull/136) - Change `.forEach()` loops to instead be `for...of`

## 4.0.3

- [#130](https://github.com/planttheidea/fast-copy/pull/130) - Remove invalid `Uint64Array` in favor of `BigInt64Array`
  / `BigUint64Array`) (fixes [#128](https://github.com/planttheidea/fast-copy/issues/128))

## 4.0.2

- [#112](https://github.com/planttheidea/fast-copy/pull/112) - Prevent generators from attempting to be copied (fixes
  [#111](https://github.com/planttheidea/fast-copy/issues/111))

## 4.0.1

- [#110](https://github.com/planttheidea/fast-copy/pull/110) - Fix legacy types not aligning with types from build
  package

## 4.0.0

### BREAKING CHANGES

- The default `copy` method is now a named export, and the default export has been removed.
- Legacy environment support has been removed; `Symbol`, `WeakMap`, and `RegExp.prototype.flags` are now expected to be
  present.
- `createCopier` now receives an object of options. The methods passed previously are namespaced under the `methods` key
  in that options object.
- `createStrictCopier` has been removed; please use the `strict` option passed to `createCopier`

## 3.0.2

- [#95](https://github.com/planttheidea/fast-copy/pull/95) - Add support for objects that have a prototype with no
  constructor

## 3.0.1

- [#78](https://github.com/planttheidea/fast-copy/pull/78) - Work when running Node process with `--disable-proto=throw`
  (thanks [@castarco](https://github.com/castarco))

## 3.0.0

**Breaking changes**

- Exports are now always named, so the `.default` suffix is required when accessing
  - CommonJS in Node => `const copy = require('fast-copy').default;`
  - UMD global via CDN => `const copy = globalThis['fast-copy'].default;`
- `copy.strict` is no longer available; it is now available as the explicit `copyStrict` named import
- Options have been removed
  - `isStrict` option has been replaced with importing the separate `copyStrict` method
  - `realm` has been removed entirely, as `instanceof` is no longer used internally
- The `FastCopy` namespace in typings has been removed in favor of explicit import of available types

**Enhancements**

- Support `exports` option, to have bettern handling for different environments (ESM vs CJS vs UMD) and improve
  tree-shaking when supported
- Can now create a custom copier (either standard or strict), allowing maximum performance for specific use-cases
- Small speed improvements when handling certain object types

**Bug fixes**

- Correctly handle primitive wrappers, e.g. `new String('foo')`

## 2.1.7

- Republish of [`2.1.6`](#216), as the release process failed mid-publish

## 2.1.6

- Revert [#69](https://github.com/planttheidea/fast-copy/pull/69) and
  [#71](https://github.com/planttheidea/fast-copy/pull/71), as they broke the package for NodeJS consumption (will be
  reintroduced in v3, as breaking changes are required)

## 2.1.5 - DO NOT USE

- Ensure `"type": "module"` is set to allow ESM in NodeJS to work
  [#71](https://github.com/planttheidea/fast-copy/pull/71)

## 2.1.4 - DO NOT USE

- Provide `"exports"` definition in `package.json` [#69](https://github.com/planttheidea/fast-copy/pull/69) (thanks
  [@liteoood](https://github.com/ilteoood))

## 2.1.3

- Fix source maps not referencing source code [#65](https://github.com/planttheidea/fast-copy/pull/65)

## 2.1.2

- Support `constructor` property override on object [#60](https://github.com/planttheidea/fast-copy/pull/60)
- Provide better support for `constructor` override on non-plain object types
  [#61](https://github.com/planttheidea/fast-copy/pull/61)
- Remove `tslint` in favor of `@typescript-eslint` [#62](https://github.com/planttheidea/fast-copy/pull/62)

## 2.1.1

- Fix ESM-to-CommonJS issue when using TSC to consume [#37](https://github.com/planttheidea/fast-copy/issues/37)
- Modify `Blob` cloning to use `blob.slice()` instead of `new Blob()` for speed

## 2.1.0

- Support cloning `Blob` [#31](https://github.com/planttheidea/fast-copy/pull/31) (thanks
  [@fratzigner](https://github.com/fratzinger))
- Fix cloning descriptors that only are getters / setters in strict mode
- Handle errors when defining properties in strict mode

## 2.0.5

- Fix issue copying objects referenced multiple times in source [#28](https://github.com/planttheidea/fast-copy/pull/28)
  (thanks [@darkowic](https://github.com/darkowic))

## 2.0.4

- Cache length of arrays for faster iteration [#22](https://github.com/planttheidea/fast-copy/pull/22)
- Update dev dependencies and types

## 2.0.3

- Add safety to constructing native objects (fixes #19)

## 2.0.2

- Manually coalesce options instead of use destructuring (performance)

## 2.0.1

- Fix typings declarations - [#17](https://github.com/planttheidea/fast-copy/pull/17)

## 2.0.0

- Rewrite in TypeScript
- Add strict mode (for more accurate and thorough copying, at the expense of less performance)

#### BREAKING CHANGES

- Second parameter is now an object of [options](README.md#options)

## 1.2.4

- Ensure `Date` copy uses realm-specific constructor

## 1.2.3

- Support custom prototype applied to plain object via `Object.create()`

## 1.2.2

- Support copy of extensions of native `Array` with alternative `push()` method

## 1.2.1

- Under-the-hood optimizations per recommendations from #7

## 1.2.0

- Add support for multiple realms

## 1.1.2

- Optimize order of operations for common use cases

## 1.1.1

- Fix cache using `WeakSet` when there was support for `WeakMap`s instead of `WeakSet`s (in case one was polyfilled but
  not the other)

## 1.1.0

- Add TypeScript and FlowType bindings

## 1.0.1

- Activate tree-shaking

## 1.0.0

- Initial release
