interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

import {
  copyArrayStrict,
  copyMapStrict,
  copyObjectLoose,
  copyObjectStrict,
  copyPrimitiveWrapper,
  copySetStrict,
} from '../copier';
import { createDefaultCache } from '../options';

describe('copyArrayStrict', () => {
  it('will copy both indices and explicit properties', () => {
    const object: any = ['foo', 'bar'];
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copyArrayStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
    expect(result.baz).toBe(object.baz);
  });
});

describe('copyObjectLoose', () => {
  it('will create an object clone', () => {
    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    const result = copyObjectLoose(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(
      Object.keys(object).length + Object.getOwnPropertySymbols(object).length,
    );
  });
});

describe('copyObjectStrict', () => {
  it('will create an object clone', () => {
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
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    const result = copyObjectStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length +
        Object.getOwnPropertySymbols(object).length,
    );
  });
});

describe('copyMapStrict', () => {
  it('will copy both entries and explicit properties', () => {
    const object: any = new Map([
      ['foo', 'foo'],
      ['bar', 'bar'],
    ]);
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copyMapStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
    expect(result.baz).toBe(object.baz);
  });
});

describe('copyPrimitiveWrapper', () => {
  it('will create a copy of the value of the primitive in a new wrapper', () => {
    const boolean = new Boolean(true);
    const number = new Number('123');
    const string = new String('foo');

    [boolean, number, string].forEach((primitiveWrapper) => {
      const mockCopier = jest.fn().mockImplementation((arg) => arg);
      const cache = createDefaultCache();
      const prototype = Object.getPrototypeOf(primitiveWrapper);

      const result = copyPrimitiveWrapper(primitiveWrapper, {
        Constructor: prototype.constructor,
        cache,
        copier: mockCopier,
        prototype,
      });

      expect(result).not.toBe(primitiveWrapper);
      expect(result).toEqual(primitiveWrapper);
    });
  });
});

describe('copySetStrict', () => {
  it('will copy both values and explicit properties', () => {
    const object: any = new Set(['foo', 'bar']);
    const mockCopier = jest.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copySetStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
    expect(result.baz).toBe(object.baz);
  });
});
