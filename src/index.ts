// utils
import {
  createCache,
  getObjectCloneLoose,
  getObjectCloneStrict,
  getRegExpFlags,
  MaxDepthExceededError,
} from './utils';

const { isArray } = Array;
const { getPrototypeOf } = Object;

/**
 * The maximum depth traversed when none is provided. This is deliberately below the depth
 * at which the native call stack is exhausted, so that deeply-nested values fail with a
 * catchable, descriptive error instead of a raw `RangeError`.
 */
const DEFAULT_MAX_DEPTH = 1000;

const GLOBAL_THIS: FastCopy.Realm = (function () {
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
    console.error('Unable to locate global object, returning "this".');
  }

  return this;
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
  const isStrict = !!(options && options.isStrict);
  const maxDepth =
    options && options.maxDepth !== undefined
      ? options.maxDepth
      : DEFAULT_MAX_DEPTH;
  const realm = (options && options.realm) || GLOBAL_THIS;
  const getObjectClone = isStrict ? getObjectCloneStrict : getObjectCloneLoose;

  let depth = 0;

  /**
   * @function handleCopy
   *
   * @description
   * copy the value recursively based on its type, bounding the traversal of nested
   * objects so that values nested more deeply than the call stack can handle fail with
   * a descriptive error instead of a raw `RangeError`
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

    if (++depth > maxDepth) {
      throw new MaxDepthExceededError(maxDepth);
    }

    // `finally` is used so that the depth is restored across every exit point below
    // without needing a wrapper function, which would consume an extra stack frame
    // per level of nesting and lower the depth reachable before the stack is exhausted.
    try {
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
          ++index
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
    } finally {
      --depth;
    }
  };

  return handleCopy(value, createCache());
}

// Adding reference to allow usage in CommonJS libraries compiled using TSC, which
// expects there to be a default property on the exported value. See
// [#37](https://github.com/planttheidea/fast-copy/issues/37) for details.
copy.default = copy;

// Attached rather than exported by name, since the bundle is built with `exports: 'default'`
// and adding a named export would change the shape of the exported module.
copy.MaxDepthExceededError = MaxDepthExceededError;

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
    maxDepth: options ? options.maxDepth : void 0,
    realm: options ? options.realm : void 0,
  });
};

export default copy;
