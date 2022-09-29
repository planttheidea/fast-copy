import {
  copyArrayBuffer,
  copyArrayLoose,
  copyBlob,
  copyDataView,
  copyDate,
  copyMap,
  copyObjectLoose,
  copyObjectStrict,
  copyRegExp,
  copySet,
} from './copier';
import { createCache, identity } from './utils';

import type { InternalCopier, State } from './copier';

export type { State } from './copier';

const { isArray } = Array;
const { getPrototypeOf } = Object;

export interface CreateCopierOptions {
  array?: InternalCopier<any[]>;
  arrayBuffer?: InternalCopier<ArrayBuffer>;
  blob?: InternalCopier<Blob>;
  dataView?: InternalCopier<DataView>;
  date?: InternalCopier<Date>;
  map?: InternalCopier<Map<any, any>>;
  object?: InternalCopier<Record<string, any>>;
  regExp?: InternalCopier<RegExp>;
  set?: InternalCopier<Set<any>>;
}

/**
 * Create a custom copier based on the object-specific copy methods passed.
 */
export function createCopier(options: CreateCopierOptions) {
  const {
    array = copyArrayLoose,
    arrayBuffer = copyArrayBuffer,
    blob = copyBlob,
    dataView = copyDataView,
    date = copyDate,
    map = copyMap,
    object = copyObjectLoose,
    regExp = copyRegExp,
    set = copySet,
  } = options;

  const typeSpecificCopiers: Record<string, InternalCopier> = {
    '[object ArrayBuffer]': arrayBuffer,
    '[object Blob]': blob,
    '[object DataView]': dataView,
    '[object Date]': date,
    '[object Error]': identity,
    '[object Float32Array]': arrayBuffer,
    '[object Float64Array]': arrayBuffer,
    '[object Int8Array]': arrayBuffer,
    '[object Int16Array]': arrayBuffer,
    '[object Int32Array]': arrayBuffer,
    '[object Map]': map,
    '[object Object]': object,
    '[object Promise]': identity,
    '[object RegExp]': regExp,
    '[object Set]': set,
    '[object WeakMap]': identity,
    '[object WeakSet]': identity,
    '[object Uint8Array]': arrayBuffer,
    '[object Uint8ClampedArray]': arrayBuffer,
    '[object Uint16Array]': arrayBuffer,
    '[object Uint32Array]': arrayBuffer,
    '[object Uint64Array]': arrayBuffer,
  };

  function copier(value: any, state: State): any {
    state.prototype = state.Constructor = undefined;

    if (!value || typeof value !== 'object') {
      return value;
    }

    const cache = state.cache;

    if (cache.has(value)) {
      return cache.get(value);
    }

    const prototype = (state.prototype =
      value.__proto__ || getPrototypeOf(value));
    const Constructor = (state.Constructor =
      prototype && prototype.constructor);

    // plain objects
    if (!Constructor || Constructor === Object) {
      return object(value, state);
    }

    // arrays
    if (isArray(value)) {
      return array(value, state);
    }

    const objectType = toString.call(value);
    const typeSpecificCopier = typeSpecificCopiers[objectType];

    if (typeSpecificCopier) {
      return typeSpecificCopier(value, state);
    }

    return typeof value.then === 'function' ? value : object(value, state);
  }

  return function copy<Value>(value: Value): Value {
    return copier(value, {
      Constructor: undefined,
      cache: createCache(),
      copier,
      prototype: undefined,
    });
  };
}

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export const copyStrict = createCopier({
  array: copyObjectStrict,
  object: copyObjectStrict,
});

/**
 * Copy an value deeply as much as possible.
 */
export default createCopier({});
