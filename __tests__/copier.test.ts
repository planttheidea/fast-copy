import { describe, expect, it, vi } from 'vitest';
import {
  copyArrayBuffer,
  copyArrayBufferStrict,
  copyArrayStrict,
  copyBlobStrict,
  copyDataViewStrict,
  copyDateStrict,
  copyMapStrict,
  copyObject,
  copyObjectStrict,
  copyPrimitiveWrapper,
  copyPrimitiveWrapperStrict,
  copyRegExpStrict,
  copySetStrict,
  copyStringStrict,
} from '../src/copier.js';
import type { State } from '../src/copier.ts';
import { copyStrict } from '../src/index.js';
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

    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(original);

    const result = copyDateStrict(original, {
      Constructor: prototype.constructor,
      cache,
      copier: copyStrict,
      depth: 0,
      prototype,
    });

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

    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(original);

    Object.defineProperties(original, {
      hidden: { value: { source: 'api' } },
      [symbol]: { configurable: true, enumerable: true, value: 'symbol', writable: true },
      accessor: { configurable: true, get: getter },
    });

    const result = copyDateStrict(original, {
      Constructor: prototype.constructor,
      cache,
      copier: copyStrict,
      depth: 0,
      prototype,
    });
    const originalHidden = Object.getOwnPropertyDescriptor(original, 'hidden')!;
    const resultHidden = Object.getOwnPropertyDescriptor(result, 'hidden')!;

    expect(resultHidden).toEqual(originalHidden);
    expect(resultHidden.value).not.toBe(originalHidden.value);
    expect(Object.getOwnPropertyDescriptor(result, symbol)).toEqual(Object.getOwnPropertyDescriptor(original, symbol));
    expect(Object.getOwnPropertyDescriptor(result, 'accessor')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'accessor'),
    );
  });
});

describe('copyRegExpStrict', () => {
  class CustomRegExp extends RegExp {}

  it.each([/test/gi, new CustomRegExp('test', 'gy')])('will strictly copy metadata on %s', (regExp) => {
    const original = Object.assign(regExp, { lastIndex: 3, metadata: { source: 'api' } });
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(original);

    const result = copyRegExpStrict(original, {
      Constructor: prototype.constructor,
      cache,
      copier: copyStrict,
      depth: 0,
      prototype,
    });

    expect(result).not.toBe(original);
    expect(Object.getPrototypeOf(result)).toBe(prototype);
    expect(result.source).toBe(original.source);
    expect(result.flags).toBe(original.flags);
    expect(result.lastIndex).toBe(3);
    expect(result.metadata).toEqual(original.metadata);
    expect(result.metadata).not.toBe(original.metadata);
    expect(cache.get(original)).toBe(result);
  });

  it('will preserve lastIndex, hidden, symbol and accessor descriptors without reading getters', () => {
    const symbol = Symbol('metadata');
    const original = /test/g;
    const getter = () => {
      throw new Error('Getter must not be called');
    };
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(original);

    Object.defineProperties(original, {
      lastIndex: { value: 3, writable: false },
      hidden: { value: { source: 'api' } },
      [symbol]: { configurable: true, enumerable: true, value: 'symbol', writable: true },
      accessor: { configurable: true, get: getter },
    });

    const result = copyRegExpStrict(original, {
      Constructor: prototype.constructor,
      cache,
      copier: copyStrict,
      depth: 0,
      prototype,
    });
    const originalHidden = Object.getOwnPropertyDescriptor(original, 'hidden')!;
    const resultHidden = Object.getOwnPropertyDescriptor(result, 'hidden')!;

    expect(resultHidden).toEqual(originalHidden);
    expect(resultHidden.value).not.toBe(originalHidden.value);
    expect(Object.getOwnPropertyDescriptor(result, 'lastIndex')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'lastIndex'),
    );
    expect(Object.getOwnPropertyDescriptor(result, symbol)).toEqual(Object.getOwnPropertyDescriptor(original, symbol));
    expect(Object.getOwnPropertyDescriptor(result, 'accessor')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'accessor'),
    );
  });
});

describe('copyObject', () => {
  it('will create an object clone', () => {
    const object = {
      bar: { baz: 'quz' },
      [Symbol('quz')]: 'blah',
    };
    const mockCopier = vi.fn().mockImplementation((arg) => arg);
    const cache = createDefaultCache();
    const prototype = Object.getPrototypeOf(object);

    const result = copyObject(object, {
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

function createStrictState(value: any): State {
  const prototype = Object.getPrototypeOf(value);

  return {
    Constructor: prototype.constructor,
    cache: createDefaultCache(),
    copier: copyStrict,
    depth: 0,
    prototype,
  };
}

class CustomArray extends Array {}
class CustomMap extends Map<string, string> {}
class CustomSet extends Set {}

interface StrictHandlerCase {
  name: string;
  handler: (value: any, state: State) => any;
  create: () => any;
  verify: (result: any, original: any) => void;
}

const STRICT_HANDLER_CASES: StrictHandlerCase[] = [
  {
    name: 'Array',
    handler: copyArrayStrict,
    create: () => ['foo', { bar: 'baz' }],
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
      expect(result[1]).not.toBe(original[1]);
    },
  },
  {
    name: 'Array subclass',
    handler: copyArrayStrict,
    create: () => CustomArray.from(['foo', 'bar']),
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
    },
  },
  {
    name: 'ArrayBuffer',
    handler: copyArrayBufferStrict,
    create: () => new Uint8Array([1, 2, 3]).buffer,
    verify: (result, original) => {
      expect(new Uint8Array(result)).toEqual(new Uint8Array(original));
    },
  },
  {
    name: 'Uint8Array',
    handler: copyArrayBufferStrict,
    create: () => new Uint8Array([1, 2, 3]),
    verify: (result, original) => {
      expect(result).toEqual(original);
      expect(result.buffer).not.toBe(original.buffer);
    },
  },
  {
    name: 'Float64Array',
    handler: copyArrayBufferStrict,
    create: () => new Float64Array([1.5, 2.5]),
    verify: (result, original) => {
      expect(result).toEqual(original);
      expect(result.buffer).not.toBe(original.buffer);
    },
  },
  {
    name: 'Buffer',
    handler: copyArrayBufferStrict,
    create: () => Buffer.from('buffer'),
    verify: (result, original) => {
      expect(result.toString()).toBe(original.toString());
      expect(result.buffer).not.toBe(original.buffer);
    },
  },
  {
    name: 'Blob',
    handler: copyBlobStrict,
    create: () => new Blob(['blob'], { type: 'text/plain' }),
    verify: (result, original) => {
      expect(result.size).toBe(original.size);
      expect(result.type).toBe(original.type);
    },
  },
  {
    name: 'DataView',
    handler: copyDataViewStrict,
    create: () => new DataView(new Uint8Array([1, 2, 3, 4]).buffer, 1, 2),
    verify: (result, original) => {
      expect(result.buffer).not.toBe(original.buffer);
      expect(result.byteOffset).toBe(original.byteOffset);
      expect(result.byteLength).toBe(original.byteLength);
      expect(result.getUint16(0)).toBe(original.getUint16(0));
    },
  },
  {
    name: 'Date',
    handler: copyDateStrict,
    create: () => new Date(1234),
    verify: (result, original) => {
      expect(result.getTime()).toBe(original.getTime());
    },
  },
  {
    name: 'Map',
    handler: copyMapStrict,
    create: () => new Map([['foo', { bar: 'baz' }]]),
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
      expect(result.get('foo')).not.toBe(original.get('foo'));
    },
  },
  {
    name: 'Map subclass',
    handler: copyMapStrict,
    create: () => new CustomMap([['foo', 'bar']]),
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
    },
  },
  {
    name: 'Boolean',
    handler: copyPrimitiveWrapperStrict,
    create: () => new Boolean(false),
    verify: (result, original) => {
      expect(result.valueOf()).toBe(original.valueOf());
    },
  },
  {
    name: 'Number',
    handler: copyPrimitiveWrapperStrict,
    create: () => new Number(123),
    verify: (result, original) => {
      expect(result.valueOf()).toBe(original.valueOf());
    },
  },
  {
    name: 'Set',
    handler: copySetStrict,
    create: () => new Set(['foo', { bar: 'baz' }]),
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
      expect([...result][1]).not.toBe([...original][1]);
    },
  },
  {
    name: 'Set subclass',
    handler: copySetStrict,
    create: () => new CustomSet(['foo']),
    verify: (result, original) => {
      expect([...result]).toEqual([...original]);
    },
  },
  {
    name: 'String',
    handler: copyStringStrict,
    create: () => new String('string'),
    verify: (result, original) => {
      expect(result.valueOf()).toBe(original.valueOf());
    },
  },
];

describe.each(STRICT_HANDLER_CASES)('strict handler for $name', ({ create, handler, verify }) => {
  it('will strictly copy metadata', () => {
    const original = Object.assign(create(), { metadata: { source: 'api' } });
    const state = createStrictState(original);

    const result = handler(original, state);

    expect(result).not.toBe(original);
    expect(Object.getPrototypeOf(result)).toBe(Object.getPrototypeOf(original));
    verify(result, original);
    expect(result.metadata).toEqual(original.metadata);
    expect(result.metadata).not.toBe(original.metadata);
    expect(state.cache.get(original)).toBe(result);
  });

  it('will preserve hidden, symbol and accessor descriptors without reading getters', () => {
    const symbol = Symbol('metadata');
    const original = create();
    const getter = () => {
      throw new Error('Getter must not be called');
    };

    Object.defineProperties(original, {
      hidden: { value: { source: 'api' } },
      [symbol]: { configurable: true, enumerable: true, value: 'symbol', writable: true },
      accessor: { configurable: true, get: getter },
    });

    const result = handler(original, createStrictState(original));
    const originalHidden = Object.getOwnPropertyDescriptor(original, 'hidden')!;
    const resultHidden = Object.getOwnPropertyDescriptor(result, 'hidden')!;

    verify(result, original);
    expect(resultHidden).toEqual(originalHidden);
    expect(resultHidden.value).not.toBe(originalHidden.value);
    expect(Object.getOwnPropertyDescriptor(result, symbol)).toEqual(Object.getOwnPropertyDescriptor(original, symbol));
    expect(Object.getOwnPropertyDescriptor(result, 'accessor')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'accessor'),
    );
  });
});

describe('copyArrayStrict index descriptors', () => {
  it('will preserve accessor indices without reading getters', () => {
    const original: any[] = ['foo', 'bar'];
    const getter = () => {
      throw new Error('Getter must not be called');
    };

    Object.defineProperty(original, 0, { configurable: true, enumerable: true, get: getter });

    const result = copyArrayStrict(original, createStrictState(original));

    expect(Object.getOwnPropertyDescriptor(result, 0)).toEqual(Object.getOwnPropertyDescriptor(original, 0));
    expect(result[1]).toBe('bar');
  });

  it('will preserve non-writable and non-enumerable index and `length` descriptors', () => {
    const original: any[] = Object.freeze([{ foo: 'bar' }, 'baz']) as any[];

    const result = copyArrayStrict(original, createStrictState(original));

    // `toEqual` compares the descriptor values deeply, so the copied object still matches.
    expect(Object.getOwnPropertyDescriptors(result)).toEqual(Object.getOwnPropertyDescriptors(original));
    expect(result[0]).not.toBe(original[0]);

    const hidden: any[] = ['foo', 'bar'];

    Object.defineProperty(hidden, 1, { enumerable: false });

    expect(Object.getOwnPropertyDescriptor(copyArrayStrict(hidden, createStrictState(hidden)), 1)).toEqual(
      Object.getOwnPropertyDescriptor(hidden, 1),
    );
  });
});

describe('copyArrayStrict for sparse arrays', () => {
  it('will preserve holes and copy custom properties', () => {
    // eslint-disable-next-line no-sparse-arrays
    const original: any = ['foo', , 'bar'];

    original.metadata = { source: 'api' };

    const result = copyArrayStrict(original, createStrictState(original));

    expect(result).toHaveLength(3);
    expect(1 in result).toBe(false);
    expect(result[0]).toBe('foo');
    expect(result[2]).toBe('bar');
    expect(result.metadata).toEqual(original.metadata);
    expect(result.metadata).not.toBe(original.metadata);
  });
});

describe('copyArrayBuffer', () => {
  class CustomArrayBuffer extends ArrayBuffer {}

  it.each([
    ['ArrayBuffer', () => new ArrayBuffer(4, { maxByteLength: 16 }), 'resizable'],
    ['ArrayBuffer subclass', () => new CustomArrayBuffer(4, { maxByteLength: 16 }), 'resizable'],
    ['SharedArrayBuffer', () => new SharedArrayBuffer(4, { maxByteLength: 16 }), 'growable'],
  ] as const)('will keep a resizable %s resizable', (_name, create, flag) => {
    const original = create();

    new Uint8Array(original).set([1, 2, 3, 4]);

    const result: any = copyArrayBuffer(original, createStrictState(original));

    expect(result).not.toBe(original);
    expect(result).toBeInstanceOf(original.constructor);
    expect(result[flag]).toBe(true);
    expect(result.maxByteLength).toBe(16);
    expect([...new Uint8Array(result)]).toEqual([1, 2, 3, 4]);
  });

  it('will keep a fixed-length ArrayBuffer fixed', () => {
    const original = new ArrayBuffer(4);

    const result = copyArrayBuffer(original, createStrictState(original));

    expect(result).not.toBe(original);
    expect(result.resizable).toBe(false);
    expect(result.byteLength).toBe(4);
  });
});

describe('copyArrayBufferStrict', () => {
  it('will copy an own `length` property on an ArrayBuffer', () => {
    const original: any = Object.assign(new ArrayBuffer(4), { length: 0, metadata: 'metadata' });

    const result = copyArrayBufferStrict(original, createStrictState(original));

    expect(result.byteLength).toBe(4);
    expect(result.length).toBe(0);
    expect(result.metadata).toBe('metadata');
  });

  it('will copy an own `length` property that shadows the length of a typed array', () => {
    const original: any = new Uint8Array([1, 2]);

    Object.defineProperty(original, 'length', { configurable: true, value: 10 });
    original.metadata = 'metadata';

    const result = copyArrayBufferStrict(original, createStrictState(original));

    expect([...result]).toEqual([1, 2]);
    expect(Object.getOwnPropertyDescriptor(result, 'length')).toEqual(
      Object.getOwnPropertyDescriptor(original, 'length'),
    );
    expect(result.metadata).toBe('metadata');
  });
});

describe('copyStringStrict', () => {
  it('will copy integer keys beyond the length of the string', () => {
    const original: any = new String('ab');

    original[5] = { source: 'api' };
    original.metadata = 'metadata';

    const result = copyStringStrict(original, createStrictState(original));

    expect(result.valueOf()).toBe('ab');
    expect(result[5]).toEqual(original[5]);
    expect(result[5]).not.toBe(original[5]);
    expect(result.metadata).toBe('metadata');
  });
});
