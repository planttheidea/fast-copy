# fast-copy CHANGELOG

## 2.0.0

- Rewrite in TypeScript
- Add strict mode (for more accurate and thorough copying, at the expense of less performance)

#### BREAKING CHANGES

- Second parameter is now an object of options
  - `isStrict` determines if strict copying is used (defaults to `false`)
  - `realm` determines the realm the object comparison is based on (defaults to global object)

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

- Fix cache using `WeakSet` when there was support for `WeakMap`s instead of `WeakSet`s (in case one was polyfilled but not the other)

## 1.1.0

- Add TypeScript and FlowType bindings

## 1.0.1

- Activate tree-shaking

## 1.0.0

- Initial release
