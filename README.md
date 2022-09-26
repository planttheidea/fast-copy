# fast-copy

<img src="https://img.shields.io/badge/build-passing-brightgreen.svg"/>
<img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg"/>
<img src="https://img.shields.io/badge/license-MIT-blue.svg"/>

A [blazing fast](#benchmarks) deep object copier

## Table of contents

- [fast-copy](#fast-copy)
  - [Table of contents](#table-of-contents)
  - [Usage](#usage)
  - [API](#api)
    - [`copy`](#copy)
    - [`copyStrict`](#copystrict)
  - [Types supported](#types-supported)
  - [Aspects of copying](#aspects-of-copying)
    - [Error references are copied over (instead of creating a new `*Error` object)](#error-references-are-copied-over-instead-of-creating-a-new-error-object)
    - [The constructor of the original object is used, instead of using known globals.](#the-constructor-of-the-original-object-is-used-instead-of-using-known-globals)
  - [Benchmarks](#benchmarks)
      - [Simple objects](#simple-objects)
      - [Complex objects](#complex-objects)
      - [Big data](#big-data)
      - [Circular objects](#circular-objects)
      - [Special objects](#special-objects)
  - [Development](#development)

## Usage

```javascript
import { copy } from 'fast-copy';
import { deepEqual } from 'fast-equals';

const object = {
  array: [123, { deep: 'value' }],
  map: new Map([
    ['foo', {}],
    [{ bar: 'baz' }, 'quz'],
  ]),
};

const copiedObject = copy(object);

console.log(copiedObject === object); // false
console.log(deepEqual(copiedObject, object)); // true
```

## API

### `copy`

Deeply copy the object passed.

```ts
import { copy } from 'fast-copy';

const copied = copy({ foo: 'bar' });
```

### `copyStrict`

Deeply copy the object passed, but with additional strictness when replicating the original object:

- Properties retain their original property descriptor
- Non-enumerable keys are copied
- Non-standard properties (e.g., keys on an `Array` object) are copied

```ts
import { copyStrict } from 'fast-copy';

const object = { foo: 'bar' };
object.nonEnumerable = Object.defineProperty(object, 'bar', {
  enumerable: false,
  value: 'baz',
});

const copied = copy(object);
```

**NOTE**: This method is significantly slower than [`copy`](#copy), so it is recommended to only use this when you have specific use-cases that require it.

## Types supported

The following object types are deeply cloned when they are either properties on the object passed, or the object itself:

- `Array`
- `ArrayBuffer`
- `Blob`
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

Circular objects are supported out of the box. By default, a cache based on `WeakSet` is used, but if `WeakSet` is not available then a fallback is used. The benchmarks quoted below are based on use of `WeakSet`.

## Aspects of copying

Inherently, what is considered a valid copy is subjective because of different requirements and use-cases. For this library, some decisions were explicitly made.

### Error references are copied over (instead of creating a new `*Error` object)

While it would be relatively trivial to copy over the message and stack to a new object of the same `Error` subclass, it is a common practice to "override" the message or stack, and copies would not retain this mutation. As such, the original reference is copied.

### The constructor of the original object is used, instead of using known globals.

Starting in ES2015, native globals can be subclassed like any custom class. When copying, we explicitly reuse the constructor of the original object. However, the expectation is that these subclasses would have the same constructur signature as their native base class. This is a common community practice, however because there is the possibility of inaccuracy if the contract differs, it should be noted.

## Benchmarks

#### Simple objects

_Small number of properties, all values are primitives_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **2,692,822**       |
| clone              | 1,420,277           |
| lodash.cloneDeep   | 1,277,213           |
| fast-deepclone     | 768,982             |
| ramda              | 719,948             |
| fast-clone         | 567,342             |
| deepclone          | 509,547             |
| fast-copy (strict) | 420,804             |

#### Complex objects

_Large number of properties, values are a combination of primitives and complex objects_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **109,352**         |
| fast-deepclone     | 101,808             |
| ramda              | 93,103              |
| deepclone          | 74,270              |
| fast-clone         | 49,911              |
| clone              | 46,355              |
| lodash.cloneDeep   | 43,900              |
| fast-copy (strict) | 33,440              |

#### Big data

_Very large number of properties with high amount of nesting, mainly objects and arrays_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | 123                 |
| fast-deepclone     | 101                 |
| fast-clone         | 93                  |
| lodash.cloneDeep   | 92                  |
| deepclone          | 66                  |
| clone              | 50                  |
| fast-copy (strict) | 42                  |
| ramda              | 5                   |

#### Circular objects

_Objects that deeply reference themselves_

|                            | Operations / second |
| -------------------------- | ------------------- |
| **fast-copy**              | **1,143,074**       |
| ramda                      | 750,430             |
| clone                      | 722,632             |
| lodash.cloneDeep           | 580,005             |
| deepclone                  | 490,824             |
| fast-deepclone             | 446,585             |
| fast-copy (strict)         | 321,678             |
| fast-clone (not supported) | 0                   |

#### Special objects

_Custom constructors, React components, etc_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **78,422**          |
| clone              | 52,165              |
| lodash.cloneDeep   | 39,648              |
| ramda              | 32,372              |
| fast-deepclone     | 27,518              |
| fast-clone         | 27,495              |
| deepclone          | 16,552              |
| fast-copy (strict) | 12,509              |

## Development

Standard practice, clone the repo and `yarn` (or `npm i`) to get the dependencies. The following npm scripts are available:

- benchmark => run benchmark tests against other equality libraries
- build => run `build:files` and `build:types`
- build:files => build dist files with `rollup`
- build:types => build TypeScript types for consumers
- clean => run `rimraf` on the `dist` folder
- dev => start webpack playground App
- dist => run `build` and `build:minified` scripts
- lint => run ESLint on all files in `src` folder (also runs on `dev` script)
- lint:fix => run `lint` script, but with auto-fixer
- prepublishOnly => run `lint`, `test:coverage`, and `dist` scripts
- release => run `prepublishOnly` and release with new version
- release:beta => run `prepublishOnly` and release with new beta version
- release:dry => run `prepublishOnly` and simulate a new release
- start => run `dev`
- test => run AVA with NODE_ENV=test on all files in `test` folder
- test:coverage => run same script as `test` with code coverage calculation via `nyc`
- test:watch => run same script as `test` but keep persistent watcher
