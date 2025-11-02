import { getCleanClone, getRegExpFlags } from '../src/utils';

interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

describe('getCleanClone', () => {
  it('will return a pure object when there is no prototype', () => {
    const object = Object.create(null);

    const result = getCleanClone(Object.getPrototypeOf(object));

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

    const result = getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(Empty.prototype);
  });

  it('will return a pure object when there is no __proto__ property', () => {
    const object: PlainObject = {};

    object.__proto__ = null;

    const result = getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(Object.getPrototypeOf(result)).toBe(null);
  });

  it('will return an empty POJO when the object passed is a POJO', () => {
    const object = { foo: 'bar' };

    const result = getCleanClone(Object.getPrototypeOf(object));

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

    const result = getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual({});

    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(object));
  });

  it('will return an empty object with the given constructor when it is a global constructor', () => {
    const object = new Map();

    const result = getCleanClone(Object.getPrototypeOf(object));

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

    const result = getCleanClone(Object.getPrototypeOf(object));

    expect(result).not.toBe(object);
    expect(result).toEqual(Object.create(Foo.prototype));

    expect(Object.getPrototypeOf(result)).toBe(Foo.prototype);
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
    // @ts-expect-error - Testing u flag
    const regexp = /foo/u;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('u');
  });

  it('will add the g flag when one is on the regexp', () => {
    // @ts-expect-error - Testing y flag
    const regexp = /foo/y;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('y');
  });

  it('will add all flags preset on the regexp', () => {
    // @ts-expect-error - Testing uy flag
    const regexp = /foo/gimuy;

    const result = getRegExpFlags(regexp);

    expect(result).toEqual('gimuy');
  });
});
