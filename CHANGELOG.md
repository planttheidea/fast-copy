# fast-copy CHANGELOG

## 2.1.7

- Republish of [`2.1.6`](#216), as the release process failed mid-publish

## 2.1.6

- Revert [#69](https://github.com/planttheidea/fast-copy/pull/69) and [#71](https://github.com/planttheidea/fast-copy/pull/71), as they broke the package for NodeJS consumption (will be reintroduced in v3, as breaking changes are required)

## 2.1.5 - DO NOT USE

- Ensure `"type": "module"` is set to allow ESM in NodeJS to work [#71](https://github.com/planttheidea/fast-copy/pull/71)

## 2.1.4 - DO NOT USE

- Provide `"exports"` definition in `package.json` [#69](https://github.com/planttheidea/fast-copy/pull/69) (thanks [@liteoood](https://github.com/ilteoood))

## 2.1.3

- Fix source maps not referencing source code [#65](https://github.com/planttheidea/fast-copy/pull/65)

## 2.1.2

- Support `constructor` property override on object [#60](https://github.com/planttheidea/fast-copy/pull/60)
- Provide better support for `constructor` override on non-plain object types [#61](https://github.com/planttheidea/fast-copy/pull/61)
- Remove `tslint` in favor of `@typescript-eslint` [#62](https://github.com/planttheidea/fast-copy/pull/62)

## 2.1.1

- Fix ESM-to-CommonJS issue when using TSC to consume [#37](https://github.com/planttheidea/fast-copy/issues/37)
- Modify `Blob` cloning to use `blob.slice()` instead of `new Blob()` for speed

## 2.1.0

- Support cloning `Blob` [#31](https://github.com/planttheidea/fast-copy/pull/31) (thanks [@fratzigner](https://github.com/fratzinger))
- Fix cloning descriptors that only are getters / setters in strict mode
- Handle errors when defining properties in strict mode

## 2.0.5

- Fix issue copying objects referenced multiple times in source [#28](https://github.com/planttheidea/fast-copy/pull/28) (thanks [@darkowic](https://github.com/darkowic))

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

- Fix cache using `WeakSet` when there was support for `WeakMap`s instead of `WeakSet`s (in case one was polyfilled but not the other)

## 1.1.0

- Add TypeScript and FlowType bindings

## 1.0.1

- Activate tree-shaking

## 1.0.0

- Initial release
