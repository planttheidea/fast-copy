export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

const { toString: toStringFunction } = Function.prototype;
const { create } = Object;

export const ARRAY_BUFFER_OBJECT_CLASSES: Record<string, boolean> = {
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
export const UNCOPIABLE_OBJECT_CLASSES: Record<string, boolean> = {
  ['[object Error]']: true,
  ['[object Promise]']: true,
  ['[object WeakMap]']: true,
  ['[object WeakSet]']: true,
};

class LegacyCache {
  _keys: any[] = [];
  _values: any[] = [];

  has(key: any) {
    return !!~this._keys.indexOf(key);
  }

  get(key: any) {
    return this._values[this._keys.indexOf(key)];
  }

  set(key: any, value: any) {
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
    return prototype === Object.prototype ? {} : create(prototype);
  }

  if (~toStringFunction.call(Constructor).indexOf('[native code]')) {
    try {
      return new Constructor();
    } catch {}
  }

  return create(prototype);
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
