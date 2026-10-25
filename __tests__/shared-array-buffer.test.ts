import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { copy, copyStrict, createCopier } from '../src/index.js';

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
});

describe('fixed empty shared buffer construction', () => {
  it('will retain a subclass and support another realm', () => {
    class EmptySharedBuffer extends SharedArrayBuffer {}

    const original = new EmptySharedBuffer(0);
    const foreign = runInNewContext('new SharedArrayBuffer(0)') as SharedArrayBuffer;

    expect(Object.getPrototypeOf(copyStrict(original))).toBe(EmptySharedBuffer.prototype);
    expect(Object.getPrototypeOf(copyStrict(foreign))).toBe(Object.getPrototypeOf(foreign));
  });

  it.each([null, undefined])('will use the default species when it is %s', (species) => {
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', { value: { [Symbol.species]: species } });

    const result = copy(original);

    expect(result).not.toBe(original);
    expect(result.byteLength).toBe(0);
  });

  it('will use the default species when the constructor is undefined', () => {
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', { value: undefined });

    expect(copy(original)).not.toBe(original);
  });

  it.each([null, 1])('will reject a non-object constructor: %s', (constructor) => {
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', { value: constructor });

    expect(() => copy(original)).toThrow(TypeError);
  });

  it.each([() => new ArrayBuffer(0), () => 1])('will reject a species that is not a constructor', (species) => {
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', { value: { [Symbol.species]: species } });

    expect(() => copy(original)).toThrow(TypeError);
  });

  it('will reject an incompatible or original buffer returned by species', () => {
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', {
      configurable: true,
      value: {
        [Symbol.species]: function () {
          return new ArrayBuffer(0);
        },
      },
    });

    expect(() => copy(original)).toThrow(TypeError);

    Object.defineProperty(original, 'constructor', {
      value: {
        [Symbol.species]: function () {
          return original;
        },
      },
    });

    expect(() => copy(original)).toThrow(TypeError);
  });

  it('will propagate species getter and constructor errors', () => {
    const error = new Error('species failed');
    const original = new SharedArrayBuffer(0);

    Object.defineProperty(original, 'constructor', {
      configurable: true,
      value: {
        get [Symbol.species]() {
          throw error;
        },
      },
    });

    expect(() => copy(original)).toThrow(error);

    Object.defineProperty(original, 'constructor', {
      value: {
        [Symbol.species]: function () {
          throw error;
        },
      },
    });

    expect(() => copy(original)).toThrow(error);
  });

  it('will preserve a custom slice override and its exceptions', () => {
    const original = new SharedArrayBuffer(0);
    const error = new Error('slice failed');
    const slice = vi.fn(() => {
      throw error;
    });

    Object.defineProperty(original, 'slice', { get: () => slice });

    expect(() => copy(original)).toThrow(error);
    expect(slice).toHaveBeenCalledExactlyOnceWith(0);
    expect(slice.mock.contexts[0]).toBe(original);
  });

  it('will preserve a replacement on the shared buffer prototype', () => {
    const descriptor = Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'slice')!;
    const error = new Error('prototype slice failed');
    const slice = vi.fn(() => {
      throw error;
    });

    Object.defineProperty(SharedArrayBuffer.prototype, 'slice', { ...descriptor, value: slice });

    try {
      expect(() => copy(new SharedArrayBuffer(0))).toThrow(error);
      expect(slice).toHaveBeenCalledExactlyOnceWith(0);
    } finally {
      Object.defineProperty(SharedArrayBuffer.prototype, 'slice', descriptor);
    }
  });

  it.each([copy, copyStrict])('will use the intrinsic size despite an own byteLength', (copier) => {
    const original = new SharedArrayBuffer(4);

    new Uint8Array(original).set([1, 2, 3, 4]);
    Object.defineProperty(original, 'byteLength', { value: 0 });

    const result = copier(original);

    expect([...new Uint8Array(result)]).toEqual([1, 2, 3, 4]);

    if (copier === copyStrict) {
      expect(Object.getOwnPropertyDescriptor(result, 'byteLength')).toEqual(
        Object.getOwnPropertyDescriptor(original, 'byteLength'),
      );
    }
  });

  it.each([copy, copyStrict])('will preserve ordinary ArrayBuffer tags and slice overrides', (copier) => {
    class TaggedBuffer extends ArrayBuffer {}

    Object.defineProperty(TaggedBuffer.prototype, Symbol.toStringTag, {
      get(this: ArrayBuffer) {
        const descriptor = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!;

        // eslint-disable-next-line @typescript-eslint/unbound-method
        Reflect.apply(descriptor.get!, this, []);

        return 'ArrayBuffer';
      },
    });

    expect(copier(new TaggedBuffer(4)).byteLength).toBe(4);

    const original = new ArrayBuffer(0);
    const slice = vi.fn(() => new ArrayBuffer(0));

    Object.defineProperty(original, 'slice', { value: slice });

    expect(copier(original).byteLength).toBe(0);
    expect(slice).toHaveBeenCalledExactlyOnceWith(0);
    expect(slice.mock.contexts[0]).toBe(original);
  });
});
