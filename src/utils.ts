export interface Cache {
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

const { create } = Object;
const toStringFunction = Function.prototype.toString;
const toStringObject = Object.prototype.toString;
// Captured as possibly-undefined, since legacy environments may not provide it.
const setPrototypeOf: ((target: any, prototype: any) => any) | undefined =
  Object.setPrototypeOf;

/**
 * Error thrown when the copier traverses deeper than the configured `maxDepth`.
 *
 * @note
 * Extends `RangeError` for backwards compatibility, since exceeding the maximum depth
 * previously surfaced as a native `RangeError` from stack exhaustion.
 */
export class MaxDepthExceededError extends RangeError {
  readonly maxDepth: number;

  constructor(maxDepth: number) {
    super(
      'Maximum copy depth of ' +
        String(maxDepth) +
        ' exceeded; the value copied is nested too deeply.',
    );

    // When compiled to ES5, extending a native error leaves the instance with the
    // prototype of the base error, so `instanceof` fails without restoring it. Legacy
    // environments without `setPrototypeOf` fall back to `instanceof RangeError`.
    if (setPrototypeOf) {
      setPrototypeOf(this, MaxDepthExceededError.prototype);
    }

    this.maxDepth = maxDepth;
    this.name = 'MaxDepthExceededError';
  }
}


/**
 * @classdesc Fallback cache for when WeakMap is not natively supported
 */
class LegacyCache {
  private _keys: any[] = [];
  private _values: any[] = [];

  has(key: any): boolean {
    return !!~this._keys.indexOf(key);
  }

  get(key: any): any {
    return this._values[this._keys.indexOf(key)];
  }

  set(key: any, value: any): void {
    this._keys.push(key);
    this._values.push(value);
  }
}

function createCacheLegacy(): Cache {
  return new LegacyCache();
}

function createCacheModern(): Cache {
  return new WeakMap();
}

/**
 * Get a new cache object to prevent circular references.
 */
export const createCache =
  typeof WeakMap !== 'undefined' ? createCacheModern : createCacheLegacy;

/**
 * Get an empty version of the object with the same prototype it has.
 */
export function getCleanClone(prototype: any): any {
  if (!prototype) {
    return create(null);
  }

  const Constructor = prototype.constructor;

  if (Constructor === Object) {
    return prototype === Object.prototype
      ? {}
      : create(prototype as object | null);
  }

  if (
    // Being extremely cautious here, in case someone does something wild like
    // explicitly setting the constructor to a primitive.

    Constructor &&
    ~toStringFunction.call(Constructor).indexOf('[native code]')
  ) {
    try {
      return new Constructor();
    } catch {
      // Ignore
    }
  }

  return create(prototype as object | null);
}

function getRegExpFlagsLegacy(regExp: RegExp): string {
  let flags = '';

  if (regExp.global) {
    flags += 'g';
  }

  if (regExp.ignoreCase) {
    flags += 'i';
  }

  if (regExp.multiline) {
    flags += 'm';
  }

  if (regExp.unicode) {
    flags += 'u';
  }

  if (regExp.sticky) {
    flags += 'y';
  }

  return flags;
}

function getRegExpFlagsModern(regExp: RegExp): string {
  return regExp.flags;
}

/**
 * Get the flags to apply to the copied regexp.
 */
export const getRegExpFlags =
  /test/g.flags === 'g' ? getRegExpFlagsModern : getRegExpFlagsLegacy;

function getTagLegacy(value: any): string {
  const type = toStringObject.call(value);

  return type.substring(8, type.length - 1);
}

function getTagModern(value: any): string {
  // Logical OR is used here since result of Symbol.toStringTag will be a populated string
  // if available, otherwise it will be undefined.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return value[Symbol.toStringTag] || getTagLegacy(value);
}

/**
 * Get the tag of the value passed, so that the correct copier can be used.
 */
export const getTag =
  typeof Symbol !== 'undefined' ? getTagModern : getTagLegacy;
