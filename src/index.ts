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
import {
  ARRAY_BUFFER_OBJECT_CLASSES,
  UNCOPIABLE_OBJECT_CLASSES,
  createCache,
} from './utils';

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

    const objectClass = toString.call(value);

    // dates
    if (objectClass === '[object Date]') {
      return date(value, state);
    }

    // regexps
    if (objectClass === '[object RegExp]') {
      return regExp(value, state);
    }

    // maps
    if (objectClass === '[object Map]') {
      return map(value, state);
    }

    // sets
    if (objectClass === '[object Set]') {
      return set(value, state);
    }

    // blobs
    if (objectClass === '[object Blob]') {
      return blob(value, state);
    }

    // dataviews
    if (objectClass === '[object DataView]') {
      return dataView(value, state);
    }

    // array buffers
    if (ARRAY_BUFFER_OBJECT_CLASSES[objectClass]) {
      return arrayBuffer(value, state);
    }

    // if the value cannot / should not be copied deeply, return the reference
    if (
      // promise-like
      typeof value.then === 'function' ||
      // object classes which cannot be introspected for copy
      UNCOPIABLE_OBJECT_CLASSES[objectClass]
    ) {
      return value;
    }

    // assume anything left is a custom constructor
    return object(value, state);
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
