// utils
import {
  createCache,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from './utils';

const { isArray } = Array;

const GLOBAL_THIS = (() => {
  if (typeof self !== 'undefined') {
    return self;
  }

  if (typeof window !== 'undefined') {
    return window;
  }

  if (typeof global !== 'undefined') {
    return global;
  }

  if (console && console.error) {
    console.error('Unable to locate global object, returning "this".');
  }
})();

/**
 * @function copy
 *
 * @description
 * copy an object deeply as much as possible
 *
 * If `strict` is applied, then all properties (including non-enumerable ones)
 * are copied with their original property descriptors on both objects and arrays.
 *
 * The object is compared to the global constructors in the `realm` provided,
 * and the native constructor is always used to ensure that extensions of native
 * objects (allows in ES2015+) are maintained.
 *
 * @param object the object to copy
 * @param [options] the options for copying with
 * @param [options.isStrict] should the copy be strict
 * @param [options.realm] the realm (this) object the object is copied from
 * @returns the copied object
 */
function copy(
  object: any,
  { isStrict = false, realm = GLOBAL_THIS }: FastCopy.Options = {},
): any {
  const {
    ArrayBuffer: RealmArrayBuffer,
    Buffer: RealmBuffer,
    Map: RealmMap,
    Set: RealmSet,
    WeakMap: RealmWeakMap,
    WeakSet: RealmWeakSet,
  } = realm;

  const getObjectClone: FastCopy.ObjectCloner = isStrict
    ? getObjectCloneStrict
    : getObjectCloneLoose;

  let Constructor: FastCopy.Constructor;

  /**
   * @function handleCopy
   *
   * @description
   * copy the object recursively based on its type
   *
   * @param object the object to copy
   * @returns the copied object
   */
  const handleCopy: FastCopy.Copier = (
    object: any,
    cache: FastCopy.Cache,
  ): any => {
    if (!object || typeof object !== 'object' || cache.has(object)) {
      return object;
    }

    Constructor = object.constructor;

    // plain objects
    if (Constructor === realm.Object) {
      cache.add(object);

      return getObjectClone(object, realm, handleCopy, cache);
    }

    let clone: any;

    // arrays
    if (isArray(object)) {
      cache.add(object);

      // if strict, include non-standard properties
      if (isStrict) {
        return getObjectCloneStrict(object, realm, handleCopy, cache);
      }

      clone = new Constructor();

      for (let index: number = 0; index < object.length; index++) {
        clone[index] = handleCopy(object[index], cache);
      }

      return clone;
    }

    // dates
    if (object instanceof realm.Date) {
      return new Constructor(object.getTime());
    }

    // regexps
    if (object instanceof realm.RegExp) {
      clone = new Constructor(
        object.source,
        object.flags || getRegExpFlags(object),
      );

      clone.lastIndex = object.lastIndex;

      return clone;
    }

    // maps
    if (RealmMap && object instanceof RealmMap) {
      cache.add(object);

      clone = new Constructor();

      object.forEach((value: any, key: any) =>
        clone.set(key, handleCopy(value, cache)),
      );

      return clone;
    }

    // sets
    if (RealmSet && object instanceof RealmSet) {
      cache.add(object);

      clone = new Constructor();

      object.forEach((value: any) => clone.add(handleCopy(value, cache)));

      return clone;
    }

    // buffers (node-only)
    if (RealmBuffer && RealmBuffer.isBuffer(object)) {
      clone = RealmBuffer.allocUnsafe
        ? RealmBuffer.allocUnsafe(object.length)
        : new Constructor(object.length);

      object.copy(clone);

      return clone;
    }

    // arraybuffers / dataviews
    if (RealmArrayBuffer) {
      // dataviews
      if (RealmArrayBuffer.isView(object)) {
        return new Constructor(object.buffer.slice(0));
      }

      // arraybuffers
      if (object instanceof RealmArrayBuffer) {
        return object.slice(0);
      }
    }

    // if the object cannot / should not be cloned, don't
    if (
      // promise-like
      typeof object.then === 'function' ||
      // errors
      object instanceof Error ||
      // weakmaps
      (RealmWeakMap && object instanceof RealmWeakMap) ||
      // weaksets
      (RealmWeakSet && object instanceof RealmWeakSet)
    ) {
      return object;
    }

    cache.add(object);

    // assume anything left is a custom constructor
    return getObjectClone(object, realm, handleCopy, cache);
  };

  return handleCopy(object, createCache());
}

/**
 * @function strictCopy
 *
 * @description
 * copy the object with `strict` option pre-applied
 *
 * @param object the object to copy
 * @param [options] the options for copying with
 * @param [options.realm] the realm (this) object the object is copied from
 * @returns the copied object
 */
copy.strict = function strictCopy(object: any, options?: FastCopy.Options) {
  return copy(object, {
    isStrict: true,
    realm: options ? options.realm : void 0,
  });
};

export default copy;
