import { describe, expect, it, vi } from 'vitest';
import {
  copyArrayStrict,
  copyMapStrict,
  copyObjectLoose,
  copyObjectStrict,
  copyPrimitiveWrapper,
  copySetStrict,
} from '../src/copier.js';
import { copy, copyStrict, createCopier } from '../src/index.js';
import { createDefaultCache } from '../src/options.js';

interface PlainObject {
  [key: string]: any;
  [index: number]: any;
}

describe('copyArrayStrict', () => {
  it('will copy both indices and explicit properties', () => {
    const object: any = ['foo', 'bar'];
    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copyArrayStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      depth: 0,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
    expect(result.baz).toBe(object.baz);
  });
});

describe('copyDateStrict', () => {
  class CustomDate extends Date {}

  it.each([new Date(1234), new CustomDate(NaN)])('will strictly copy metadata on %s', (date) => {
    const original = Object.assign(date, { metadata: { source: 'api' } });
    const result = copyStrict(original);

    expect(result).not.toBe(original);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(original));
    expect(result.getTime()).toBe(original.getTime());
    expect(result.metadata).toEqual(original.metadata);
    expect(result.metadata).not.toBe(original.metadata);
  });

  it('will preserve hidden, symbol and accessor descriptors without reading getters', () => {
    const symbol = Symbol('metadata');
    const original = new Date(0);
    const getter = () => {
      throw new Error('Getter must not be called');
    };

    Object.defineProperties(original, {
      hidden: { value: { source: 'api' } },
      [symbol]: { configurable: true, enumerable: true, value: 'symbol', writable: true },
      accessor: { configurable: true, get: getter },
    });

    const result = copyStrict(original);
    const originalHidden = Object.getOwnPropertyDescriptor(original, 'hidden')!;
    const resultHidden = Object.getOwnPropertyDescriptor(result, 'hidden')!;

    expect(resultHidden).toEqual(originalHidden);
    expect(resultHidden.value).not.toBe(originalHidden.value);
    expect(Object.getOwnPropertyDescriptor(result, symbol)).toEqual(Object.getOwnPropertyDescriptor(original, symbol));
    expect(Object.getOwnPropertyDescriptor(result, 'accessor')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'accessor'),
    );
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
});

describe('copyObjectLoose', () => {
  it('will create an object clone', () => {
    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    const result = copyObjectLoose(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      depth: 0,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(Object.keys(object).length + Object.getOwnPropertySymbols(object).length);
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

    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    const result = copyObjectStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      depth: 0,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);

    expect(mockCopier).toHaveBeenCalledTimes(
      Object.getOwnPropertyNames(object).length + Object.getOwnPropertySymbols(object).length,
    );
  });
});

describe('copyMapStrict', () => {
  it('will copy both entries and explicit properties', () => {
    const object: any = new Map([
      ['foo', 'foo'],
      ['bar', 'bar'],
    ]);
    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copyMapStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      depth: 0,
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
      const mockCopier = vi.fn().mockImplementation((arg) => arg);
      const cache = createDefaultCache();
      const prototype = Object.getPrototypeOf(primitiveWrapper);

      const result = copyPrimitiveWrapper(primitiveWrapper, {
        Constructor: prototype.constructor,
        cache,
        copier: mockCopier,
        depth: 0,
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
    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    object.baz = 'baz';

    const result = copySetStrict(object, {
      Constructor: prototype.constructor,
      cache,
      copier: mockCopier,
      depth: 0,
      prototype,
    });

    expect(result).not.toBe(object);
    expect(result).toEqual(object);
    expect(result.baz).toBe(object.baz);
  });
});
