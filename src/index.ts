// utils
import { createCache, getObjectCloneLoose, getObjectCloneStrict, getRegExpFlags } from './utils';

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
function copy<T>(object: T, options?: FastCopy.Options): T {
  // manually coalesced instead of default parameters for performance
  const isStrict: boolean = !!(options && options.isStrict);
  const realm: FastCopy.Realm = (options && options.realm) || GLOBAL_THIS;

  const getObjectClone: FastCopy.ObjectCloner = isStrict
    ? getObjectCloneStrict
    : getObjectCloneLoose;

  /**
   * @function handleCopy
   *
   * @description
   * copy the object recursively based on its type
   *
   * @param object the object to copy
   * @returns the copied object
   */
  const handleCopy: FastCopy.Copier = (object: any, cache: FastCopy.Cache): any => {
    if (!object || typeof object !== 'object') {
      return object;
    } if (cache.has(object)) {
      return cache.get(object);
    }

    const { constructor: Constructor } = object;

    // plain objects
    if (Constructor === realm.Object) {
      return getObjectClone(object, realm, handleCopy, cache);
    }

    let clone: any;
    // arrays
    if (isArray(object)) {
      // if strict, include non-standard properties
      if (isStrict) {
        return getObjectCloneStrict(object, realm, handleCopy, cache);
      }

      const { length } = object;

      clone = new Constructor();
      cache.set(object, clone);

      for (let index: number = 0; index < length; index++) {
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
      clone = new Constructor(object.source, object.flags || getRegExpFlags(object));

      clone.lastIndex = object.lastIndex;

      return clone;
    }

    // maps
    if (realm.Map && object instanceof realm.Map) {
      clone = new Constructor();
      cache.set(object, clone);

      object.forEach((value: any, key: any) => {
        clone.set(key, handleCopy(value, cache));
      });

      return clone;
    }

    // sets
    if (realm.Set && object instanceof realm.Set) {
      clone = new Constructor();
      cache.set(object, clone);

      object.forEach((value: any) => {
        clone.add(handleCopy(value, cache));
      });

      return clone;
    }

    // blobs
    if (realm.Blob && object instanceof realm.Blob) {
      clone = new Blob([object], { type: object.type });
      return clone;
    }

    // buffers (node-only)
    if (realm.Buffer && realm.Buffer.isBuffer(object)) {
      clone = realm.Buffer.allocUnsafe
        ? realm.Buffer.allocUnsafe(object.length)
        : new Constructor(object.length);

      cache.set(object, clone);
      object.copy(clone);

      return clone;
    }

    // arraybuffers / dataviews
    if (realm.ArrayBuffer) {
      // dataviews
      if (realm.ArrayBuffer.isView(object)) {
        clone = new Constructor(object.buffer.slice(0));
        cache.set(object, clone);
        return clone;
      }

      // arraybuffers
      if (object instanceof realm.ArrayBuffer) {
        clone = object.slice(0);
        cache.set(object, clone);
        return clone;
      }
    }

    // if the object cannot / should not be cloned, don't
    if (
      // promise-like
      typeof object.then === 'function' ||
      // errors
      object instanceof Error ||
      // weakmaps
      (realm.WeakMap && object instanceof realm.WeakMap) ||
      // weaksets
      (realm.WeakSet && object instanceof realm.WeakSet)
    ) {
      return object;
    }

    // assume anything left is a custom constructor
    return getObjectClone(object, realm, handleCopy, cache);
  };

  return handleCopy(object, createCache());
}

// Adding reference to allow usage in CommonJS libraries compiled using TSC, which
// expects there to be a default property on the exported object. See
// [#37](https://github.com/planttheidea/fast-copy/issues/37) for details.
copy.default = copy;

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
