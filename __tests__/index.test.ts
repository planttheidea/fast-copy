import React from 'react';
import { describe, expect, it, test, vi } from 'vitest';
import type { State } from '../src/index.js';
import { copy, copyStrict, createCopier, MaxDepthExceededError } from '../src/index.js';

interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

function* generator() {
  yield 'foo';
}

async function* asyncGenerator() {
  await Promise.resolve();
  yield 'foo';
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
  asyncGenerator: asyncGenerator(),
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
  generator: generator(),
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
  it('will preserve an own __proto__ property without changing the prototype', () => {
    const object: Record<string, unknown> = JSON.parse('{"__proto__":{"label":"value"}}');
    const result = copy(object);

    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.__proto__).toEqual(object.__proto__);
    expect(result.__proto__).not.toBe(object.__proto__);
  });

  it('will copy a circular own __proto__ property', () => {
    const object: Record<string, unknown> = {};
    Object.defineProperty(object, '__proto__', { enumerable: true, value: object });
    const result = copy(object);

    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.__proto__).toBe(result);
  });

  it('will resolve an enumerable __proto__ getter like other loose properties', () => {
    const value = { label: 'value' };
    const object: Record<string, unknown> = {};
    Object.defineProperty(object, '__proto__', { enumerable: true, get: () => value });
    const result = copy(object);

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.getOwnPropertyDescriptor(result, '__proto__')).toEqual({
      configurable: true,
      enumerable: true,
      value: { label: 'value' },
      writable: true,
    });
    expect(result.__proto__).not.toBe(value);
  });

  it('will preserve an own null __proto__ property without removing the prototype', () => {
    const object: Record<string, unknown> = JSON.parse('{"__proto__":null}');
    const result = copy(object);

    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.__proto__).toBe(null);
  });

  it('will preserve a nested own __proto__ property without changing the prototype', () => {
    const object: { data: Record<string, unknown> } = {
      data: JSON.parse('{"__proto__":{"isAdmin":true}}'),
    };
    const result = copy(object);

    expect(Object.hasOwn(result.data, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result.data)).toBe(Object.prototype);
    expect(result.data.isAdmin).toBeUndefined();
    expect(result.data.__proto__).toEqual(object.data.__proto__);
    expect(result.data.__proto__).not.toBe(object.data.__proto__);
  });

  describe.each([
    ['string', 'id'],
    ['symbol', Symbol('id')],
  ] as const)('own %s keys shadowing inherited properties', (_type, key) => {
    function createShadowingObject(inherited: PropertyDescriptor, depth = 1): Record<PropertyKey, any> {
      let prototype: object = Object.create(Object.prototype, { [key]: inherited }) as object;

      for (let index = 1; index < depth; ++index) {
        prototype = Object.create(prototype) as object;
      }

      return Object.create(prototype, {
        [key]: { configurable: true, enumerable: true, value: { nested: 1 }, writable: true },
      });
    }

    function expectOwnCopy(result: Record<PropertyKey, any>, object: Record<PropertyKey, any>) {
      expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(object));
      expect(Object.getOwnPropertyDescriptor(result, key)).toEqual({
        configurable: true,
        enumerable: true,
        value: { nested: 1 },
        writable: true,
      });
      expect(result[key]).not.toBe(object[key]);
    }

    it('will copy a property shadowing an inherited read-only property', () => {
      const object = createShadowingObject({ configurable: true, value: 0, writable: false });

      expectOwnCopy(copy(object), object);
    });

    it('will copy a property shadowing an inherited getter-only property', () => {
      const object = createShadowingObject({ configurable: true, get: () => 0 });

      expectOwnCopy(copy(object), object);
    });

    it('will copy a property shadowing a read-only property deeper in the prototype chain', () => {
      const object = createShadowingObject({ configurable: true, value: 0, writable: false }, 3);

      expectOwnCopy(copy(object), object);
    });

    it('will copy a circular property shadowing an inherited read-only property', () => {
      const object = createShadowingObject({ configurable: true, value: 0, writable: false });
      object[key] = object;

      const result = copy(object);

      expect(Object.hasOwn(result, key)).toBe(true);
      expect(result[key]).toBe(result);
    });

    it('will pass the copied value to an inherited setter, instead of defining an own property', () => {
      const set = vi.fn();
      const object = createShadowingObject({ configurable: true, get: () => 0, set });

      const result = copy(object);

      expect(Object.hasOwn(result, key)).toBe(false);
      expect(set).toHaveBeenCalledTimes(1);
      expect(set.mock.calls[0]![0]).toEqual({ nested: 1 });
      expect(set.mock.calls[0]![0]).not.toBe(object[key]);
    });

    it('will copy the own property when using copyStrict', () => {
      const set = vi.fn();
      const object = createShadowingObject({ configurable: true, get: () => 0, set });

      expectOwnCopy(copyStrict(object), object);
      expect(set).not.toHaveBeenCalled();
    });
  });

  it('will copy the current value of own getters as standard properties', () => {
    let count = 0;
    const object = {};
    Object.defineProperty(object, 'count', {
      configurable: true,
      enumerable: true,
      get: () => ++count,
      set: (value: number) => {
        count = value;
      },
    });

    const result = copy(object);

    expect(Object.getOwnPropertyDescriptor(result, 'count')).toEqual({
      configurable: true,
      enumerable: true,
      value: 1,
      writable: true,
    });

    (result as { count: number }).count = 10;

    expect(count).toBe(1);
  });

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
        expect(Object.getPrototypeOf(value)).toBe(Object.getPrototypeOf(COMPLEX_TYPES[property]));
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
  /**
   * A `set` trap that swallows assignments of the `swallowed` property, which must be defined on a
   * clone rather than assigned to it whenever its prototype chain may contain a `Proxy`.
   */
  function swallow(target: object, property: string | symbol, value: unknown, receiver: unknown): boolean {
    return property === 'swallowed' || Reflect.set(target, property, value, receiver);
  }

  function defineSwallowed(object: object): void {
    Object.defineProperty(object, 'swallowed', { configurable: true, enumerable: true, value: 'own', writable: true });
  }

  it('will copy an empty object', () => {
    const object = {};

    const result = copyStrict(object);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
  });

  it('will preserve an own __proto__ property without changing the prototype', () => {
    const object: Record<string, unknown> = JSON.parse('{"__proto__":{"label":"value"}}');
    const result = copyStrict(object);

    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.__proto__).toEqual(object.__proto__);
    expect(result.__proto__).not.toBe(object.__proto__);
  });

  it('will preserve the length of an array that ends with holes', () => {
    const array = [1, 2];

    array.length = 5;

    const result = copyStrict(array);

    expect(result.length).toBe(5);
    expect(Object.keys(result)).toEqual(['0', '1']);
  });

  it('will preserve an own __proto__ property of a null-prototype object without setting the prototype', () => {
    const object: Record<string, unknown> = Object.create(null);

    object.__proto__ = { label: 'value' };

    const result = copyStrict(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result.__proto__).toEqual(object.__proto__);
    expect(result.__proto__).not.toBe(object.__proto__);
  });

  it('will preserve an own __proto__ property of an array without changing the prototype', () => {
    const array = [1, 2] as number[] & Record<string, unknown>;
    const value = { label: 'value' };

    Object.defineProperty(array, '__proto__', { configurable: true, enumerable: true, value, writable: true });

    const result = copyStrict(array);

    expect(Object.getPrototypeOf(result)).toBe(Array.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result.__proto__).toEqual(value);
    expect(result.__proto__).not.toBe(value);
    expect([...result]).toEqual([1, 2]);
  });

  it('will define own properties shadowing inherited accessors of a class instance', () => {
    const set = vi.fn();

    class Model {
      declare count: number;

      get label(): unknown {
        return 'inherited';
      }

      set label(value: unknown) {
        set(value);
      }
    }

    const model = new Model();
    const label = { text: 'own' };

    model.count = 1;
    Object.defineProperty(model, 'label', { configurable: true, enumerable: true, value: label, writable: true });

    const result = copyStrict(model);

    expect(set).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Model);
    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(model));
    expect(result.label).not.toBe(label);
  });

  it('will define own properties shadowing inherited accessors of an array subclass', () => {
    const set = vi.fn();

    class Subclass extends Array<number> {
      get nested(): unknown {
        return undefined;
      }

      set nested(value: unknown) {
        set(value);
      }
    }

    const array = new Subclass();
    const nested = { label: 'value' };

    array.push(1, 2);
    Object.defineProperty(array, 'nested', { configurable: true, enumerable: true, value: nested, writable: true });

    const result = copyStrict(array);

    expect(set).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Subclass);
    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(array));
    expect(result.nested).not.toBe(nested);
  });

  it('will define own properties of a Map shadowing its inherited accessors', () => {
    const map = new Map([['key', { label: 'value' }]]) as Map<string, unknown> & Record<string, unknown>;

    Object.defineProperty(map, 'size', { configurable: true, enumerable: true, value: 'own', writable: true });
    map.label = { text: 'own' };

    const result = copyStrict(map);

    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(map));
    expect(result.label).not.toBe(map.label);
    expect(Map.prototype.entries.call(result).next().value).toEqual(['key', { label: 'value' }]);
  });

  it('will preserve accessors when `value` and `writable` are inherited from a polluted Object.prototype', () => {
    const get = () => 'from getter';
    const object = {};
    const array: unknown[] = [1];

    Object.defineProperty(object, 'accessor', { configurable: true, enumerable: true, get });
    Object.defineProperty(array, 'accessor', { configurable: true, enumerable: true, get });

    Object.defineProperty(Object.prototype, 'value', { configurable: true, value: 'polluted', writable: true });
    Object.defineProperty(Object.prototype, 'writable', { configurable: true, value: true, writable: true });

    try {
      const objectResult = copyStrict(object);
      const arrayResult = copyStrict(array);

      expect(Object.getOwnPropertyDescriptor(objectResult, 'accessor')).toEqual(
        Object.getOwnPropertyDescriptor(object, 'accessor'),
      );
      expect(Object.getOwnPropertyDescriptor(arrayResult, 'accessor')).toEqual(
        Object.getOwnPropertyDescriptor(array, 'accessor'),
      );
    } finally {
      // @ts-expect-error - removing the pollution added above
      delete Object.prototype.value;
      // @ts-expect-error - removing the pollution added above
      delete Object.prototype.writable;
    }
  });

  it('will define own properties of an object with a Proxy prototype', () => {
    const prototype = new Proxy({}, { set: swallow });
    const object: Record<string, unknown> = Object.create(prototype);

    defineSwallowed(object);
    object.nested = { label: 'value' };

    const result = copyStrict(object);

    expect(Object.getPrototypeOf(result)).toBe(prototype);
    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(object));
    expect(result.nested).not.toBe(object.nested);
  });

  it('will define own properties of an array subclass with a Proxy in its prototype chain', () => {
    class Subclass extends Array<number> {}

    Object.setPrototypeOf(Subclass.prototype, new Proxy(Array.prototype, { set: swallow }));

    const array = new Subclass();

    array.push(1, 2);
    defineSwallowed(array);

    const result = copyStrict(array);

    expect(result).toBeInstanceOf(Subclass);
    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(array));
  });

  it('will define own properties of an array when its prototype chain was modified on load', async () => {
    Object.setPrototypeOf(Array.prototype, new Proxy(Object.prototype, { set: swallow }));

    try {
      vi.resetModules();

      const { copyStrict: copyStrictOnModifiedLoad } = await import('../src/index.js');
      const array: unknown[] = [1];

      defineSwallowed(array);

      const result = copyStrictOnModifiedLoad(array);

      expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(array));
    } finally {
      Object.setPrototypeOf(Array.prototype, Object.prototype);
      vi.resetModules();
    }
  });

  it.each([
    ['Boolean', Boolean, [true]],
    ['DataView', DataView, [new ArrayBuffer(4)]],
    ['Date', Date, [0]],
    ['Map', Map, [[['key', 'value']]]],
    ['Number', Number, [1]],
    ['RegExp', RegExp, ['foo', 'g']],
    ['Set', Set, [['value']]],
    ['String', String, ['foo']],
  ] as Array<[string, new (...args: any[]) => object, unknown[]]>)(
    'will define own properties of a %s subclass with a Proxy in its prototype chain',
    (_name, Base, args) => {
      class Subclass extends Base {}

      Object.setPrototypeOf(Subclass.prototype, new Proxy(Base.prototype as object, { set: swallow }));

      const value = new Subclass(...args);

      defineSwallowed(value);

      const result = copyStrict(value);

      expect(result).toBeInstanceOf(Subclass);
      expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(value));
    },
  );

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
        expect(Object.getPrototypeOf(value)).toBe(Object.getPrototypeOf(COMPLEX_TYPES[property]));
        expect(value).toEqual(COMPLEX_TYPES[property]);
      } else if (property === 'asyncGenerator' || property === 'generator') {
        expect(value).toBe(COMPLEX_TYPES[property]);
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

  it('will reuse the strict RegExp clone for circular and repeated references', () => {
    const regExp = /test/gi;
    const original = Object.assign(regExp, { self: regExp, metadata: { regExp } });

    const result = copyStrict({ first: original, second: original });

    expect(result.first).not.toBe(original);
    expect(result.first).toBe(result.second);
    expect(result.first.self).toBe(result.first);
    expect(result.first.metadata).not.toBe(original.metadata);
    expect(result.first.metadata.regExp).toBe(result.first);
  });

  it('will retain loose RegExp copying and explicit method overrides', () => {
    const original = Object.assign(/test/gi, { lastIndex: 3, metadata: { source: 'api' } });
    const result = copy(original);
    const customCopy = createCopier({ methods: { regExp: (regExp) => regExp }, strict: true });

    expect(result).not.toBe(original);
    expect(result.source).toBe(original.source);
    expect(result.flags).toBe(original.flags);
    expect(result.lastIndex).toBe(3);
    expect(Object.hasOwn(result, 'metadata')).toBe(false);
    expect(customCopy(original)).toBe(original);
  });

  it('will reuse the strict Date clone for circular and repeated references', () => {
    const date = new Date(0) as Date & { self: Date; metadata: { date: Date } };

    date.self = date;
    date.metadata = { date };

    const result = copyStrict({ first: date, second: date });

    expect(result.first).not.toBe(date);
    expect(result.first).toBe(result.second);
    expect(result.first.self).toBe(result.first);
    expect(result.first.metadata).not.toBe(date.metadata);
    expect(result.first.metadata.date).toBe(result.first);
  });

  it('will retain loose Date copying and explicit method overrides', () => {
    const original = Object.assign(new Date(1234), { metadata: { source: 'api' } });
    const result = copy(original);
    const customCopy = createCopier({ methods: { date: (date) => date }, strict: true });

    expect(result).not.toBe(original);
    expect(result.getTime()).toBe(1234);
    expect(Object.hasOwn(result, 'metadata')).toBe(false);
    expect(customCopy(original)).toBe(original);
  });

  describe.each([
    { name: 'Array', method: 'array', create: () => ['foo'] },
    { name: 'ArrayBuffer', method: 'arrayBuffer', create: () => new ArrayBuffer(4) },
    { name: 'Uint8Array', method: 'arrayBuffer', create: () => new Uint8Array([1, 2]) },
    { name: 'Blob', method: 'blob', create: () => new Blob(['blob']) },
    { name: 'DataView', method: 'dataView', create: () => new DataView(new ArrayBuffer(4)) },
    { name: 'Map', method: 'map', create: () => new Map([['foo', 'bar']]) },
    { name: 'Set', method: 'set', create: () => new Set(['foo']) },
    { name: 'Boolean', method: undefined, create: () => new Boolean(true) },
    { name: 'Number', method: undefined, create: () => new Number(123) },
    { name: 'String', method: undefined, create: () => new String('foo') },
  ] as const)('$name custom properties', ({ create, method }) => {
    it('will reuse the strict clone for circular and repeated references', () => {
      const original: any = create();

      original.self = original;
      original.metadata = { original };

      const result = copyStrict({ first: original, second: original });

      expect(result.first).not.toBe(original);
      expect(result.first).toBe(result.second);
      expect(result.first.self).toBe(result.first);
      expect(result.first.metadata).not.toBe(original.metadata);
      expect(result.first.metadata.original).toBe(result.first);
    });

    it('will not copy custom properties when loose', () => {
      const original = Object.assign(create(), { metadata: { source: 'api' } });
      const result = copy(original);

      expect(result).not.toBe(original);
      expect(Object.hasOwn(result, 'metadata')).toBe(false);
    });

    if (method) {
      it('will use explicit method overrides', () => {
        const original = Object.assign(create(), { metadata: { source: 'api' } });
        const customCopy = createCopier({ methods: { [method]: (value: any) => value }, strict: true });

        expect(customCopy(original)).toBe(original);
      });
    }
  });

  it('will copy custom properties on the buffer of a DataView', () => {
    const buffer = Object.assign(new ArrayBuffer(4), { metadata: { source: 'api' } });
    const dataView = new DataView(buffer);

    const viewOnly = copyStrict(dataView);
    const dataViewFirst = copyStrict({ dataView, buffer });

    expect(viewOnly.buffer.metadata).toEqual(buffer.metadata);
    expect(viewOnly.buffer.metadata).not.toBe(buffer.metadata);
    expect(dataViewFirst.buffer.metadata).toEqual(buffer.metadata);
    expect(dataViewFirst.dataView.buffer).toBe(dataViewFirst.buffer);
  });

  it('will resolve a buffer property that references the DataView viewing it', () => {
    const buffer: ArrayBuffer & { view?: DataView } = new ArrayBuffer(4);
    const dataView = new DataView(buffer);

    buffer.view = dataView;

    const result = copyStrict(dataView);

    expect(result).not.toBe(dataView);
    expect(result.buffer.view).toBe(result);
  });

  it('will share the copied buffer between a DataView and the buffer it views', () => {
    const buffer = new ArrayBuffer(4);
    const dataView = new DataView(buffer);

    const bufferFirst = copyStrict({ buffer, dataView });
    const dataViewFirst = copyStrict({ dataView, buffer });

    expect(bufferFirst.buffer).not.toBe(buffer);
    expect(bufferFirst.dataView.buffer).toBe(bufferFirst.buffer);
    expect(dataViewFirst.buffer).not.toBe(buffer);
    expect(dataViewFirst.dataView.buffer).toBe(dataViewFirst.buffer);
  });

  it('will resolve a nested buffer property that references the DataView viewing it', () => {
    const buffer = Object.assign(new ArrayBuffer(4), { metadata: { view: null as DataView | null } });
    const dataView = new DataView(buffer);

    buffer.metadata.view = dataView;

    const result = copyStrict(dataView);

    expect(result).not.toBe(dataView);
    expect(result.buffer.metadata).not.toBe(buffer.metadata);
    expect(result.buffer.metadata.view).toBe(result);
  });

  it('will copy the buffer of a strict DataView once when its properties reference the DataView', () => {
    const buffer: ArrayBuffer & { view?: DataView } = new ArrayBuffer(4);
    const dataView = new DataView(buffer);

    buffer.view = dataView;

    const arrayBuffer = vi.fn((value: ArrayBuffer, state: State) => {
      const clone = value.slice(0);

      state.cache.set(value, clone);

      return clone;
    });
    const result = createCopier({ methods: { arrayBuffer }, strict: true })(dataView);

    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(result.buffer).toBe(arrayBuffer.mock.results[0]!.value);
    expect(result.buffer).not.toBe(buffer);
  });
});

describe.each([false, true])('DataView buffers (strict: %s)', (strict) => {
  it('will copy the buffer with an arrayBuffer method override', () => {
    const buffer = Uint8Array.of(1, 2, 3, 4).buffer;
    const dataView = new DataView(buffer, 1, 2);
    const arrayBuffer = vi.fn((value: ArrayBuffer) => value);
    const result = createCopier({ methods: { arrayBuffer }, strict })(dataView);

    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(arrayBuffer).toHaveBeenCalledWith(buffer, expect.any(Object));
    expect(result).not.toBe(dataView);
    expect(result).toBeInstanceOf(DataView);
    expect(result.buffer).toBe(buffer);
    expect(result.byteOffset).toBe(1);
    expect(result.byteLength).toBe(2);
  });

  it('will use the clone returned by an arrayBuffer method override', () => {
    const dataView = new DataView(Uint8Array.of(1, 2, 3, 4).buffer);
    const replacement = Uint8Array.of(9, 9, 9, 9).buffer;
    const result = createCopier({ methods: { arrayBuffer: () => replacement }, strict })(dataView);

    expect(result.buffer).toBe(replacement);
    expect(result.getUint8(0)).toBe(9);
  });
});

describe('issues', () => {
  test('#128', () => {
    const bigInt1 = BigInt('1');
    const bigInt2 = BigInt('2');
    const bigInt3 = BigInt('3');

    const int32Array = Int32Array.of(1, 2, 3);
    const bigInt64Array = BigInt64Array.of(bigInt1, bigInt2, bigInt3);
    const bigUint64Array = BigUint64Array.of(bigInt1, bigInt2, bigInt3);

    const int32Copy = copyStrict(int32Array);
    const bigInt64Copy = copyStrict(bigInt64Array);
    const bigUint64Copy = copyStrict(bigUint64Array);

    expect(int32Copy).not.toBe(int32Array);
    expect(int32Copy).toEqual(int32Array);
    expect(int32Copy).toBeInstanceOf(Int32Array);

    expect(bigInt64Copy).not.toBe(bigInt64Array);
    expect(bigInt64Copy).toEqual(bigInt64Array);
    expect(bigInt64Copy).toBeInstanceOf(BigInt64Array);

    expect(bigUint64Copy).not.toBe(bigUint64Array);
    expect(bigUint64Copy).toEqual(bigUint64Array);
    expect(bigUint64Copy).toBeInstanceOf(BigUint64Array);
  });
});

// 2026-10-10: A prototype can store ordinary data in its constructor property.
describe.each([
  { name: 'copy', copier: copy },
  { name: 'copyStrict', copier: copyStrict },
])('$name with a non-callable prototype constructor', ({ copier }) => {
  it.each(['data', 42, true, Symbol('constructor'), {}])('will copy when constructor is %s', (constructor) => {
    const prototype = { constructor };
    const object = Object.assign(Object.create(prototype), { nested: { value: 'copied' } });
    const result = copier(object);

    expect(result).not.toBe(object);
    expect(Object.getPrototypeOf(result)).toBe(prototype);
    expect(result.nested).toEqual(object.nested);
    expect(result.nested).not.toBe(object.nested);
  });
});

describe('tag-specific copiers', () => {
  // `Symbol.toStringTag` is user-controlled, so a tag naming an `Object.prototype` member
  // must not resolve to that inherited member as the copier for the value.
  it.each(['toString', 'valueOf', 'hasOwnProperty', 'constructor', 'propertyIsEnumerable'])(
    'will not treat the inherited `%s` as a copier when it is used as the tag',
    (tag) => {
      class Tagged {
        value = 'foo';

        get [Symbol.toStringTag]() {
          return tag;
        }
      }

      const tagged = new Tagged();
      const result = copy(tagged);

      expect(result).not.toBe(tagged);
      expect(result).toBeInstanceOf(Tagged);
      expect(result.value).toBe('foo');
    },
  );

  it('will still use the copier for a tag that is a legitimate own property of the map', () => {
    class TaggedDate extends Date {
      readonly [Symbol.toStringTag] = 'Date';
    }

    const date = new TaggedDate(1234);
    const result = copy(date);

    expect(result).not.toBe(date);
    expect(result).toBeInstanceOf(TaggedDate);
    expect(result.getTime()).toBe(1234);
  });
});

describe('typed arrays', () => {
  it('will copy the contents of a typed array into memory it owns', () => {
    const typedArray = Uint8Array.of(1, 2, 3);
    const result = copy(typedArray);

    result[0] = 99;

    expect(result).toBeInstanceOf(Uint8Array);
    expect(typedArray[0]).toBe(1);
    expect(result.buffer).not.toBe(typedArray.buffer);
  });

  // `Buffer` overrides `slice` with one that returns a view over the same memory, so
  // copying through it would alias the original rather than copy it.
  it('will copy the contents of a Buffer into memory it owns', () => {
    const buffer = Buffer.from('hello world');
    const result = copy(buffer);

    result[0] = 88;

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(buffer.toString()).toBe('hello world');
    expect(result.toString()).toBe('Xello world');
    expect(result.buffer).not.toBe(buffer.buffer);
  });

  it('will copy a Buffer nested in an object into memory it owns', () => {
    const object = { buffer: Buffer.from('nested') };
    const result = copy(object);

    result.buffer[0] = 88;

    expect(object.buffer.toString()).toBe('nested');
  });

  it('will copy a typed array subclass as the subclass', () => {
    class CustomArray extends Uint8Array {}

    const customArray = CustomArray.of(1, 2, 3);
    const result = copy(customArray);

    result[0] = 99;

    expect(result).toBeInstanceOf(CustomArray);
    expect(customArray[0]).toBe(1);
    expect([...result]).toEqual([99, 2, 3]);
  });

  it('will copy the buffer backing a DataView into memory it owns', () => {
    const dataView = new DataView(new ArrayBuffer(8));

    dataView.setUint8(0, 1);

    const result = copy(dataView);

    result.setUint8(0, 99);

    expect(result).toBeInstanceOf(DataView);
    expect(dataView.getUint8(0)).toBe(1);
    expect(result.buffer).not.toBe(dataView.buffer);
  });

  describe.each([false, true])('SharedArrayBuffer (growable: %s)', (growable) => {
    function createBuffer() {
      const buffer = growable ? new SharedArrayBuffer(4, { maxByteLength: 16 }) : new SharedArrayBuffer(4);

      new Uint8Array(buffer).set([1, 2, 3, 4]);

      return buffer;
    }

    it.each([
      ['copy', copy],
      ['copyStrict', copyStrict],
    ] as const)('will preserve the contents and capacity through %s', (_name, copier) => {
      const original = createBuffer();
      const result = copier(original);

      expect(result).toBeInstanceOf(SharedArrayBuffer);
      expect(result).not.toBe(original);
      expect(result.byteLength).toBe(original.byteLength);
      expect(result.maxByteLength).toBe(original.maxByteLength);
      expect(result.growable).toBe(growable);
      expect([...new Uint8Array(result)]).toEqual([1, 2, 3, 4]);

      new Uint8Array(result)[0] = 9;

      expect(new Uint8Array(original)[0]).toBe(1);

      if (growable) {
        result.grow(8);

        expect(result.byteLength).toBe(8);
        expect([...new Uint8Array(result)]).toEqual([9, 2, 3, 4, 0, 0, 0, 0]);
        expect(original.byteLength).toBe(4);
      }
    });

    it('will keep loose buffer copies independent and omit their custom properties', () => {
      const buffer = Object.assign(createBuffer(), { metadata: { source: 'api' } });
      const result = copy({ first: buffer, second: buffer });

      expect(result.first).not.toBe(result.second);
      expect([...new Uint8Array(result.first)]).toEqual([1, 2, 3, 4]);
      expect([...new Uint8Array(result.second)]).toEqual([1, 2, 3, 4]);
      expect(result.first).not.toHaveProperty('metadata');
      expect(result.second).not.toHaveProperty('metadata');
    });

    it('will preserve strict properties and reuse circular and repeated references', () => {
      const original = Object.assign(createBuffer(), {
        metadata: { source: 'api' },
        self: null as SharedArrayBuffer | null,
      });
      const symbol = Symbol('metadata');
      const getter = vi.fn(() => original.metadata);

      original.self = original;
      Object.defineProperty(original, symbol, { value: original.metadata });
      Object.defineProperty(original, 'accessor', { get: getter });

      const { first, second } = copyStrict({ first: original, second: original });

      expect(first).not.toBe(original);
      expect(second).toBe(first);
      expect(first.self).toBe(first);
      expect(first.metadata).toEqual(original.metadata);
      expect(first.metadata).not.toBe(original.metadata);
      expect(Object.getOwnPropertyDescriptor(first, symbol)).toEqual({
        configurable: false,
        enumerable: false,
        value: first.metadata,
        writable: false,
      });
      expect(Object.getOwnPropertyDescriptor(first, 'accessor')).toEqual(
        Object.getOwnPropertyDescriptor(original, 'accessor'),
      );
      expect(getter).not.toHaveBeenCalled();
      expect([...new Uint8Array(first)]).toEqual([1, 2, 3, 4]);
    });

    it.each([false, true])('will share a strict DataView backing buffer (buffer first: %s)', (bufferFirst) => {
      const buffer = Object.assign(createBuffer(), { view: null as DataView | null });
      const view = new DataView(buffer, 1, 2);

      buffer.view = view;

      const result = copyStrict(bufferFirst ? { buffer, view } : { view, buffer });

      expect(result.buffer).not.toBe(buffer);
      expect(result.view).not.toBe(view);
      expect(result.view.buffer).toBe(result.buffer);
      expect(result.buffer.view).toBe(result.view);
      expect(result.view.byteOffset).toBe(1);
      expect(result.view.byteLength).toBe(2);
      expect(result.buffer.growable).toBe(growable);
      expect(result.buffer.maxByteLength).toBe(buffer.maxByteLength);
      expect(result.view.getUint8(0)).toBe(2);

      result.view.setUint8(0, 9);

      expect(view.getUint8(0)).toBe(2);
      expect(new Uint8Array(result.buffer)[1]).toBe(9);
    });

    it.each([false, true])('will honor an arrayBuffer method override (strict: %s)', (strict) => {
      const buffer = createBuffer();
      const arrayBuffer = vi.fn((value: ArrayBuffer) => value);
      const copier = createCopier({ methods: { arrayBuffer }, strict });

      expect(copier(buffer)).toBe(buffer);
      expect(arrayBuffer).toHaveBeenCalledWith(buffer, expect.any(Object));
    });
  });
});

describe.each([
  { name: 'copy', copier: copy },
  { name: 'copyStrict', copier: copyStrict },
])('$name DataViews', ({ copier }) => {
  it.each([
    { byteOffset: 0, byteLength: 2 },
    { byteOffset: 1, byteLength: 2 },
    { byteOffset: 4, byteLength: 0 },
  ])('will preserve a view with offset $byteOffset and length $byteLength', ({ byteOffset, byteLength }) => {
    const dataView = new DataView(Uint8Array.of(10, 20, 30, 40).buffer, byteOffset, byteLength);
    const result = copier(dataView);

    expect(result).not.toBe(dataView);
    expect(result.buffer).not.toBe(dataView.buffer);
    expect(result.byteOffset).toBe(byteOffset);
    expect(result.byteLength).toBe(byteLength);
    expect(() => result.getUint8(byteLength)).toThrow(RangeError);

    for (let index = 0; index < byteLength; ++index) {
      expect(result.getUint8(index)).toBe(dataView.getUint8(index));
    }

    if (byteLength) {
      const original = dataView.getUint8(0);

      result.setUint8(0, 99);

      expect(dataView.getUint8(0)).toBe(original);
    }
  });

  it('will preserve the bounds and constructors of a DataView and its resizable buffer subclasses', () => {
    class CustomArrayBuffer extends ArrayBuffer {}
    class CustomDataView extends DataView<ArrayBuffer> {}

    const buffer = new CustomArrayBuffer(4, { maxByteLength: 16 });

    new Uint8Array(buffer).set([10, 20, 30, 40]);

    const dataView = new CustomDataView(buffer, 1, 2);
    const result = copier(dataView);

    expect(result).toBeInstanceOf(CustomDataView);
    expect(result.buffer).toBeInstanceOf(CustomArrayBuffer);
    expect(result.buffer).not.toBe(buffer);
    expect(result.buffer.resizable).toBe(true);
    expect(result.buffer.maxByteLength).toBe(16);
    expect(result.byteOffset).toBe(1);
    expect(result.byteLength).toBe(2);
    expect(result.getUint8(0)).toBe(20);
    expect(result.getUint8(1)).toBe(30);

    result.setUint8(0, 99);

    expect(dataView.getUint8(0)).toBe(20);
  });
});

describe.each([false, true])('zero-byte SharedArrayBuffer (growable: %s)', (growable) => {
  function createBuffer() {
    return growable ? new SharedArrayBuffer(0, { maxByteLength: 8 }) : new SharedArrayBuffer(0);
  }

  it.each([copy, copyStrict])('will construct an independent empty copy', (copier) => {
    const original = createBuffer();
    const result = copier(original);

    expect(result).not.toBe(original);
    expect(result.byteLength).toBe(0);
    expect(result.growable).toBe(growable);
    expect(result.maxByteLength).toBe(original.maxByteLength);

    if (growable) {
      result.grow(4);

      expect(result.byteLength).toBe(4);
      expect(original.byteLength).toBe(0);
    }
  });

  it.each([false, true])('will preserve empty DataView cycles (buffer first: %s)', (bufferFirst) => {
    const buffer = Object.assign(createBuffer(), { view: null as DataView | null });
    const view = new DataView(buffer);

    buffer.view = view;

    const result = copyStrict(bufferFirst ? { buffer, view } : { view, buffer });

    expect(result.view.buffer).toBe(result.buffer);
    expect(result.buffer.view).toBe(result.view);
    expect(result.buffer).not.toBe(buffer);
    expect(result.view.byteLength).toBe(0);
    expect(result.buffer.growable).toBe(growable);
  });

  describe.each([
    { name: 'copy', copier: copy },
    { name: 'copyStrict', copier: copyStrict },
  ])('$name subclasses', ({ copier }) => {
    class CustomSharedArrayBuffer extends SharedArrayBuffer {}

    function createSubclassBuffer() {
      return growable ? new CustomSharedArrayBuffer(0, { maxByteLength: 8 }) : new CustomSharedArrayBuffer(0);
    }

    it('will preserve the subclass of the buffer', () => {
      const original = createSubclassBuffer();
      const result = copier(original);

      expect(result).not.toBe(original);
      expect(result).toBeInstanceOf(CustomSharedArrayBuffer);
      expect(result.byteLength).toBe(0);
      expect(result.growable).toBe(growable);
      expect(result.maxByteLength).toBe(original.maxByteLength);
    });

    it('will preserve the subclass of the buffer viewed by a DataView', () => {
      const original = createSubclassBuffer();
      const result = copier(new DataView(original));

      expect(result.buffer).not.toBe(original);
      expect(result.buffer).toBeInstanceOf(CustomSharedArrayBuffer);
      expect(result.byteLength).toBe(0);
      expect(result.buffer.growable).toBe(growable);
    });
  });
});

describe('maxDepth', () => {
  function nest(depth: number, createContainer: () => any) {
    const root = createContainer();

    let current = root;

    for (let i = 0; i < depth; ++i) {
      const next = createContainer();

      if (Array.isArray(current)) {
        current.push(next);
      } else {
        current.nested = next;
      }

      current = next;
    }

    return root;
  }

  const createObject = () => ({}) as any;
  const createArray = () => [] as any[];

  it.each([
    ['objects', createObject],
    ['arrays', createArray],
  ])('should throw a `MaxDepthExceededError` for %s nested beyond the default depth', (_name, createContainer) => {
    const deep = nest(5000, createContainer);

    expect(() => copy(deep)).toThrow(MaxDepthExceededError);
    expect(() => copyStrict(deep)).toThrow(MaxDepthExceededError);
  });

  it('should remain a `RangeError` for backwards compatibility', () => {
    expect(() => copy(nest(5000, createObject))).toThrow(RangeError);
  });

  it('should copy values nested up to the maximum depth', () => {
    const copyShallow = createCopier({ maxDepth: 3 });

    expect(copyShallow(nest(2, createObject))).toEqual(nest(2, createObject));
    expect(() => copyShallow(nest(3, createObject))).toThrow(MaxDepthExceededError);
  });

  it('should not count sibling or cached values toward the depth', () => {
    const shared = { foo: 'bar' };
    const wide = { a: shared, b: shared, c: { d: shared } };
    const copyShallow = createCopier({ maxDepth: 2 });

    expect(copyShallow(wide)).toEqual(wide);
  });

  it('should allow opting out of the limit', () => {
    const copyUnbounded = createCopier({ maxDepth: Infinity });
    const deep = nest(100, createObject);

    expect(copyUnbounded(deep)).toEqual(deep);
  });
});
