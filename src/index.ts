// utils
import {
  createCache,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
} from './utils';

const { isArray } = Array;
const { getPrototypeOf } = Object;

const GLOBAL_THIS = (() => {
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }

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
    console.error('Unable to locate global value, returning "this".');
  }
})();

/**
 * @function copy
 *
 * @description
 * copy an value deeply as much as possible
 *
 * If `strict` is applied, then all properties (including non-enumerable ones)
 * are copied with their original property descriptors on both objects and arrays.
 *
 * The value is compared to the global constructors in the `realm` provided,
 * and the native constructor is always used to ensure that extensions of native
 * objects (allows in ES2015+) are maintained.
 *
 * @param value the value to copy
 * @param [options] the options for copying with
 * @param [options.isStrict] should the copy be strict
 * @param [options.realm] the realm (this) value the value is copied from
 * @returns the copied value
 */
function copy<Value>(value: Value, options?: FastCopy.Options): Value {
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
   * copy the value recursively based on its type
   *
   * @param value the value to copy
   * @returns the copied value
   */
  const handleCopy: FastCopy.Copier = (
    value: any,
    cache: FastCopy.Cache,
  ): any => {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (cache.has(value)) {
      return cache.get(value);
    }

    const prototype = value.__proto__ || getPrototypeOf(value);
    const Constructor = prototype && prototype.constructor;

    // plain objects
    if (!Constructor || Constructor === realm.Object) {
      return getObjectClone(value, realm, handleCopy, cache);
    }

    let clone: any;

    // arrays
    if (isArray(value)) {
      // if strict, include non-standard properties
      if (isStrict) {
        return getObjectCloneStrict(value, realm, handleCopy, cache);
      }

      clone = new Constructor();
      cache.set(value, clone);

      for (
        let index: number = 0, length = value.length;
        index < length;
        index++
      ) {
        clone[index] = handleCopy(value[index], cache);
      }

      return clone;
    }

    // dates
    if (value instanceof realm.Date) {
      return new Constructor(value.getTime());
    }

    // regexps
    if (value instanceof realm.RegExp) {
      clone = new Constructor(
        value.source,
        value.flags || getRegExpFlags(value),
      );

      clone.lastIndex = value.lastIndex;

      return clone;
    }

    // maps
    if (realm.Map && value instanceof realm.Map) {
      clone = new Constructor();
      cache.set(value, clone);

      value.forEach((value: any, key: any) => {
        clone.set(key, handleCopy(value, cache));
      });

      return clone;
    }

    // sets
    if (realm.Set && value instanceof realm.Set) {
      clone = new Constructor();
      cache.set(value, clone);

      value.forEach((value: any) => {
        clone.add(handleCopy(value, cache));
      });

      return clone;
    }

    // blobs
    if (realm.Blob && value instanceof realm.Blob) {
      return value.slice(0, value.size, value.type);
    }

    // buffers (node-only)
    if (realm.Buffer && realm.Buffer.isBuffer(value)) {
      clone = realm.Buffer.allocUnsafe
        ? realm.Buffer.allocUnsafe(value.length)
        : new Constructor(value.length);

      cache.set(value, clone);
      value.copy(clone);

      return clone;
    }

    // arraybuffers / dataviews
    if (realm.ArrayBuffer) {
      // dataviews
      if (realm.ArrayBuffer.isView(value)) {
        clone = new Constructor(value.buffer.slice(0));
        cache.set(value, clone);
        return clone;
      }

      // arraybuffers
      if (value instanceof realm.ArrayBuffer) {
        clone = value.slice(0);
        cache.set(value, clone);
        return clone;
      }
    }

    // if the value cannot / should not be cloned, don't
    if (
      // promise-like
      typeof value.then === 'function' ||
      // errors
      value instanceof Error ||
      // weakmaps
      (realm.WeakMap && value instanceof realm.WeakMap) ||
      // weaksets
      (realm.WeakSet && value instanceof realm.WeakSet)
    ) {
      return value;
    }

    // assume anything left is a custom constructor
    return getObjectClone(value, realm, handleCopy, cache);
  };

  return handleCopy(value, createCache());
}

// Adding reference to allow usage in CommonJS libraries compiled using TSC, which
// expects there to be a default property on the exported value. See
// [#37](https://github.com/planttheidea/fast-copy/issues/37) for details.
copy.default = copy;

/**
 * @function strictCopy
 *
 * @description
 * copy the value with `strict` option pre-applied
 *
 * @param value the value to copy
 * @param [options] the options for copying with
 * @param [options.realm] the realm (this) value the value is copied from
 * @returns the copied value
 */
copy.strict = function strictCopy(value: any, options?: FastCopy.Options) {
  return copy(value, {
    isStrict: true,
    realm: options ? options.realm : void 0,
  });
};

export default copy;
