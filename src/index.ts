import {
  createCache,
  getArrayCloneLoose,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from './utils';

import type { Cache } from './utils';

type GetArrayClone = typeof getArrayCloneLoose | typeof getObjectCloneStrict;
type GetObjectClone = typeof getObjectCloneLoose | typeof getObjectCloneStrict;

const { isArray } = Array;
const { getPrototypeOf } = Object;
const { toString } = Object.prototype;

const ARRAY_BUFFER_OBJECT_CLASSES: Record<string, boolean> = {
  ['[object ArrayBuffer]']: true,
  ['[object Float32Array]']: true,
  ['[object Float64Array]']: true,
  ['[object Int8Array]']: true,
  ['[object Int16Array]']: true,
  ['[object Int32Array]']: true,
  ['[object Uint8Array]']: true,
  ['[object Uint8ClampedArray]']: true,
  ['[object Uint16Array]']: true,
  ['[object Uint32Array]']: true,
  ['[object Uint64Array]']: true,
};
const UNCOPIABLE_OBJECT_CLASSES: Record<string, boolean> = {
  ['[object Error]']: true,
  ['[object Promise]']: true,
  ['[object WeakMap]']: true,
  ['[object WeakSet]']: true,
};

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
    if (ARRAY_BUFFER_OBJECT_CLASSES[objectClass]) {
      const clone = value.slice(0);

      cache.set(value, clone);

      return clone;
    }

    // if the value cannot / should not be copied deeply, return the reference
    if (
      // promise-like
      typeof value.then === 'function' ||
      // object classes which cannot be introspected for copy
      UNCOPIABLE_OBJECT_CLASSES[objectClass]
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
export function copyStrict<Value>(value: Value): Value {
  return performCopy(value, getObjectCloneStrict, getObjectCloneStrict);
}
