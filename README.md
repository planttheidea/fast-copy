# fast-copy

<img src="https://img.shields.io/badge/build-passing-brightgreen.svg"/>
<img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg"/>
<img src="https://img.shields.io/badge/license-MIT-blue.svg"/>

A [blazing fast](#benchmarks) deep object copier

## Table of contents

- [Usage](#usage)
  - [Multiple realms](#multiple-realms)
- [Types supported](#types-supported)
- [Benchmarks](#benchmarks)
  - [Simple objects](#simple-objects)
  - [Complex objects](#complex-objects)
  - [Circular objects](#circular-objects)
  - [Special objects](#special-objects)
- [Development](#development)

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

#### Multiple realms

Under the hood, `fast-copy` uses `instanceof` to determine object types, which can cause false negatives when used in combination with `iframe`-based objects. To handle this edge case, you can pass the optional second parameter of `realm` to the `copy` method, which identifies which realm the object comes from and will use that realm to drive both comparisons and constructors for the copies.

```html
<iframe srcdoc="<script>var arr = ['foo', 'bar'];</script>"></iframe>
```

```javascript
const iframe = document.querySelector("iframe");
const arr = iframe.contentWindow.arr;

console.log(copy(arr, iframe.contentWindow)); // ['foo', 'bar']
```

## Types supported

The following object types are deeply cloned when they are either properties on the object passed, or the object itself:

- `Array`
- `ArrayBuffer`
- `Buffer`
- `DataView`
- `Date`
- `Float32Array`
- `Float64Array`
- `Int8Array`
- `Int16Array`
- `Int32Array`
- `Map`
- `Object`
- `RegExp`
- `Set`
- `Uint8Array`
- `Uint8ClampedArray`
- `Uint16Array`
- `Uint32Array`
- `React` components
- Custom constructors

The following object types are copied directly, as they are either primitives, cannot be cloned, or the common use-case implementation does not expect cloning:

- `AsyncFunction`
- `Boolean`
- `Error`
- `Function`
- `GeneratorFunction`
- `Number`
- `Null`
- `Promise`
- `String`
- `Symbol`
- `Undefined`
- `WeakMap`
- `WeakSet`

Circular objects are supported out of the box as well. By default a cache based on `WeakSet` is used, but if `WeakSet` is not available then a standard `Object` fallback is used. The benchmarks quoted below are based on use of `WeakSet`.

## Benchmarks

#### Simple objects

_Small number of properties, all values are primitives_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **1,725,552**       | **0.89%**                |
| clone            | 1,114,295           | 0.82%                    |
| lodash.cloneDeep | 904,031             | 0.51%                    |
| fast-deepclone   | 716,908             | 0.87%                    |
| fast-clone       | 497,748             | 0.88%                    |
| deepclone        | 420,962             | 0.59%                    |

#### Complex objects

_Large number of properties, values are a combination of primitives and complex objects_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **113,553**         | **0.76%**                |
| fast-deepclone   | 101,356             | 0.76%                    |
| deepclone        | 54,401              | 0.80%                    |
| clone            | 51,183              | 0.79%                    |
| fast-clone       | 46,165              | 0.66%                    |
| lodash.cloneDeep | 39,395              | 0.78%                    |

#### Circular objects

_Objects that deeply reference themselves_

|                            | Operations / second | Relative margin of error |
| -------------------------- | ------------------- | ------------------------ |
| **fast-copy**              | **1,011,337**       | **0.80%**                |
| clone                      | 644,481             | 0.67%                    |
| lodash.cloneDeep           | 577,534             | 0.48%                    |
| fast-deepclone             | 359,288             | 0.79%                    |
| deepclone                  | 371,971             | 0.55%                    |
| fast-clone (not supported) | 0                   | 0.00%                    |

#### Special objects

_Custom constructors, React components, etc_

|                  | Operations / second | Relative margin of error |
| ---------------- | ------------------- | ------------------------ |
| **fast-copy**    | **56,013**          | **0.97%**                |
| clone            | 42,107              | 0.87%                    |
| lodash.cloneDeep | 36,113              | 0.74%                    |
| fast-deepclone   | 25,278              | 1.45%                    |
| fast-clone       | 21,450              | 0.86%                    |
| deepclone        | 12,768              | 0.77%                    |

## Development

Standard practice, clone the repo and `npm i` to get the dependencies. The following npm scripts are available:

- benchmark => run benchmark tests against other equality libraries
- build => build dist files with `rollup`
- clean => run `clean:dist`, `clean:es`, and `clean:lib` scripts
- clean:dist => run `rimraf` on the `dist` folder
- clean:es => run `rimraf` on the `es` folder
- clean:lib => run `rimraf` on the `lib` folder
- dev => start webpack playground App
- dist => run `build` and `build:minified` scripts
- lint => run ESLint on all files in `src` folder (also runs on `dev` script)
- lint:fix => run `lint` script, but with auto-fixer
- prepublish:compile => run `lint`, `test:coverage`, `transpile:lib`, `transpile:es`, and `dist` scripts
- start => run `dev`
- test => run AVA with NODE_ENV=test on all files in `test` folder
- test:coverage => run same script as `test` with code coverage calculation via `nyc`
- test:watch => run same script as `test` but keep persistent watcher
- transpile:es => run Babel on all files in `src` folder (transpiled to `es` folder without transpilation of ES2015 export syntax)
- transpile:lib => run Babel on all files in `src` folder (transpiled to `lib` folder)
