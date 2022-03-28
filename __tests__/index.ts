import { executionAsyncId } from 'async_hooks';
import crypto from 'crypto';
import React from 'react';

import copy from '../src';

type PlainObject = {
  [key: string]: any;
  [index: number]: any;
};

const hash = crypto.createHash('sha256');

hash.update('foo bar');

const SIMPLE_TYPES: PlainObject = {
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

Object.defineProperties(SIMPLE_TYPES, {
  readonlyKey: {
    configurable: true,
    enumerable: false,
    value: 'readonly',
    writable: false,
  },
  [Symbol('readonlySymbol')]: {
    configurable: true,
    enumerable: false,
    value: 'readonly',
    writable: false,
  },
});

const COMPLEX_TYPES: PlainObject = {
  arguments: (function (foo, bar, baz) {
    return arguments;
  })('foo', 'bar', 'baz'),
  array: ['foo', { bar: 'baz' }],
  arrayBuffer: new ArrayBuffer(8),
  buffer: new Buffer('this is a test buffer'),
  customPrototype: Object.create({
    method() {
      return 'foo';
    },
    value: 'value',
  }),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  float32Array: new Float32Array([12, 15]),
  float64Array: new Float64Array([12, 15]),
  hash,
  int8Array: new Int8Array([12, 15]),
  int16Array: new Int16Array([12, 15]),
  int32Array: new Int32Array([12, 15]),
  map: new Map().set('foo', { bar: { baz: 'quz' } }),
  object: { foo: { bar: 'baz' } },
  regexp: /foo/,
  set: new Set().add('foo').add({ bar: { baz: 'quz' } }),
  // Disabling, as jest fails intermittently with blob construction.
  // blob: new Blob(['<a id="a">hey!</a>'], {type : 'text/html'}),
  uint8Array: new Uint8Array([12, 15]),
  uint8ClampedArray: new Uint8ClampedArray([12, 15]),
  uint16Array: new Uint16Array([12, 15]),
  uint32Array: new Uint32Array([12, 15]),
};

Object.defineProperties(COMPLEX_TYPES, {
  readonlyKey: {
    configurable: true,
    enumerable: false,
    value: 'readonly',
    writable: false,
  },
  [Symbol('readonlySymbol')]: {
    configurable: true,
    enumerable: false,
    value: 'readonly',
    writable: false,
  },
});

const CIRCULAR: PlainObject = {
  deeply: {
    nested: {
      reference: {},
    },
  },
  other: {
    reference: {}
  },
};

CIRCULAR.deeply.nested.reference = CIRCULAR;
CIRCULAR.other.reference = CIRCULAR;

class Foo {
  value: any;

  constructor(value: any) {
    this.value = value;
  }
}

class Bar {
  constructor(value: any) {
    this.constructor = value;
  }
}

const SPECIAL_TYPES: PlainObject = {
  foo: new Foo('value'),
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
};

describe('copy', () => {
  it('will copy an empty object', () => {
    const object = {};

    const result = copy(object);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
  });

  it('will copy the simple types', () => {
    const result = copy(SIMPLE_TYPES);

    expect(result).not.toBe(SIMPLE_TYPES);
    expect(result).toEqual(SIMPLE_TYPES);

    const properties = [].concat(
      Object.keys(SIMPLE_TYPES),
      Object.getOwnPropertySymbols(SIMPLE_TYPES).filter((symbol) =>
        Object.prototype.propertyIsEnumerable.call(SIMPLE_TYPES, symbol),
      ),
    );

    properties.forEach((property: string | symbol) => {
      // @ts-ignore
      expect(result[property]).toEqual(SIMPLE_TYPES[property]);
    });
  });

  it('will copy the complex types', () => {
    const result = copy(COMPLEX_TYPES);

    expect(result).not.toBe(COMPLEX_TYPES);

    const complexTypes = { ...COMPLEX_TYPES };

    complexTypes.arguments = { ...COMPLEX_TYPES.arguments };

    expect(result).toEqual(complexTypes);

    const properties = [
      ...Object.keys(COMPLEX_TYPES),
      ...Object.getOwnPropertySymbols(COMPLEX_TYPES).filter((symbol) =>
        Object.prototype.propertyIsEnumerable.call(COMPLEX_TYPES, symbol),
      )
    ];

    properties.forEach((property: string | symbol) => {
      if (property === 'arguments') {
        expect(result[property].constructor).toBe(Object);
        expect({ ...result[property] }).toEqual({ ...COMPLEX_TYPES[property] });
      } else if (property === 'customPrototype') {
        expect(Object.getPrototypeOf(result[property])).toBe(
          Object.getPrototypeOf(COMPLEX_TYPES[property]),
        );
        expect(result[property]).toEqual(COMPLEX_TYPES[property]);
      } else {
        // @ts-ignore
        expect(result[property]).toEqual(COMPLEX_TYPES[property]);
      }
    });
  });

  it('will copy the circular object', () => {
    const result = copy(CIRCULAR);

    expect(result).not.toBe(CIRCULAR);
    expect(result).toEqual(CIRCULAR);
  });

  it('will copy the special types', () => {
    const result = copy(SPECIAL_TYPES);

    expect(result).not.toBe(SPECIAL_TYPES);
    expect(result).toEqual(SPECIAL_TYPES);
  });

  it('will handle when buffers are not supported', () => {
    const cleanComplexTypes = Object.keys(COMPLEX_TYPES).reduce(
      (types: PlainObject, key) => {
        if (
          key !== 'arguments' &&
          key !== 'arrayBuffer' &&
          key !== 'buffer' &&
          key !== 'dataView' &&
          !/float(.*)Array/.test(key) &&
          !/int(.*)Array/.test(key)
        ) {
          types[key] = COMPLEX_TYPES[key];
        }

        return types;
      },
      {},
    );

    const realm = {
      Date: global.Date,
      Error: global.Error,
      Map: global.Map,
      RegExp: global.RegExp,
      Set: global.Set,
      Blob: global.Blob,
      WeakMap: global.WeakMap,
      WeakSet: global.WeakSet,
    };

    const result = copy(cleanComplexTypes, { realm });

    expect(result).not.toBe(cleanComplexTypes);
    expect(result).toEqual(cleanComplexTypes);
  });

  it('will copy referenced objects', () => {
    const reusedObject = {
      name: 'I like trains!'
    };

    const data = {
      a: reusedObject,
      b: reusedObject,
      array: [reusedObject, reusedObject]
    }

    const result = copy(data);

    const cloneReusedObject = result.a;

    expect(result.a).not.toBe(reusedObject);
    expect(result.a).toEqual(reusedObject);
    expect(result.b).not.toBe(reusedObject);
    expect(result.b).toBe(cloneReusedObject);
    expect(result.array[0]).not.toBe(reusedObject);
    expect(result.array[0]).toBe(cloneReusedObject);
    expect(result.array[1]).not.toBe(reusedObject);
    expect(result.array[1]).toBe(cloneReusedObject);
  });
  
  it('will copy a plain object with a constructor property', () => {
    const data = {
      constructor: 'I am unable to comply.',
    };
    const result = copy(data);

    expect(result).not.toBe(data);
    expect(result).toEqual(data);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(data));
  });

  it('will copy a object with a constructor property', () => {
    const bar = new Bar('value');
    const result = copy(bar);

    expect(result).not.toBe(bar);
    expect(result).toEqual(bar);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(bar));
  });
});

describe('copy.strict', () => {
  it('will copy an empty object', () => {
    const object = {};

    const result = copy(object, { isStrict: true });
    const result2 = copy.strict(object);

    expect(result).not.toBe(object);
    expect(result2).not.toBe(object);

    expect(result).toEqual(object);
    expect(result2).toEqual(object);
  });

  it('will copy the simple types', () => {
    const result = copy(SIMPLE_TYPES, { isStrict: true });
    const result2 = copy.strict(SIMPLE_TYPES);

    expect(result).not.toBe(SIMPLE_TYPES);
    expect(result2).not.toBe(SIMPLE_TYPES);

    expect(result).toEqual(SIMPLE_TYPES);
    expect(result2).toEqual(SIMPLE_TYPES);

    const properties = [].concat(
      Object.getOwnPropertyNames(SIMPLE_TYPES),
      Object.getOwnPropertySymbols(SIMPLE_TYPES),
    );

    properties.forEach((property: string | symbol) => {
      // @ts-ignore
      expect(result[property]).toEqual(SIMPLE_TYPES[property]);
      // @ts-ignore
      expect(result2[property]).toEqual(SIMPLE_TYPES[property]);
    });
  });

  it('will copy the complex types', () => {
    const result = copy(COMPLEX_TYPES, { isStrict: true });
    const result2 = copy.strict(COMPLEX_TYPES);

    expect(result).not.toBe(COMPLEX_TYPES);
    expect(result2).not.toBe(COMPLEX_TYPES);

    const complexTypes = { ...COMPLEX_TYPES };

    complexTypes.arguments = { ...COMPLEX_TYPES.arguments };

    expect(result).toEqual(complexTypes);
    expect(result2).toEqual(complexTypes);

    const properties = [].concat(
      Object.getOwnPropertyNames(complexTypes),
      Object.getOwnPropertySymbols(complexTypes),
    );

    properties.forEach((property: string | symbol) => {
      if (property === 'arguments') {
        expect(result[property].constructor).toBe(Object);
        expect(result2[property].constructor).toBe(Object);

        expect({ ...result[property] }).toEqual({ ...COMPLEX_TYPES[property] });
        expect({ ...result2[property] }).toEqual({
          ...COMPLEX_TYPES[property],
        });
      } else if (property === 'customPrototype') {
        expect(Object.getPrototypeOf(result[property])).toBe(
          Object.getPrototypeOf(COMPLEX_TYPES[property]),
        );
        expect(Object.getPrototypeOf(result2[property])).toBe(
          Object.getPrototypeOf(COMPLEX_TYPES[property]),
        );

        expect(result[property]).toEqual(COMPLEX_TYPES[property]);
        expect(result2[property]).toEqual(COMPLEX_TYPES[property]);
      } else {
        // @ts-ignore
        expect(result[property]).toEqual(COMPLEX_TYPES[property]);
        // @ts-ignore
        expect(result2[property]).toEqual(COMPLEX_TYPES[property]);
      }
    });
  });

  it('will copy the circular object', () => {
    const result = copy(CIRCULAR, { isStrict: true });
    const result2 = copy.strict(CIRCULAR);

    expect(result).not.toBe(CIRCULAR);
    expect(result2).not.toBe(CIRCULAR);

    expect(result).toEqual(CIRCULAR);
    expect(result2).toEqual(CIRCULAR);
  });

  it('will copy the special types', () => {
    const result = copy(SPECIAL_TYPES, { isStrict: true });
    const result2 = copy.strict(SPECIAL_TYPES);

    expect(result).not.toBe(SPECIAL_TYPES);
    expect(result2).not.toBe(SPECIAL_TYPES);

    expect(result).toEqual(SPECIAL_TYPES);
    expect(result2).toEqual(SPECIAL_TYPES);
  });

  it('will handle when buffers are not supported', () => {
    const cleanComplexTypes = Object.keys(COMPLEX_TYPES).reduce(
      (types: PlainObject, key) => {
        if (
          key !== 'arguments' &&
          key !== 'arrayBuffer' &&
          key !== 'buffer' &&
          key !== 'dataView' &&
          !/float(.*)Array/.test(key) &&
          !/int(.*)Array/.test(key)
        ) {
          types[key] = COMPLEX_TYPES[key];
        }

        return types;
      },
      {},
    );

    const realm = {
      Date: global.Date,
      Error: global.Error,
      Map: global.Map,
      RegExp: global.RegExp,
      Set: global.Set,
      WeakMap: global.WeakMap,
      WeakSet: global.WeakSet,
    };

    const result = copy(cleanComplexTypes, { isStrict: true, realm });
    const result2 = copy.strict(cleanComplexTypes, { realm });

    expect(result).not.toBe(cleanComplexTypes);
    expect(result2).not.toBe(cleanComplexTypes);

    expect(result).toEqual(cleanComplexTypes);
    expect(result2).toEqual(cleanComplexTypes);
  });

  it('will copy referenced objects', () => {
    const reusedObject = {
      name: 'I like trains!'
    };

    const data = {
      a: reusedObject,
      b: reusedObject,
      array: [reusedObject, reusedObject]
    }

    const result = copy(data, { isStrict: true });

    const cloneReusedObject = result.a;

    expect(result.a).not.toBe(reusedObject);
    expect(result.a).toEqual(reusedObject);
    expect(result.b).not.toBe(reusedObject);
    expect(result.b).toBe(cloneReusedObject);
    expect(result.array[0]).not.toBe(reusedObject);
    expect(result.array[0]).toBe(cloneReusedObject);
    expect(result.array[1]).not.toBe(reusedObject);
    expect(result.array[1]).toBe(cloneReusedObject);
  });

  it('will have a version of itself as the `default` property to support ESM-to-CommonJS', () => {
    expect(copy.default).toBe(copy);
  });
});
