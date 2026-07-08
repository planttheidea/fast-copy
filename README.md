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
      - [`createCache`](#createcache)
      - [`methods`](#methods)
        - [Copier state](#copier-state)
          - [`cache`](#cache)
          - [`copier`](#copier)
          - [`Constructor` / `prototype`](#constructor--prototype)
      - [`strict`](#strict)
  - [Types supported](#types-supported)
  - [Aspects of default copiers](#aspects-of-default-copiers)
    - [Error references are copied directly, instead of creating a new `*Error` object](#error-references-are-copied-directly-instead-of-creating-a-new-error-object)
    - [The constructor of the original object is used, instead of using known globals](#the-constructor-of-the-original-object-is-used-instead-of-using-known-globals)
  - [Benchmarks](#benchmarks)
    - [Simple objects](#simple-objects)
    - [Complex objects](#complex-objects)
    - [Big data](#big-data)
    - [Circular objects](#circular-objects)
    - [Special objects](#special-objects)

## Usage

```js
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

```js
import { copy } from 'fast-copy';

const copied = copy({ foo: 'bar' });
```

### `copyStrict`

Deeply copy the object passed, but with additional strictness when replicating the original object:

- Properties retain their original property descriptor
- Non-enumerable keys are copied
- Non-standard properties (e.g., keys on arrays / maps / sets) are copied

```js
import { copyStrict } from 'fast-copy';

const object = { foo: 'bar' };
object.nonEnumerable = Object.defineProperty(object, 'bar', {
  enumerable: false,
  value: 'baz',
});

const copied = copy(object);
```

**NOTE**: This method is significantly slower than [`copy`](#copy), so it is recommended to only use this when you have
specific use-cases that require it.

### `createCopier`

Create a custom copier based on the type-specific method overrides passed, as well as configuration options for how
copies should be performed. This is useful if you want to squeeze out maximum performance, or perform something other
than a standard deep copy.

```js
import { createCopier } from 'fast-copy';
import { LRUCache } from 'lru-cache';

const copyShallowStrict = createCopier({
  createCache: () => new LRUCache(),
  methods: {
    array: (array) => [...array],
    map: (map) => new Map(map.entries()),
    object: (object) => ({ ...object }),
    set: (set) => new Set(set.values()),
  },
  strict: true,
});
```

#### `createCache`

Method that creates the internal [`cache`](#cache) in the [Copier state](#copier-state). Defaults to creating a new
`WeakMap` instance.

#### `methods`

Methods used for copying specific object types. A list of the methods and which object types they handle:

- `array` => `Array`
- `arrayBuffer`=> `ArrayBuffer`, `Float32Array`, `Float64Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Uint8Array`,
  `Uint8ClampedArray`, `Uint16Array`, `Uint32Array`, `BigInt64Array`, `BigUint64Array`
- `blob` => `Blob`
- `dataView` => `DataView`
- `date` => `Date`
- `error` => `Error`, `AggregateError`, `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`,
  `URIError`
- `map` => `Map`
- `object` => `Object`, or any custom constructor
- `regExp` => `RegExp`
- `set` => `Set`

Each method has the following contract:

```js
type InternalCopier<Value> = (value: Value, state: State) => Value;

interface State {
  Constructor: any;
  cache: WeakMap;
  copier: InternalCopier<any>;
  prototype: any;
}
```

##### Copier state

###### `cache`

If you want to maintain circular reference handling, then you'll need the methods to handle cache population for future
lookups:

```js
function shallowlyCloneArray<Value extends any[]>(
  value: Value,
  state: State
): Value {
  const clone = [...value];

  state.cache.set(value, clone);

  return clone;
}
```

###### `copier`

`copier` is provided for recursive calls with deeply-nested objects.

```js
function deeplyCloneArray<Value extends any[]>(
  value: Value,
  state: State
): Value {
  const clone = [];

  state.cache.set(value, clone);

  value.forEach((item) => state.copier(item, state));

  return clone;
}
```

Note above I am using `forEach` instead of a simple `map`. This is because it is highly recommended to store the clone
in [`cache`](#cache) eagerly when deeply copying, so that nested circular references are handled correctly.

###### `Constructor` / `prototype`

Both `Constructor` and `prototype` properties are only populated with complex objects that are not standard objects or
arrays. This is mainly useful for custom subclasses of these globals, or maintaining custom prototypes of objects.

```js
function deeplyCloneSubclassArray<Value extends CustomArray>(
  value: Value,
  state: State
): Value {
  const clone = new state.Constructor();

  state.cache.set(value, clone);

  value.forEach((item) => clone.push(item));

  return clone;
}

function deeplyCloneCustomObject<Value extends CustomObject>(
  value: Value,
  state: State
): Value {
  const clone = Object.create(state.prototype);

  state.cache.set(value, clone);

  Object.entries(value).forEach(([k, v]) => (clone[k] = v));

  return clone;
}
```

#### `strict`

Enforces strict copying of properties, which includes properties that are not standard for that object. An example would
be a named key on an array.

**NOTE**: This creates a copier that is significantly slower than "loose" mode, so it is recommended to only use this
when you have specific use-cases that require it.

## Types supported

The following object types are deeply cloned when they are either properties on the object passed, or the object itself:

- `Array`
- `ArrayBuffer`
- `Boolean` primitive wrappers (e.g., `new Boolean(true)`)
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
- `Number` primitive wrappers (e.g., `new Number(123)`)
- `Object`
- `RegExp`
- `Set`
- `String` primitive wrappers (e.g., `new String('foo')`)
- `Uint8Array`
- `Uint8ClampedArray`
- `Uint16Array`
- `Uint32Array`
- `React` components
- Custom constructors

The following object types are copied directly, as they are either primitives, cannot be cloned, or the common use-case
implementation does not expect cloning:

- `AsyncFunction`
- `AsyncGenerator`
- `Boolean` primitives
- `Error`
- `Function`
- `Generator`
- `GeneratorFunction`
- `Number` primitives
- `Null`
- `Promise`
- `String` primitives
- `Symbol`
- `Undefined`
- `WeakMap`
- `WeakSet`

Circular objects are supported out of the box. By default, a cache based on `WeakSet` is used, but if `WeakSet` is not
available then a fallback is used. The benchmarks quoted below are based on use of `WeakSet`.

## Aspects of default copiers

Inherently, what is considered a valid copy is subjective because of different requirements and use-cases. For this
library, some decisions were explicitly made for the default copiers of specific object types, and those decisions are
detailed below. If your use-cases require different handling, you can always create your own custom copier with
[`createCopier`](#createcopier).

### Error references are copied directly, instead of creating a new `*Error` object

While it would be relatively trivial to copy over the message and stack to a new object of the same `Error` subclass, it
is a common practice to "override" the message or stack, and copies would not retain this mutation. As such, the
original reference is copied.

### The constructor of the original object is used, instead of using known globals

Starting in ES2015, native globals can be subclassed like any custom class. When copying, we explicitly reuse the
constructor of the original object. However, the expectation is that these subclasses would have the same constructur
signature as their native base class. This is a common community practice, but there is the possibility of inaccuracy if
the contract differs.

## Benchmarks

#### Simple objects

_Small number of properties, all values are primitives_

```bash
┌────────────────────┬────────────────┐
│ Name               │ Ops / sec      │
├────────────────────┼────────────────┤
│ fast-copy          │ 4516637.948706 │
├────────────────────┼────────────────┤
│ lodash.cloneDeep   │ 2726908.524823 │
├────────────────────┼────────────────┤
│ clone              │ 2292947.082887 │
├────────────────────┼────────────────┤
│ ramda              │ 1919887.358374 │
├────────────────────┼────────────────┤
│ fast-clone         │ 1445623.172658 │
├────────────────────┼────────────────┤
│ deepclone          │ 1172068.638112 │
├────────────────────┼────────────────┤
│ fast-copy (strict) │ 1029920.368064 │
└────────────────────┴────────────────┘
Fastest was "fast-copy".
```

#### Complex objects

_Large number of properties, values are a combination of primitives and complex objects_

```bash
┌────────────────────┬───────────────┐
│ Name               │ Ops / sec     │
├────────────────────┼───────────────┤
│ fast-copy          │ 202418.444691 │
├────────────────────┼───────────────┤
│ deepclone          │ 139120.811183 │
├────────────────────┼───────────────┤
│ clone              │ 122191.364796 │
├────────────────────┼───────────────┤
│ ramda              │ 106986.690081 │
├────────────────────┼───────────────┤
│ fast-clone         │ 102390.033243 │
├────────────────────┼───────────────┤
│ fast-copy (strict) │ 72306.017635  │
├────────────────────┼───────────────┤
│ lodash.cloneDeep   │ 68706.681189  │
└────────────────────┴───────────────┘
Fastest was "fast-copy".
```

#### Big data

_Very large number of properties with high amount of nesting, mainly objects and arrays_

```bash
┌────────────────────┬────────────┐
│ Name               │ Ops / sec  │
├────────────────────┼────────────┤
│ fast-copy          │ 564.726583 │
├────────────────────┼────────────┤
│ fast-clone         │ 265.243854 │
├────────────────────┼────────────┤
│ lodash.cloneDeep   │ 160.972258 │
├────────────────────┼────────────┤
│ deepclone          │ 158.201556 │
├────────────────────┼────────────┤
│ fast-copy (strict) │ 135.031983 │
├────────────────────┼────────────┤
│ clone              │ 122.876256 │
├────────────────────┼────────────┤
│ ramda              │ 35.226104  │
└────────────────────┴────────────┘
Fastest was "fast-copy".
```

#### Circular objects

_Simple object with a deeply nested reference to itself_

```bash
┌────────────────────┬────────────────┐
│ Name               │ Ops / sec      │
├────────────────────┼────────────────┤
│ fast-copy          │ 2265437.452915 │
├────────────────────┼────────────────┤
│ deepclone          │ 1078459.808203 │
├────────────────────┼────────────────┤
│ lodash.cloneDeep   │ 989211.772997  │
├────────────────────┼────────────────┤
│ fast-copy (strict) │ 865453.141899  │
├────────────────────┼────────────────┤
│ clone              │ 748230.731936  │
├────────────────────┼────────────────┤
│ ramda              │ 564490.882674  │
├────────────────────┼────────────────┤
│ fast-clone         │ 0              │
└────────────────────┴────────────────┘
Fastest was "fast-copy".
```

#### Special objects

_Custom constructors, React components, etc_

```bash
┌────────────────────┬───────────────┐
│ Name               │ Ops / sec     │
├────────────────────┼───────────────┤
│ fast-copy          │ 134318.379975 │
├────────────────────┼───────────────┤
│ lodash.cloneDeep   │ 62990.463065  │
├────────────────────┼───────────────┤
│ clone              │ 59386.329843  │
├────────────────────┼───────────────┤
│ fast-clone         │ 53886.995853  │
├────────────────────┼───────────────┤
│ ramda              │ 27974.450157  │
├────────────────────┼───────────────┤
│ deepclone          │ 23498.796755  │
├────────────────────┼───────────────┤
│ fast-copy (strict) │ 18955.802659  │
└────────────────────┴───────────────┘
Fastest was "fast-copy".
```
