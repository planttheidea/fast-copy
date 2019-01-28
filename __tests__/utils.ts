import {
  SUPPORTS,
  createCache,
  getCleanClone,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from '../src/utils';

type PlainObject = {
  [key: string]: any;
  [index: number]: any;
};

describe('createCache', () => {
  it('will create a cache based on WeakSet if available globally', () => {
    const support = SUPPORTS.WEAKSET;

    SUPPORTS.WEAKSET = true;

    const result = createCache();

    expect(result instanceof WeakSet).toBe(true);

    SUPPORTS.WEAKSET = support;
  });

  it('will create a cache based on a tiny WeakSet fill if not available globally', () => {
    const support = SUPPORTS.WEAKSET;

    SUPPORTS.WEAKSET = false;

    const result = createCache();

    expect(result instanceof WeakSet).toBe(false);

    expect(result).toEqual({
      _values: [],
    });

    const value = {};

    result.add(value);

    expect(result._values).toEqual([value]);
    expect(result.has(value)).toBe(true);

    SUPPORTS.WEAKSET = support;
  });
});

describe('getCleanClone', () => {
  it('will return a pure object when there is no constructor', () => {
    const object = Object.create(null);
    const realm = global;

    const result = getCleanClone(object, realm);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return a pure object when there is no __proto__ property', () => {
    const object: PlainObject = {};

    object.__proto__ = null;

    const realm = global;

    const result = getCleanClone(object, realm);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return an empty POJO when the object passed is a POJO', () => {
    const object = { foo: 'bar' };
    const realm = global;

    const result = getCleanClone(object, realm);

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it('will return an empty object with custom protype when the object created through Object.create()', () => {
    const object = Object.create({
      method() {},
    });

    object.foo = 'bar';

    const realm = global;

    const result = getCleanClone(object, realm);

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(object));
  });

  it('will return an empty object with the given constructor when it is a global constructor', () => {
    const object = new Map();
    const realm = global;

    const result = getCleanClone(object, realm);

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
    const realm = global;

    const result = getCleanClone(object, realm);

    expect(result).not.toBe(object);
    expect(result).toEqual(Object.create(Foo.prototype));

    expect(Object.getPrototypeOf(result)).toBe(Foo.prototype);
  });
});

describe('getObjectCloneLoose', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const support = SUPPORTS.SYMBOL_PROPERTIES;

    SUPPORTS.SYMBOL_PROPERTIES = false;

    const object = {
      bar: { baz: 'quz' },
      foo: 'bar',
      [Symbol('quz')]: 'blah',
    };
    const realm = global;
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = getObjectCloneLoose(object, realm, handleCopy, cache);

    expect(result).not.toBe(object);
    expect(result).toEqual(
      Object.keys(object).reduce(
        (clone: PlainObject, key: string): PlainObject => {
          clone[key] = object[key];

          return clone;
        },
        {},
      ),
    );

    expect(handleCopy).toHaveBeenCalledTimes(Object.keys(object).length);

    SUPPORTS.SYMBOL_PROPERTIES = support;
  });

  it('will create an object clone when property symbols are supported', () => {
    const support = SUPPORTS.SYMBOL_PROPERTIES;

    SUPPORTS.SYMBOL_PROPERTIES = true;

    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const realm = global;
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = getObjectCloneLoose(object, realm, handleCopy, cache);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.keys(object).length + Object.getOwnPropertySymbols(object).length,
    );

    SUPPORTS.SYMBOL_PROPERTIES = support;
  });
});

describe('getObjectCloneStrict', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const support = SUPPORTS.SYMBOL_PROPERTIES;

    SUPPORTS.SYMBOL_PROPERTIES = false;

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

    const realm = global;
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = getObjectCloneStrict(object, realm, handleCopy, cache);

    expect(result).not.toBe(object);
    expect(result).toEqual(
      Object.keys(object).reduce(
        (clone: PlainObject, key: string): PlainObject => {
          clone[key] = object[key];

          return clone;
        },
        {},
      ),
    );

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length,
    );

    SUPPORTS.SYMBOL_PROPERTIES = support;
  });

  it('will create an object clone when property symbols are not supported', () => {
    const support = SUPPORTS.SYMBOL_PROPERTIES;

    SUPPORTS.SYMBOL_PROPERTIES = true;

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

    const realm = global;
    const handleCopy = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = getObjectCloneStrict(object, realm, handleCopy, cache);

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(handleCopy).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length +
        Object.getOwnPropertySymbols(object).length,
    );

    SUPPORTS.SYMBOL_PROPERTIES = support;
  });
});

describe('getRegExpFlags', () => {
  it('will return an empty string when no flags are on the regexp', () => {
    const regexp = /foo/;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('');
  });

  it('will add the g flag when one is on the regexp', () => {
    const regexp = /foo/g;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('g');
  });

  it('will add the i flag when one is on the regexp', () => {
    const regexp = /foo/i;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('i');
  });

  it('will add the m flag when one is on the regexp', () => {
    const regexp = /foo/m;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('m');
  });

  it('will add the u flag when one is on the regexp', () => {
    const regexp = /foo/u;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('u');
  });

  it('will add the g flag when one is on the regexp', () => {
    const regexp = /foo/y;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('y');
  });

  it('will add all flags preset on the regexp', () => {
    const regexp = /foo/gimuy;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('gimuy');
  });
});
