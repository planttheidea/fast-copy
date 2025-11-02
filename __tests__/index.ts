import React from 'react';

import copy, { copyStrict } from '../src';

interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

const SIMPLE_TYPES: PlainObject = {
  boolean: true,
  error: new TypeError('boom'),
  fn() {
    return 'foo';
  },
  nan: NaN,
  nil: null,
  number: 123,
  promise: Promise.resolve('foo'),
  string: 'foo',
  undef: undefined,
  weakmap: new WeakMap([
    [{}, 'foo'],
    [{}, 'bar'],
  ]),
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
  arguments: (function (_foo, _bar, _baz) {
    // Specifically testing arguments object
    // eslint-disable-next-line prefer-rest-params
    return arguments;
  })('foo', 'bar', 'baz'),
  array: ['foo', { bar: 'baz' }],
  arrayBuffer: new ArrayBuffer(8),
  blob: new Blob(['<a id="a">hey!</a>'], { type: 'text/html' }),
  buffer: Buffer.from('this is a test buffer'),
  customPrototype: Object.create({
    method() {
      return 'foo';
    },
    value: 'value',
  }),
  dataView: new DataView(new ArrayBuffer(16)),
  date: new Date(),
  float32Array: new Float32Array([1, 2]),
  float64Array: new Float64Array([3, 4]),
  int8Array: new Int8Array([5, 6]),
  int16Array: new Int16Array([7, 8]),
  int32Array: new Int32Array([9, 10]),
  map: new Map().set('foo', { bar: { baz: 'quz' } }),
  object: { foo: { bar: 'baz' } },
  regexp: /foo/,
  set: new Set().add('foo').add({ bar: { baz: 'quz' } }),
  uint8Array: new Uint8Array([11, 12]),
  uint8ClampedArray: new Uint8ClampedArray([13, 14]),
  uint16Array: new Uint16Array([15, 16]),
  uint32Array: new Uint32Array([17, 18]),
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
    reference: {},
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

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
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

    const properties = ([] as Array<string | symbol>).concat(
      Object.keys(SIMPLE_TYPES),
      Object.getOwnPropertySymbols(SIMPLE_TYPES).filter((symbol) =>
        Object.prototype.propertyIsEnumerable.call(SIMPLE_TYPES, symbol),
      ),
    );

    properties.forEach((property: string | symbol) => {
      // @ts-expect-error - Symbol not supported property type
      expect(result[property]).toEqual(SIMPLE_TYPES[property]);
    });
  });

  it('will copy the complex types', () => {
    const result = copy(COMPLEX_TYPES);

    expect(result).not.toBe(COMPLEX_TYPES);

    const complexTypes = { ...COMPLEX_TYPES };
    complexTypes.arguments = { ...COMPLEX_TYPES.arguments };

    const properties = [
      ...Object.keys(COMPLEX_TYPES),
      ...Object.getOwnPropertySymbols(COMPLEX_TYPES).filter((symbol) =>
        Object.prototype.propertyIsEnumerable.call(COMPLEX_TYPES, symbol),
      ),
    ];

    properties.forEach((property: string | symbol) => {
      const value = result[property as string];

      if (property === 'arguments') {
        expect(value.constructor).toBe(Object);
        expect({ ...value }).toEqual({ ...COMPLEX_TYPES[property] });
      } else if (property === 'blob') {
        expect(value).toBeInstanceOf(Blob);
        expect(value.size).toBe(complexTypes[property].size);
        expect(value.type).toBe(complexTypes[property].type);
      } else if (property === 'customPrototype') {
        expect(Object.getPrototypeOf(value)).toBe(
          Object.getPrototypeOf(COMPLEX_TYPES[property]),
        );
        expect(value).toEqual(COMPLEX_TYPES[property]);
      } else {
        // @ts-expect-error - Symbol not supported property type
        expect(value).toEqual(COMPLEX_TYPES[property]);
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

  it('will copy referenced objects', () => {
    const reusedObject = {
      name: 'I like trains!',
    };

    const data = {
      a: reusedObject,
      b: reusedObject,
      array: [reusedObject, reusedObject],
    };

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

  it('will copy a custom object with a constructor property', () => {
    const bar = new Bar('value');
    const result = copy(bar);

    expect(result).not.toBe(bar);
    expect(result).toEqual(bar);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(bar));
  });

  it('will copy an array with a constructor property', () => {
    const data = ['foo'];

    // @ts-expect-error - Reassigning `constructor` to test extreme edge case.
    data.constructor = 'I am unable to comply.';

    const result = copyStrict(data);

    expect(result).not.toBe(data);
    expect(result).toEqual(data);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(data));
  });
});

describe('copyStrict', () => {
  it('will copy an empty object', () => {
    const object = {};

    const result = copyStrict(object);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
  });

  it('will copy the simple types', () => {
    const result = copyStrict(SIMPLE_TYPES);

    expect(result).not.toBe(SIMPLE_TYPES);
    expect(result).toEqual(SIMPLE_TYPES);

    const properties = ([] as Array<string | symbol>).concat(
      Object.getOwnPropertyNames(SIMPLE_TYPES),
      Object.getOwnPropertySymbols(SIMPLE_TYPES),
    );

    properties.forEach((property: string | symbol) => {
      // @ts-expect-error - Symbol not supported property type
      expect(result[property]).toEqual(SIMPLE_TYPES[property]);
    });
  });

  it('will copy the complex types', () => {
    const result = copyStrict(COMPLEX_TYPES);

    expect(result).not.toBe(COMPLEX_TYPES);

    const complexTypes = { ...COMPLEX_TYPES };

    complexTypes.arguments = { ...COMPLEX_TYPES.arguments };

    const properties = ([] as Array<string | symbol>).concat(
      Object.getOwnPropertyNames(complexTypes),
      Object.getOwnPropertySymbols(complexTypes),
    );

    properties.forEach((property: string | symbol) => {
      const value = result[property as string];

      if (property === 'arguments') {
        expect(value.constructor).toBe(Object);
        expect({ ...value }).toEqual({ ...COMPLEX_TYPES[property] });
      } else if (property === 'blob') {
        expect(value).toBeInstanceOf(Blob);
        expect(value.size).toBe(complexTypes[property].size);
        expect(value.type).toBe(complexTypes[property].type);
      } else if (property === 'customPrototype') {
        expect(Object.getPrototypeOf(value)).toBe(
          Object.getPrototypeOf(COMPLEX_TYPES[property]),
        );
        expect(value).toEqual(COMPLEX_TYPES[property]);
      } else {
        // @ts-expect-error - Symbol not supported property type
        expect(value).toEqual(COMPLEX_TYPES[property]);
      }
    });
  });

  it('will copy the circular object', () => {
    const result = copyStrict(CIRCULAR);

    expect(result).not.toBe(CIRCULAR);
    expect(result).toEqual(CIRCULAR);
  });

  it('will copy the special types', () => {
    const result = copyStrict(SPECIAL_TYPES);

    expect(result).not.toBe(SPECIAL_TYPES);
    expect(result).toEqual(SPECIAL_TYPES);
  });

  it('will copy referenced objects', () => {
    const reusedObject = {
      name: 'I like trains!',
    };

    const data = {
      a: reusedObject,
      b: reusedObject,
      array: [reusedObject, reusedObject],
    };

    const result = copyStrict(data);

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
});
