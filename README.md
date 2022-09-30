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
    - [`createCopier`](#createcopier)
    - [`createStrictCopier`](#createstrictcopier)
      - [Copier methods](#copier-methods)
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
import copy from 'fast-copy';

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

### `createCopier`

Create a custom copier based on the type-specific methods passed. This is useful if you want to squeeze out maximum performance, or perform something other than a standard deep copy.

```ts
import { createCopier } from 'fast-copy';

const copyShallow = createCopier({
  array: (array) => [...array],
  map: (map) => new Map(map.entries()),
  object: (object) => ({ ...object }),
  set: (set) => new Set(set.values()),
});
```

### `createStrictCopier`

Create a custom copier based on the type-specific methods passed, but defaulting to the same functions normally used for `copyStrict`. This is useful if you want to squeeze out better performance while maintaining strict requirements, or perform something other than a strict deep copy.

```ts
const createStrictClone = (value, clone) =>
  Object.getOwnPropertyNames(value).reduce(
    (clone, property) =>
      Object.defineProperty(
        clone,
        property,
        Object.getOwnPropertyDescriptor(value, property) || {
          configurable: true,
          enumerable: true,
          value: clone[property],
          writable: true,
        }
      ),
    clone
  );

const copyStrictShallow = createStrictCopier({
  array: (array) => createStrictClone(array, []),
  map: (map) => createStrictClone(map, new Map(map.entries())),
  object: (object) => createStrictClone(object, {}),
  set: (set) => createStrictClone(set, new Set(set.values())),
});
```

**NOTE**: This method is significantly slower than [`copy`](#copy), so it is recommended to only use this when you have specific use-cases that require it.

#### Copier methods

- `array` => Array
- `arrayBuffer`=> ArrayBuffer, Float32Array, Float64Array, Int8Array, Int16Array, Int32Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, Uint64Array
- `blob` => Blob
- `dataView` => DataView
- `date` => Date
- `error` => Error, AggregateError, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError
- `map` => Map
- `object` => Object, or any custom constructor
- `regExp` => RegExp
- `set` => Set

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
| **fast-copy**      | **5,880,312**       |
| lodash.cloneDeep   | 2,706,261           |
| clone              | 2,207,231           |
| deepclone          | 1,274,810           |
| fast-clone         | 1,239,952           |
| ramda              | 1,146,152           |
| fast-copy (strict) | 852,382             |

#### Complex objects

_Large number of properties, values are a combination of primitives and complex objects_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **162,858**         |
| ramda              | 142,104             |
| deepclone          | 133,607             |
| fast-clone         | 101,143             |
| clone              | 70,872              |
| fast-copy (strict) | 62,961              |
| lodash.cloneDeep   | 62,060              |

#### Big data

_Very large number of properties with high amount of nesting, mainly objects and arrays_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | 303                 |
| fast-clone         | 245                 |
| deepclone          | 151                 |
| lodash.cloneDeep   | 150                 |
| clone              | 93                  |
| fast-copy (strict) | 90                  |
| ramda              | 42                  |

#### Circular objects

_Objects that deeply reference themselves_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **2,420,466**       |
| deepclone          | 1,386,896           |
| ramda              | 1,024,108           |
| lodash.cloneDeep   | 989,796             |
| clone              | 987,721             |
| fast-copy (strict) | 617,602             |
| fast-clone         | 0 (not supported)   |

#### Special objects

_Custom constructors, React components, etc_

|                    | Operations / second |
| ------------------ | ------------------- |
| **fast-copy**      | **152,792**         |
| clone              | 74,347              |
| fast-clone         | 66,576              |
| lodash.cloneDeep   | 64,760              |
| ramda              | 53,542              |
| deepclone          | 28,823              |
| fast-copy (strict) | 21,362              |

## Development

Standard practice, clone the repo and `yarn` (or `npm i`) to get the dependencies. The following npm scripts are available:

- benchmark => run benchmark tests against other equality libraries
- build => run `build:esm`, `build:cjs`, `build:umd`, and `build:min` scripts
- build:cjs => build CJS files and types
- build:esm => build ESM files and types
- build:min => build minified files and types
- build:umd => build UMD files and types
- clean => run `rimraf` on the `dist` folder
- dev => start webpack playground App
- dist => run `clean` and `build` scripts
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
- typecheck => run `tsc` on the codebase
