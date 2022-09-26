import {
  createCache,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from './utils';

import type { Cache, InternalCopier, Realm } from './utils';

export interface Options {
  isStrict?: boolean;
}

export interface StrictOptions extends Omit<Options, 'isStrict'> {}

const { isArray } = Array;
const { assign, getPrototypeOf } = Object;
const { toString } = Object.prototype;

/**
 * Copy an value deeply as much as possible.
 *
 * If `strict` is applied, then all properties (including non-enumerable ones)
 * are copied with their original property descriptors on both objects and arrays.
 *
 * The value is compared to the global constructors in the `realm` provided,
 * and the native constructor is always used to ensure that extensions of native
 * objects (allows in ES2015+) are maintained.
 */
export function copy<Value>(value: Value, options?: Options): Value {
  // manually coalesced instead of default parameters for performance
  const isStrict = !!(options && options.isStrict);
  const getObjectClone = isStrict ? getObjectCloneStrict : getObjectCloneLoose;

  /**
   * @function handleCopy
   *
   * @description
   * copy the value recursively based on its type
   *
   * @param value the value to copy
   * @returns the copied value
   */
  const handleCopy: InternalCopier = (value: any, cache: Cache): any => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (cache.has(value)) {
      return cache.get(value);
    }

    const prototype = value.__proto__ || getPrototypeOf(value);
    const Constructor = prototype && prototype.constructor;

    // plain objects
    if (!Constructor || Constructor === Object) {
      return getObjectClone(value, handleCopy, cache);
    }

    // arrays
    if (isArray(value)) {
      // if strict, include non-standard properties
      if (isStrict) {
        return getObjectCloneStrict(value, handleCopy, cache);
      }

      const clone = new Constructor();

      cache.set(value, clone);

      for (
        let index: number = 0, length = value.length;
        index < length;
        ++index
      ) {
        clone[index] = handleCopy(value[index], cache);
      }

      return clone;
    }

    const objectClass = toString.call(value);

    // dates
    if (objectClass === '[object Date]') {
      return new Constructor(value.getTime());
    }

    // regexps
    if (objectClass === '[object RegExp]') {
      const clone = new Constructor(
        value.source,
        value.flags || getRegExpFlags(value)
      );

      clone.lastIndex = value.lastIndex;

      return clone;
    }

    // maps
    if (objectClass === '[object Map]') {
      const clone = new Constructor();

      cache.set(value, clone);

      value.forEach((value: any, key: any) => {
        clone.set(key, handleCopy(value, cache));
      });

      return clone;
    }

    // sets
    if (objectClass === '[object Set]') {
      const clone = new Constructor();

      cache.set(value, clone);

      value.forEach((value: any) => {
        clone.add(handleCopy(value, cache));
      });

      return clone;
    }

    // blobs
    if (objectClass === '[object Blob]') {
      return value.slice(0, value.size, value.type);
    }

    // dataviews
    if (objectClass === '[object DataView]') {
      const clone = new Constructor(value.buffer.slice(0));

      cache.set(value, clone);

      return clone;
    }

    // array buffers
    if (
      objectClass === '[object Float32Array]' ||
      objectClass === '[object Float64Array]' ||
      objectClass === '[object Int8Array]' ||
      objectClass === '[object Int16Array]' ||
      objectClass === '[object Int32Array]' ||
      objectClass === '[object Uint8Array]' ||
      objectClass === '[object Uint8ClampedArray]' ||
      objectClass === '[object Uint16Array]' ||
      objectClass === '[object Uint32Array]' ||
      objectClass === '[object Uint64Array]' ||
      objectClass === '[object ArrayBuffer]'
    ) {
      const clone = value.slice(0);

      cache.set(value, clone);

      return clone;
    }

    // if the value cannot / should not be cloned, don't
    if (
      // promise-like
      typeof value.then === 'function' ||
      // errors
      objectClass === '[object Error]' ||
      // weakmaps
      objectClass === '[object WeakMap]' ||
      // weaksets
      objectClass === '[object WeakSet]'
    ) {
      return value;
    }

    // assume anything left is a custom constructor
    return getObjectClone(value, handleCopy, cache);
  };

  return handleCopy(value, createCache());
}

/**
 * Copy the value with `strict` option pre-applied.
 */
export function copyStrict(value: any, options?: StrictOptions) {
  return copy(value, assign({}, options, { isStrict: true }));
}
