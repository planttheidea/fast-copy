// test
import test from 'ava';
import React from 'react';

// src
import copy from 'src/index';
import * as constants from 'src/constants';

const SIMPLE_TYPES = {
  boolean: true,
  error: new Error('boom'),
  fn() {
    return 'foo';
  },
  nan: NaN,
  nil: null,
  number: 123,
  promise: Promise.resolve('foo'),
  string: 'foo',
  undef: undefined,
  weakmap: new WeakMap([[{}, 'foo'], [{}, 'bar']]),
  weakset: new WeakSet([{}, {}]),
  [Symbol('key')]: 'value',
};

const COMPLEX_TYPES = {
  arguments: (function() {
    return arguments;
  }('foo', 'bar', 'baz')),
  array: ['foo', {bar: 'baz'}],
  arrayBuffer: new ArrayBuffer(8),
  buffer: new Buffer('this is a test buffer'),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  float32Array: new Float32Array([12, 15]),
  float64Array: new Float64Array([12, 15]),
  int8Array: new Int8Array([12, 15]),
  int16Array: new Int16Array([12, 15]),
  int32Array: new Int32Array([12, 15]),
  map: new Map().set('foo', {bar: {baz: 'quz'}}),
  object: {foo: {bar: 'baz'}},
  regexp: /foo/,
  set: new Set().add('foo').add({bar: {baz: 'quz'}}),
  uint8Array: new Uint8Array([12, 15]),
  uint8ClampedArray: new Uint8ClampedArray([12, 15]),
  uint16Array: new Uint16Array([12, 15]),
  uint32Array: new Uint32Array([12, 15]),
};

const CIRCULAR = {
  deeply: {
    nested: {
      reference: {},
    },
  },
  other: {},
};

CIRCULAR.deeply.nested.reference = CIRCULAR;
CIRCULAR.other.reference = CIRCULAR;

function Foo(value) {
  this.value = value;

  return this;
}

const CUSTOM_PROTOTYPE = {
  value: 'value',
  method() {
    return 'foo';
  }
}

const SPECIAL_TYPES = {
  foo: new Foo('value'),
  customProto: Object.create(CUSTOM_PROTOTYPE),
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
            style: {flex: '1 1 auto'},
          }),
          React.createElement('div', {
            children: 'Item',
            style: {flex: '1 1 0'},
          }),
        ],
        style: {display: 'flex'},
      }),
    ],
  }),
};

test('if copy will copy an empty object', (t) => {
  const object = {};

  const result = copy(object);

  t.not(result, object);
  t.deepEqual(result, object);
});

test.serial('if copy will copy the simple types directly', (t) => {
  const result = copy(SIMPLE_TYPES);

  t.not(result, SIMPLE_TYPES);
  t.deepEqual(result, SIMPLE_TYPES);

  Object.keys(SIMPLE_TYPES).forEach((key) => {
    t.is(result[key], SIMPLE_TYPES[key], key);
  });
});

test.serial('if copy will copy the complex types deeply', (t) => {
  const result = copy(COMPLEX_TYPES);

  const {arguments: originalArgs, ...complexTypes} = COMPLEX_TYPES;
  const {arguments: newArgs, ...equivalentComplexTypes} = result;

  t.not(equivalentComplexTypes, complexTypes);
  t.deepEqual(equivalentComplexTypes, complexTypes);
  t.deepEqual(newArgs, {...originalArgs});

  Object.keys(complexTypes).forEach((key) => {
    t.not(equivalentComplexTypes[key], complexTypes[key]);
    t.deepEqual(equivalentComplexTypes[key], complexTypes[key], key);
  });
});

test.serial('if copy will copy the circular object correctly', (t) => {
  const result = copy(CIRCULAR);

  t.not(result, CIRCULAR);
  t.deepEqual(result, CIRCULAR);

  Object.keys(CIRCULAR).forEach((key) => {
    t.not(result[key], CIRCULAR[key]);
    t.deepEqual(result[key], CIRCULAR[key], key);
  });
});

test.serial('if copy will copy the special types correctly', (t) => {
  const result = copy(SPECIAL_TYPES);

  t.not(result, SPECIAL_TYPES);
  t.deepEqual(result, SPECIAL_TYPES);

  Object.keys(SPECIAL_TYPES).forEach((key) => {
    t.not(result[key], SPECIAL_TYPES[key]);
    t.deepEqual(result[key], SPECIAL_TYPES[key], key);
    t.is(Object.getPrototypeOf(result[key]), Object.getPrototypeOf(SPECIAL_TYPES[key]), key + ' prototypes do not match');
  });
});

test.serial('if copy will handle when buffers are not supported', (t) => {
  const support = constants.HAS_BUFFER_SUPPORT;

  constants.HAS_BUFFER_SUPPORT = false;

  const cleanComplexTypes = Object.keys(COMPLEX_TYPES).reduce((types, key) => {
    if (key !== 'buffer' && key !== 'arguments') {
      types[key] = COMPLEX_TYPES[key];
    }

    return types;
  }, {});

  const result = copy(cleanComplexTypes);

  Object.keys(cleanComplexTypes).forEach((key) => {
    t.not(result[key], cleanComplexTypes[key]);
    t.deepEqual(result[key], cleanComplexTypes[key], key);
  });

  constants.HAS_BUFFER_SUPPORT = support;
});

test.serial('if copy will handle when arrayBuffers are not supported', (t) => {
  const support = constants.HAS_ARRAYBUFFER_SUPPORT;

  constants.HAS_ARRAYBUFFER_SUPPORT = false;

  const cleanComplexTypes = Object.keys(COMPLEX_TYPES).reduce((types, key) => {
    if (
      !~[
        'arguments',
        'arrayBuffer',
        'dataView',
        'float32Array',
        'float64Array',
        'int8Array',
        'int16Array',
        'int32Array',
        'uint8Array',
        'uint8ClampedArray',
        'uint16Array',
        'uint32Array',
      ].indexOf(key)
    ) {
      types[key] = COMPLEX_TYPES[key];
    }

    return types;
  }, {});

  const result = copy(cleanComplexTypes);

  Object.keys(cleanComplexTypes).forEach((key) => {
    t.not(result[key], cleanComplexTypes[key]);
    t.deepEqual(result[key], cleanComplexTypes[key], key);
  });

  constants.HAS_ARRAYBUFFER_SUPPORT = support;
});

test('if copy will handle alternative scope', (t) => {
  const scope = {
    Object(key, value) {
      this[key] = value;

      return this;
    },
  };
  const object = new scope.Object('foo', 'bar');

  t.false(object.constructor === Object);

  const result = copy(object, scope);

  t.false(object.constructor === Object);
  t.deepEqual(result, {foo: 'bar'});
});
