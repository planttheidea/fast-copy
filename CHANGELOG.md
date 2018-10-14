# fast-copy CHANGELOG

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
