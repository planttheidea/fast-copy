// constants
import {HAS_ARRAYBUFFER_SUPPORT, HAS_BUFFER_SUPPORT, HAS_MAP_SUPPORT, HAS_SET_SUPPORT} from './constants';

// utils
import {
  copyArray,
  copyArrayBuffer,
  copyBuffer,
  copyIterable,
  copyObject,
  copyRegExp,
  copyTypedArray,
  getNewCache,
  isObjectCopyable,
  shouldObjectBeCopied
} from './utils';

/**
 * @function copy
 *
 * @description
 * deeply copy the object to a new object of the same type
 *
 * @param {any} object the object to copy
 * @returns {any} the copied object
 */
export default function copy(object) {
  const cache = getNewCache();

  function handleCopy(object) {
    if (!isObjectCopyable(object, cache)) {
      return object;
    }

    if (Array.isArray(object)) {
      cache.add(object);

      return copyArray(object, handleCopy);
    }

    if (object.constructor === Object) {
      cache.add(object);

      return copyObject(object, handleCopy, true);
    }

    if (object instanceof Date) {
      return new Date(object.getTime());
    }

    if (object instanceof RegExp) {
      return copyRegExp(object);
    }

    if (HAS_MAP_SUPPORT && object instanceof Map) {
      cache.add(object);

      return copyIterable(object, handleCopy, true);
    }

    if (HAS_SET_SUPPORT && object instanceof Set) {
      cache.add(object);

      return copyIterable(object, handleCopy, false);
    }

    if (HAS_BUFFER_SUPPORT && Buffer.isBuffer(object)) {
      return copyBuffer(object);
    }

    if (HAS_ARRAYBUFFER_SUPPORT) {
      if (ArrayBuffer.isView(object)) {
        return copyTypedArray(object);
      }

      if (object instanceof ArrayBuffer) {
        return copyArrayBuffer(object);
      }
    }

    if (shouldObjectBeCopied(object)) {
      cache.add(object);

      return copyObject(object, handleCopy);
    }

    return object;
  }

  return handleCopy(object);
}
