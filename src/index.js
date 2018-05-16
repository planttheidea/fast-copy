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
 * @param {any} [realm=global] the realm to check instanceof in
 * @returns {any} the copied object
 */
export default function copy(object, realm = global) {
  const cache = getNewCache();

  function handleCopy(object) {
    if (!isObjectCopyable(object, cache)) {
      return object;
    }

    if (Array.isArray(object)) {
      cache.add(object);

      return copyArray(object, handleCopy, realm);
    }

    if (object.constructor === realm.Object) {
      cache.add(object);

      return copyObject(object, handleCopy, realm, true);
    }

    if (object instanceof realm.Date) {
      return new Date(object.getTime());
    }

    if (object instanceof realm.RegExp) {
      return copyRegExp(object, realm);
    }

    if (realm.Map && object instanceof realm.Map) {
      cache.add(object);

      return copyIterable(object, handleCopy, realm, true);
    }

    if (realm.Set && object instanceof realm.Set) {
      cache.add(object);

      return copyIterable(object, handleCopy, realm, false);
    }

    if (realm.Buffer && realm.Buffer.isBuffer(object)) {
      return copyBuffer(object, realm);
    }

    if (realm.ArrayBuffer) {
      if (realm.ArrayBuffer.isView(object)) {
        return copyTypedArray(object);
      }

      if (object instanceof realm.ArrayBuffer) {
        return copyArrayBuffer(object);
      }
    }

    if (shouldObjectBeCopied(object, realm)) {
      cache.add(object);

      return copyObject(object, handleCopy, realm);
    }

    return object;
  }

  return handleCopy(object);
}
