import {
  copyArrayLoose,
  copyObjectLoose,
  copyObjectStrict,
  copyMap,
  copyRegExp,
  copySet,
} from './copiers';
import { createCache } from './utils';

import type { Cache } from './utils';

type CopyArray = typeof copyArrayLoose | typeof copyObjectStrict;
type CopyObject = typeof copyObjectLoose | typeof copyObjectStrict;

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

function createCopier(copyArray: CopyArray, copyObject: CopyObject) {
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
      return copyObject(value, prototype, handleCopy, cache);
    }

    // arrays
    if (isArray(value)) {
      return copyArray(value, prototype, handleCopy, cache);
    }

    const objectClass = toString.call(value);

    // dates
    if (objectClass === '[object Date]') {
      return new Constructor(value.getTime());
    }

    // regexps
    if (objectClass === '[object RegExp]') {
      return copyRegExp(value, Constructor);
    }

    // maps
    if (objectClass === '[object Map]') {
      return copyMap(value, Constructor, handleCopy, cache);
    }

    // sets
    if (objectClass === '[object Set]') {
      return copySet(value, Constructor, handleCopy, cache);
    }

    // blobs
    if (objectClass === '[object Blob]') {
      return value.slice(0, value.size, value.type);
    }

    // dataviews
    if (objectClass === '[object DataView]') {
      return new Constructor(value.buffer.slice(0));
    }

    // array buffers
    if (ARRAY_BUFFER_OBJECT_CLASSES[objectClass]) {
      return value.slice(0);
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
    return copyObject(value, prototype, handleCopy, cache);
  }

  return <Value>(value: Value): Value => handleCopy(value, createCache());
}

/**
 * Copy an value deeply as much as possible.
 */
export const copy = createCopier(copyArrayLoose, copyObjectLoose);

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export const copyStrict = createCopier(copyObjectStrict, copyObjectStrict);
