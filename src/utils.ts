import type { CreateCopierOptions } from './index';

export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

const { toString: toStringFunction } = Function.prototype;
const { create } = Object;
const { toString: toStringObject } = Object.prototype;

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

function getTagLegacy(value: any): string {
  const type = toStringObject.call(value);

  return type.substring(8, type.length - 1);
}

function getTagModern(value: any): string {
  return value[Symbol.toStringTag] || getTagLegacy(value);
}

/**
 * Get the tag of the value passed, so that the correct copier can be used.
 */
export const getTag =
  typeof Symbol !== 'undefined' ? getTagModern : getTagLegacy;
