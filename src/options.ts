import type { InternalCopier } from './copier';
import {
  copyArrayBuffer,
  copyArrayLoose,
  copyArrayStrict,
  copyBlob,
  copyDataView,
  copyDate,
  copyMapLoose,
  copyMapStrict,
  copyObjectLoose,
  copyObjectStrict,
  copyPrimitiveWrapper,
  copyRegExp,
  copySelf,
  copySetLoose,
  copySetStrict,
} from './copier';
import type { Cache } from './utils';

export interface CopierMethods {
  array?: InternalCopier<any[]>;
  arrayBuffer?: InternalCopier<ArrayBuffer>;
  blob?: InternalCopier<Blob>;
  dataView?: InternalCopier<DataView>;
  date?: InternalCopier<Date>;
  error?: InternalCopier<any>;
  map?: InternalCopier<Map<any, any>>;
  object?: InternalCopier<Record<string, any>>;
  regExp?: InternalCopier<RegExp>;
  set?: InternalCopier<Set<any>>;
}

interface Copiers {
  [key: string]: InternalCopier<any> | undefined;

  Arguments: InternalCopier<Record<string, any>>;
  Array: InternalCopier<any[]>;
  ArrayBuffer: InternalCopier<ArrayBuffer>;
  Blob: InternalCopier<Blob>;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  Boolean: InternalCopier<Boolean>;
  DataView: InternalCopier<DataView>;
  Date: InternalCopier<Date>;
  Error: InternalCopier<Error>;
  Float32Array: InternalCopier<ArrayBuffer>;
  Float64Array: InternalCopier<ArrayBuffer>;
  Int8Array: InternalCopier<ArrayBuffer>;
  Int16Array: InternalCopier<ArrayBuffer>;
  Int32Array: InternalCopier<ArrayBuffer>;
  Map: InternalCopier<Map<any, any>>;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  Number: InternalCopier<Number>;
  Object: InternalCopier<Record<string, any>>;
  Promise: InternalCopier<Promise<any>>;
  RegExp: InternalCopier<RegExp>;
  Set: InternalCopier<Set<any>>;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  String: InternalCopier<String>;
  WeakMap: InternalCopier<WeakMap<any, any>>;
  WeakSet: InternalCopier<WeakSet<any>>;
  Uint8Array: InternalCopier<ArrayBuffer>;
  Uint8ClampedArray: InternalCopier<ArrayBuffer>;
  Uint16Array: InternalCopier<ArrayBuffer>;
  Uint32Array: InternalCopier<ArrayBuffer>;
  Uint64Array: InternalCopier<ArrayBuffer>;
}

export interface CreateCopierOptions {
  createCache?: () => Cache;
  methods?: CopierMethods;
  strict?: boolean;
}

export interface RequiredCreateCopierOptions
  extends Omit<Required<CreateCopierOptions>, 'methods'> {
  copiers: Copiers;
  methods: Required<CopierMethods>;
}

export function createDefaultCache(): Cache {
  return new WeakMap();
}

export function getOptions({
  createCache: createCacheOverride,
  methods: methodsOverride,
  strict,
}: CreateCopierOptions): RequiredCreateCopierOptions {
  const defaultMethods = {
    array: strict ? copyArrayStrict : copyArrayLoose,
    arrayBuffer: copyArrayBuffer,
    blob: copyBlob,
    dataView: copyDataView,
    date: copyDate,
    error: copySelf,
    map: strict ? copyMapStrict : copyMapLoose,
    object: strict ? copyObjectStrict : copyObjectLoose,
    regExp: copyRegExp,
    set: strict ? copySetStrict : copySetLoose,
  };

  const methods = methodsOverride
    ? Object.assign(defaultMethods, methodsOverride)
    : defaultMethods;
  const copiers = getTagSpecificCopiers(methods);
  const createCache = createCacheOverride ?? createDefaultCache;

  // Extra safety check to ensure that object and array copiers are always provided,
  // avoiding runtime errors.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!copiers.Object || !copiers.Array) {
    throw new Error('An object and array copier must be provided.');
  }

  return { createCache, copiers, methods, strict: Boolean(strict) };
}

/**
 * Get the copiers used for each specific object tag.
 */
export function getTagSpecificCopiers(
  methods: Required<CopierMethods>,
): Copiers {
  return {
    Arguments: methods.object,
    Array: methods.array,
    ArrayBuffer: methods.arrayBuffer,
    Blob: methods.blob,
    Boolean: copyPrimitiveWrapper,
    DataView: methods.dataView,
    Date: methods.date,
    Error: methods.error,
    Float32Array: methods.arrayBuffer,
    Float64Array: methods.arrayBuffer,
    Int8Array: methods.arrayBuffer,
    Int16Array: methods.arrayBuffer,
    Int32Array: methods.arrayBuffer,
    Map: methods.map,
    Number: copyPrimitiveWrapper,
    Object: methods.object,
    Promise: copySelf,
    RegExp: methods.regExp,
    Set: methods.set,
    String: copyPrimitiveWrapper,
    WeakMap: copySelf,
    WeakSet: copySelf,
    Uint8Array: methods.arrayBuffer,
    Uint8ClampedArray: methods.arrayBuffer,
    Uint16Array: methods.arrayBuffer,
    Uint32Array: methods.arrayBuffer,
    Uint64Array: methods.arrayBuffer,
  };
}
