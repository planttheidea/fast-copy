// utils
import {
  copyArray,
  copyArrayBuffer,
  copyBuffer,
  copyMap,
  copyObject,
  copyRegExp,
  copySet,
  copyTypedArray,
  getNewCache,
  isObjectCopyable,
  shouldObjectBeCopied,
} from './utils';

const {isArray} = Array;

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
  const {
    ArrayBuffer: RealmArrayBuffer,
    Buffer: RealmBuffer,
    Date: RealmDate,
    Map: RealmMap,
    Object: RealmObject,
    RegExp: RealmRegExp,
    Set: RealmSet,
  } = realm;

  const cache = getNewCache();

  const handleCopy = (object) => {
    if (!isObjectCopyable(object, cache)) {
      return object;
    }

    if (isArray(object)) {
      cache.add(object);

      return copyArray(object, handleCopy, realm);
    }

    if (object.constructor === RealmObject) {
      cache.add(object);

      return copyObject(object, handleCopy, realm, true);
    }

    if (object instanceof RealmDate) {
      return new RealmDate(object.getTime());
    }

    if (object instanceof RealmRegExp) {
      return copyRegExp(object, RealmRegExp);
    }

    if (RealmMap && object instanceof RealmMap) {
      cache.add(object);

      return copyMap(object, handleCopy, realm);
    }

    if (RealmSet && object instanceof RealmSet) {
      cache.add(object);

      return copySet(object, handleCopy, realm);
    }

    if (RealmBuffer && RealmBuffer.isBuffer(object)) {
      return copyBuffer(object, realm);
    }

    if (RealmArrayBuffer) {
      if (RealmArrayBuffer.isView(object)) {
        return copyTypedArray(object);
      }

      if (object instanceof RealmArrayBuffer) {
        return copyArrayBuffer(object);
      }
    }

    if (shouldObjectBeCopied(object, realm)) {
      cache.add(object);

      return copyObject(object, handleCopy, realm);
    }

    return object;
  };

  return handleCopy(object);
}
