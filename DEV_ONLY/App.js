// external dependencies
import {deepEqual, sameValueZeroEqual, shallowEqual} from 'fast-equals';
import _ from 'lodash';
import React from 'react';

import copy from '../src';
import {isObjectCopyable} from '../src/utils';

function Foo(value) {
  this.value = value;

  return this;
}

const object = {
  array: ['foo', {bar: 'baz'}],
  arrayBuffer: new ArrayBuffer(8),
  boolean: true,
  dataView: new DataView(new ArrayBuffer(16)),
  deeply: {
    nested: {
      reference: {}
    }
  },
  error: new Error('boom'),
  fn() {
    return 'foo';
  },
  foo: new Foo('value'),
  map: new Map().set('foo', {bar: 'baz'}),
  nan: NaN,
  nil: null,
  number: 123,
  object: {foo: {bar: 'baz'}},
  promise: Promise.resolve('foo'),
  react: React.createElement('main', {
    children: [
      React.createElement('h1', {children: 'Title'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('p', {children: 'Content'}),
      React.createElement('div', {
        children: [
          React.createElement('div', {
            children: 'Item',
            style: {flex: '1 1 auto'}
          }),
          React.createElement('div', {
            children: 'Item',
            style: {flex: '1 1 0'}
          })
        ],
        style: {display: 'flex'}
      })
    ]
  }),
  regexp: /foo/,
  set: new Set().add('foo').add({bar: 'baz'}),
  string: 'foo',
  symbol: Symbol('foo'),
  typedArray: new Uint8Array([12, 15]),
  undef: undefined,
  weakmap: new WeakMap([[{}, 'foo'], [{}, 'bar']]),
  weakset: new WeakSet([{}, {}]),
  [Symbol('key')]: 'value'
};

object.deeply.nested.reference = object;

const primitiveKeys = [
  'boolean',
  'error',
  'fn',
  'nan',
  'nil',
  'number',
  'promise',
  'string',
  'symbol',
  'undef',
  'weakmap',
  'weakset'
];

const newObject = copy(object);

console.log(object, newObject);

console.log('is equal object', sameValueZeroEqual(object, newObject));
console.log('is shallowEqual object', shallowEqual(object, newObject));
console.log('is deepEqual object', deepEqual(object, newObject));

console.log('lodash copy', _.cloneDeep(object));

Object.keys(object).forEach((key) => {
  console.group(key);
  console.log(`new object has key ${key}`, Object.prototype.hasOwnProperty.call(newObject, key));

  if (~primitiveKeys.indexOf(key)) {
    console.log(`is ${key} equal`, sameValueZeroEqual(object[key], newObject[key]));
  } else {
    console.log(`is ${key} not equal`, !sameValueZeroEqual(object[key], newObject[key]));
    console.log(`is ${key} equivalent`, deepEqual(object[key], newObject[key]));
  }

  console.log('can copy deeply', isObjectCopyable(object[key], {has: () => false}));

  console.log(`copy of ${key} type`, copy(object[key]));
  console.groupEnd(key);
});
