# fast-copy

<img src="https://img.shields.io/badge/build-passing-brightgreen.svg"/>
<img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg"/>
<img src="https://img.shields.io/badge/license-MIT-blue.svg"/>

A [blazing fast](#benchmarks) deep object copier

## Table of contents

* [Usage](#usage)
* [Types supported](#types-supported)
* [Benchmarks](#benchmarks)
  * [Simple objects](#simple-objects)
  * [Complex objects](#complex-objects)
  * [Circular objects](#circular-objects)
  * [Special objects](#special-objects)
* [Development](#development)

## Usage

```javascript
import copy from "fast-copy";
import { deepEqual } from "fast-equals";

const object = {
  array: [123, { deep: "value" }],
  map: new Map([["foo", {}], [{ bar: "baz" }, "quz"]])
};

const copiedObject = copy(object);

console.log(copiedObject === object); // false
console.log(deepEqual(copiedObject, object)); // true
```

## Types supported

The following object types are deeply cloned when either properties on the object passed, or the object itself:

* `Array`
* `ArrayBuffer`
* `Buffer`
* `DataView`
* `Date`
* `Float32Array`
* `Float64Array`
* `Int8Array`
* `Int16Array`
* `Int32Array`
* `Map`
* `Object`
* `RegExp`
* `Set`
* `Uint8Array`
* `Uint8ClampedArray`
* `Uint16Array`
* `Uint32Array`
* `React` components
* Custom constructors

The following object types are copied directly, as they are either primitives, cannot be cloned, or the common use case is not to clone them:

* `AsyncFunction`
* `Boolean`
* `Error`
* `Function`
* `GeneratorFunction`
* `Number`
* `Null`
* `Promise`
* `String`
* `Symbol`
* `Undefined`
* `WeakMap`
* `WeakSet`

Circular objects are supported out of the box as well. By default a cache of `WeakSet` is used, but if `WeakSet` is not available then a standard object fallback is used. The benchmarks quoted below are based on use of `WeakSet`.

## Benchmarks

#### Simple objects

_Small number of properties, all values are primitives_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **1,536,378**       | **0.90%**                |
| clone            | 1,146,433           | 0.76%                    |
| lodash.cloneDeep | 955,818             | 0.59%                    |
| fast-deepclone   | 746,497             | 0.75%                    |
| fast-clone       | 515,248             | 0.94%                    |
| deepclone        | 444,649             | 0.73%                    |

#### Complex objects

_Large number of properties, values are a combination of primitives and complex objects_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **110,295**         | **0.75%**                |
| fast-deepclone   | 102,497             | 0.81%                    |
| deepclone        | 57,582              | 0.75%                    |
| clone            | 51,563              | 1.01%                    |
| fast-clone       | 43,956              | 0.74%                    |
| lodash.cloneDeep | 40,257              | 0.79%                    |

#### Circular objects

_Objects that deeply reference themselves_

|                            | Operations / second | Relative margin of error |
| -------------------------- | ------------------- | ------------------------ |
| **fast-copy**              | **921,656**         | **0.72%**                |
| clone                      | 651,385             | 0.69%                    |
| lodash.cloneDeep           | 621,131             | 0.60%                    |
| fast-deepclone             | 385,925             | 0.84%                    |
| deepclone                  | 377,517             | 0.65%                    |
| fast-clone (not supported) | 0                   | 0.00%                    |

#### Special objects

_Custom constructors, React components, etc_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **50,839**          | **0.61%**                |
| clone            | 44,504              | 0.78%                    |
| lodash.cloneDeep | 38,210              | 0.62%                    |
| fast-deepclone   | 26,635              | 0.85%                    |
| fast-clone       | 22,422              | 0.67%                    |
| deepclone        | 13,753              | 0.84%                    |

## Development

Standard practice, clone the repo and `npm i` to get the dependencies. The following npm scripts are available:

* benchmark => run benchmark tests against other equality libraries
* build => build dist files with `rollup`
* clean => run `clean:dist`, `clean:es`, and `clean:lib` scripts
* clean:dist => run `rimraf` on the `dist` folder
* clean:es => run `rimraf` on the `es` folder
* clean:lib => run `rimraf` on the `lib` folder
* dev => start webpack playground App
* dist => run `build` and `build:minified` scripts
* lint => run ESLint on all files in `src` folder (also runs on `dev` script)
* lint:fix => run `lint` script, but with auto-fixer
* prepublish:compile => run `lint`, `test:coverage`, `transpile:lib`, `transpile:es`, and `dist` scripts
* start => run `dev`
* test => run AVA with NODE_ENV=test on all files in `test` folder
* test:coverage => run same script as `test` with code coverage calculation via `nyc`
* test:watch => run same script as `test` but keep persistent watcher
* transpile:es => run Babel on all files in `src` folder (transpiled to `es` folder without transpilation of ES2015 export syntax)
* transpile:lib => run Babel on all files in `src` folder (transpiled to `lib` folder)
