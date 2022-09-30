import React from 'react';
import cloneDeep from 'lodash/cloneDeep';

import copy, { copyStrict, createCopier, createStrictCopier } from '../src';

// import '../benchmarks';

type PlainObject = {
  [key: string]: any;
};

class Foo {
  value: any;

  constructor(value: any) {
    this.value = value;
  }
}

const object: PlainObject = {
  arguments: (function (foo, bar, baz) {
    return arguments;
  })('foo', 'bar', 'baz'),
  array: ['foo', { bar: 'baz' }],
  arrayBuffer: new ArrayBuffer(8),
  blob: new Blob(['<a id="a">hey!</a>'], { type: 'text/html' }),
  boolean: true,
  customPrototype: Object.create({
    method() {
      return 'foo';
    },
    value: 'value',
  }),
  date: new Date(2000, 0, 1),
  dataView: new DataView(new ArrayBuffer(16)),
  deeply: {
    nested: {
      reference: {},
    },
  },
  error: new Error('boom'),
  fn() {
    return 'foo';
  },
  foo: new Foo('value'),
  map: (() => {
    const map = new Map().set('foo', { bar: 'baz' });

    // @ts-ignore
    map.foo = 'bar';

    return map;
  })(),
  nan: NaN,
  nil: null,
  number: 123,
  object: { foo: { bar: 'baz' } },
  promise: Promise.resolve('foo'),
  react: React.createElement('main', {
    children: [
      React.createElement('h1', { children: 'Title' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('p', { children: 'Content' }),
      React.createElement('div', {
        children: [
          React.createElement('div', {
            children: 'Item',
            style: { flex: '1 1 auto' },
          }),
          React.createElement('div', {
            children: 'Item',
            style: { flex: '1 1 0' },
          }),
        ],
        style: { display: 'flex' },
      }),
    ],
  }),
  regexp: /foo/gi,
  set: new Set().add('foo').add({ bar: 'baz' }),
  string: 'foo',
  symbol: Symbol('foo'),
  typedArray: new Uint8Array([12, 15]),
  undef: undefined,
  weakmap: new WeakMap([
    [{}, 'foo'],
    [{}, 'bar'],
  ]),
  weakset: new WeakSet([{}, {}]),
  [Symbol('key')]: 'value',
};

object.array.foo = 'bar';

Object.defineProperty(object.object, 'not configurable', {
  configurable: false,
  enumerable: true,
  value: 'not configurable',
  writable: true,
});

Object.defineProperty(object.object, 'not enumerable', {
  configurable: true,
  enumerable: false,
  value: 'not enumerable',
  writable: true,
});

Object.defineProperty(object.object, 'readonly', {
  enumerable: true,
  value: 'readonly',
});

object.deeply.nested.reference = object;

const copyShallow = createCopier({
  array: (array) => [...array],
  map: (map) => new Map(map.entries()),
  object: (object) => ({ ...object }),
  set: (set) => new Set(set.values()),
});

const copyOwnProperties = (value, clone) =>
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
  array: (array) => copyOwnProperties(array, []),
  map: (map) => copyOwnProperties(map, new Map(map.entries())),
  object: (object) => copyOwnProperties(object, {}),
  set: (set) => copyOwnProperties(set, new Set(set.values())),
});

console.group('fast-copy');
console.log('original', object);
console.log('copy', copy(object));
console.log('copyStrict', copyStrict(object));
console.log('copyShallow', copyShallow(object));
console.log('copyStrictShallow', copyStrictShallow(object));
console.groupEnd();

console.group('lodash.cloneDeep');
console.log('original', object);
console.log('copy', cloneDeep(object));
console.groupEnd();
