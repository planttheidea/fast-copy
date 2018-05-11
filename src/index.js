// constants
import {HAS_BUFFER_SUPPORT, HAS_MAP_SUPPORT, HAS_SET_SUPPORT} from './constants';

// utils
import {copyArray, copyBuffer, copyIterable, copyObject, copyRegExp, getNewCache, isObjectCopyable} from './utils';

/**
 * @function fastCopy
 *
 * @description
 * deeply copy the object to a new object of the same type
 *
 * @param {any} object the object to copy
 * @returns {any} the copied object
 */
export default function fastCopy(object) {
  const cache = getNewCache();

  function handleCopy(object) {
    if (!isObjectCopyable(object, cache)) {
      return object;
    }

    if (Array.isArray(object)) {
      cache.add(object);

      return copyArray(object, handleCopy);
    }

    if (object instanceof Date) {
      return new Date(object.getTime());
    }

    if (object instanceof RegExp) {
      return copyRegExp(object);
    }

    if (HAS_BUFFER_SUPPORT && Buffer.isBuffer(object)) {
      return copyBuffer(object);
    }

    cache.add(object);

    if (HAS_MAP_SUPPORT && object instanceof Map) {
      return copyIterable(object, handleCopy, true);
    }

    if (HAS_SET_SUPPORT && object instanceof Set) {
      return copyIterable(object, handleCopy, false);
    }

    return copyObject(object, handleCopy, object.constructor === Object);
  }

  return handleCopy(object);
}
