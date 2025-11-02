interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

let utils: typeof import('../src/utils');

beforeEach(() => {
  jest.isolateModules(() => {
    utils = jest.requireActual('../src/utils');
  });
});

describe('createCache', () => {
  it('will create a cache based on WeakMap if available globally', () => {
    const result = utils.createCache();

    expect(result instanceof WeakMap).toBe(true);
  });

  it('will create a cache based on a tiny WeakMap fill if not available globally', () => {
    const original = globalThis.WeakMap;

    // @ts-expect-error - Override for testing.
    globalThis.WeakMap = undefined;

    jest.isolateModules(() => {
      utils = jest.requireActual('../src/utils');
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

    // @ts-expect-error - accessing internal property
    expect(result._keys).toEqual([key]);
    // @ts-expect-error - accessing internal property
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
  it('will return a pure object when there is no prototype', () => {
    const object = Object.create(null);

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return a pure object when there is a prototype but no constructor', () => {
    const Empty = function () {
      // empty
    };
    Empty.prototype = Object.create(null);

    // @ts-expect-error - Testing `fast-querystring` V8 optimization
    const object = new Empty();

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(Empty.prototype);
  });

  it('will return a pure object when there is no __proto__ property', () => {
    const object: PlainObject = {};

    object.__proto__ = null;

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return an empty POJO when the object passed is a POJO', () => {
    const object = { foo: 'bar' };

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it('will return an empty object with custom prototype when the object created through Object.create()', () => {
    const object = Object.create({
      // No need for body in test
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      method() {},
    });

    object.foo = 'bar';

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(object));
  });

  it('will return an empty object with the given constructor when it is a global constructor', () => {
    const object = new Map();

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

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

      // No need for body in test
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      method() {}
    }

    const object = new Foo('bar');

    const result = utils.getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(Object.create(Foo.prototype));

    expect(Object.getPrototypeOf(result)).toBe(Foo.prototype);
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
    // @ts-expect-error - Testing u flag
    const regexp = /foo/u;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('u');
  });

  it('will add the g flag when one is on the regexp', () => {
    // @ts-expect-error - Testing y flag
    const regexp = /foo/y;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('y');
  });

  it('will add all flags preset on the regexp', () => {
    // @ts-expect-error - Testing uy flag
    const regexp = /foo/gimuy;

    const result = utils.getRegExpFlags(regexp);

    expect(result).toEqual('gimuy');
  });
});
