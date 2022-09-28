type PlainObject = {
  [key: string]: any;
  [index: number]: any;
};

import { createCache } from '../src/utils';

let copier: typeof import('../src/copier');

beforeEach(() => {
  jest.isolateModules(() => {
    copier = require('../src/copier');
  });
});

describe('copyObjectLoose', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const original = Object.getOwnPropertySymbols;

    jest.isolateModules(() => {
      Object.getOwnPropertySymbols = undefined;
      copier = require('../src/copier');
    });

    const symbol = Symbol('quz');
    const object = {
      bar: { baz: 'quz' },
      foo: 'bar',
      [symbol]: 'blah',
    };
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = copier.copyObjectLoose(
      object,
      Object.getPrototypeOf(object),
      mockCopier,
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

    expect(mockCopier).toHaveBeenCalledTimes(Object.keys(object).length);
  });

  it('will create an object clone when property symbols are supported', () => {
    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = copier.copyObjectLoose(
      object,
      Object.getPrototypeOf(object),
      mockCopier,
      cache
    );

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(
      Object.keys(object).length + Object.getOwnPropertySymbols(object).length
    );
  });
});

describe('copyObjectStrict', () => {
  it('will create an object clone when property symbols are not supported', () => {
    const original = Object.getOwnPropertySymbols;

    jest.isolateModules(() => {
      Object.getOwnPropertySymbols = undefined;
      copier = require('../src/copier');
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

    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = copier.copyObjectStrict(
      object,
      Object.getPrototypeOf(object),
      mockCopier,
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

    expect(mockCopier).toHaveBeenCalledTimes(
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

    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createCache();

    const result = copier.copyObjectStrict(
      object,
      Object.getPrototypeOf(object),
      mockCopier,
      cache
    );

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length +
        Object.getOwnPropertySymbols(object).length
    );
  });
});
