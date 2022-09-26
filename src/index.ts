import {
  createCache,
  getArrayCloneLoose,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from './utils';

import type { Cache, Realm } from './utils';

export interface Options {
  isStrict?: boolean;
}

export interface StrictOptions extends Omit<Options, 'isStrict'> {}

type GetArrayClone = typeof getArrayCloneLoose | typeof getObjectCloneStrict;
type GetObjectClone = typeof getObjectCloneLoose | typeof getObjectCloneStrict;

const { isArray } = Array;
const { getPrototypeOf } = Object;
const { toString } = Object.prototype;

function performCopy<Value>(
  value: Value,
  getObjectClone: GetObjectClone,
  getArrayClone: GetArrayClone
) {
  function handleCopy(value: any, cache: Cache): any {
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
      return getArrayClone(value, handleCopy, cache);
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
  }

  return handleCopy(value, createCache());
}

/**
 * Copy an value deeply as much as possible.
 */
export function copy<Value>(value: Value): Value {
  return performCopy(value, getObjectCloneLoose, getArrayCloneLoose);
}

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export function copyStrict(value: any) {
  return performCopy(value, getObjectCloneStrict, getObjectCloneStrict);
}
