type PlainObject = {
  [key: string]: any;
  [index: number]: any;
};

let utils: typeof import('../src/utils');

beforeEach(() => {
  jest.isolateModules(() => {
    utils = require('../src/utils');
  });
});

describe('createCache', () => {
  it('will create a cache based on WeakMap if available globally', () => {
    const result = utils.createCache();

    expect(result instanceof WeakMap).toBe(true);
  });

  it('will create a cache based on a tiny WeakMap fill if not available globally', () => {
    const original = globalThis.WeakMap;

    globalThis.WeakMap = undefined;

    jest.isolateModules(() => {
      utils = require('../src/utils');
    });

    const result = utils.createCache();

    expect(result instanceof original).toBe(false);

    expect(result).toEqual({
      _keys: [],
      _values: [],
    });

    const key = { key: 'key' };
    const value = { value: 'value' };

    result.set(key, value);

    expect(result._keys).toEqual([key]);
    expect(result._values).toEqual([value]);
    expect(result.has(key)).toBe(true);
    expect(result.get(key)).toBe(value);
    const otherKey = {};
    expect(result.has(otherKey)).toBeFalsy();
    expect(result.get(otherKey)).toBeUndefined();

    globalThis.WeakMap = original;
  });
});

describe('getCleanClone', () => {
  it('will return a pure object when there is no constructor', () => {
    const object = Object.create(null);

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return a pure object when there is no __proto__ property', () => {
    const object: PlainObject = {};

    object.__proto__ = null;

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return an empty POJO when the object passed is a POJO', () => {
    const object = { foo: 'bar' };

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it('will return an empty object with custom prototype when the object created through Object.create()', () => {
    const object = Object.create({
      method() {},
    });

    object.foo = 'bar';

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(object));
  });

  it('will return an empty object with the given constructor when it is a global constructor', () => {
    const object = new Map();

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(new Map());

    expect(Object.getPrototypeOf(result)).toBe(Map.prototype);
  });

  it('will return an empty object with the custom prototype when it is a custom constructor', () => {
    class Foo {
      value: any;

      constructor(value: any) {
        this.value = value;
      }

      method() {}
    }

    const object = new Foo('bar');

    const result = utils.getCleanClone(object, Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(Object.create(Foo.prototype));

    expect(Object.getPrototypeOf(result)).toBe(Foo.prototype);
  });
});

describe('getObjectCloneLoose', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const original = Object.getOwnPropertySymbols;

    jest.isolateModules(() => {
      Object.getOwnPropertySymbols = undefined;
      utils = require('../src/utils');
    });

    const symbol = Symbol('quz');
    const object = {
      bar: { baz: 'quz' },
      foo: 'bar',
      [symbol]: 'blah',
    };
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = utils.createCache();

    const result = utils.getObjectCloneLoose(
      object,
      Object.getPrototypeOf(object),
      handleCopy,
      cache
    );

    Object.getOwnPropertySymbols = original;

    expect(result).not.toBe(object);
    expect(result).toEqual(
      Object.keys(object).reduce((clone: PlainObject, key): PlainObject => {
        clone[key] = object[key as keyof typeof object];

        return clone;
      }, {})
    );

    expect(handleCopy).toHaveBeenCalledTimes(Object.keys(object).length);
  });

  it('will create an object clone when property symbols are supported', () => {
    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = utils.createCache();

    const result = utils.getObjectCloneLoose(
      object,
      Object.getPrototypeOf(object),
      handleCopy,
      cache
    );

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.keys(object).length + Object.getOwnPropertySymbols(object).length
    );
  });
});

describe('getObjectCloneStrict', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const original = Object.getOwnPropertySymbols;

    jest.isolateModules(() => {
      Object.getOwnPropertySymbols = undefined;
      utils = require('../src/utils');
    });

    const object: PlainObject = {
      bar: { baz: 'quz' },
    };

    Object.defineProperty(object, 'foo', {
      value: 'bar',
    });

    Object.defineProperty(object, Symbol('quz'), {
      enumerable: true,
      value: 'blah',
    });

    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = utils.createCache();

    const result = utils.getObjectCloneStrict(
      object,
      Object.getPrototypeOf(object),
      handleCopy,
      cache
    );

    Object.getOwnPropertySymbols = original;

    expect(result).not.toBe(object);
    expect(result).toEqual(
      Object.keys(object).reduce(
        (clone: PlainObject, key: string): PlainObject => {
          clone[key] = object[key];

          return clone;
        },
        {}
      )
    );

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length
    );
  });

  it('will create an object clone when property symbols are not supported', () => {
    const object: PlainObject = {
      bar: { baz: 'quz' },
    };

    Object.defineProperty(object, 'foo', {
      value: 'bar',
    });

    Object.defineProperty(object, Symbol('quz'), {
      enumerable: true,
      value: 'blah',
    });

    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = utils.createCache();

    const result = utils.getObjectCloneStrict(
      object,
      Object.getPrototypeOf(object),
      handleCopy,
      cache
    );

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length +
        Object.getOwnPropertySymbols(object).length
    );
  });
});

describe('getRegExpFlags', () => {
  it('will return an empty string when no flags are on the regexp', () => {
    const regexp = /foo/;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('');
  });

  it('will add the g flag when one is on the regexp', () => {
    const regexp = /foo/g;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('g');
  });

  it('will add the i flag when one is on the regexp', () => {
    const regexp = /foo/i;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('i');
  });

  it('will add the m flag when one is on the regexp', () => {
    const regexp = /foo/m;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('m');
  });

  it('will add the u flag when one is on the regexp', () => {
    const regexp = /foo/u;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('u');
  });

  it('will add the g flag when one is on the regexp', () => {
    const regexp = /foo/y;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('y');
  });

  it('will add all flags preset on the regexp', () => {
    const regexp = /foo/gimuy;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('gimuy');
  });
});
