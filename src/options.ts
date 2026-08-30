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
} from './copier.js';
import type { InternalCopier } from './copier.ts';
import type { Cache } from './utils.ts';

export interface CopierMethods {
  array?: InternalCopier<any[]>;
  arrayBuffer?: InternalCopier<ArrayBuffer>;
  asyncGenerator?: InternalCopier<AsyncGenerator>;
  blob?: InternalCopier<Blob>;
  dataView?: InternalCopier<DataView>;
  date?: InternalCopier<Date>;
  error?: InternalCopier<Error>;
  generator?: InternalCopier<Generator>;
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
  AsyncGenerator: InternalCopier<AsyncGenerator>;
  BigInt64Array: InternalCopier<ArrayBuffer>;
  BigUint64Array: InternalCopier<ArrayBuffer>;
  Blob: InternalCopier<Blob>;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  Boolean: InternalCopier<Boolean>;
  DataView: InternalCopier<DataView>;
  Date: InternalCopier<Date>;
  Error: InternalCopier<Error>;
  Float32Array: InternalCopier<ArrayBuffer>;
  Float64Array: InternalCopier<ArrayBuffer>;
  Generator: InternalCopier<Generator>;
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
}

export interface CreateCopierOptions {
  /**
   * Creates the cache used to track values already copied, which is what allows circular
   * references to resolve to their clone instead of recursing infinitely. A new cache is
   * created for each top-level copy. Since it only needs to satisfy the `has` / `get` /
   * `set` contract, a bounded implementation such as an LRU cache can be used to trade
   * circular reference handling for a smaller memory footprint.
   *
   * @default () => new WeakMap()
   */
  createCache?: () => Cache;
  /**
   * The maximum number of nested objects to traverse before throwing a
   * `MaxDepthExceededError`. Pass `Infinity` to traverse without a limit.
   *
   * @default 1000
   */
  maxDepth?: number;
  /**
   * Overrides of the copiers used for specific object types, allowing custom copy
   * semantics for those types. Any type not overridden uses its default copier. Each
   * method receives the value to copy and the current `State`, and is responsible for
   * populating `state.cache` and recursing via `state.copier` if it wants circular
   * reference handling and deep copies respectively.
   */
  methods?: CopierMethods;
  /**
   * Copies all own properties with their original property descriptors, including
   * non-enumerable properties, symbols, and non-index properties on arrays.
   *
   * @note
   * This is significantly slower than the default "loose" copy, so it should only be used
   * when the exact shape of the original must be replicated.
   *
   * @default false
   */
  strict?: boolean;
}

export interface RequiredCreateCopierOptions extends Omit<Required<CreateCopierOptions>, 'methods'> {
  copiers: Copiers;
  methods: Required<CopierMethods>;
}

/**
 * The maximum depth traversed when none is provided.
 *
 * @note
 * This is deliberately below the depth at which the native call stack is exhausted
 * (~1875 for strict copies in node), so that untrusted, deeply-nested values fail with a
 * catchable, descriptive error instead of a raw `RangeError`.
 */
export const DEFAULT_MAX_DEPTH = 1000;

export function createDefaultCache(): Cache {
  return new WeakMap();
}

export function getOptions({
  createCache: createCacheOverride,
  maxDepth,
  methods: methodsOverride,
  strict,
}: CreateCopierOptions): RequiredCreateCopierOptions {
  const defaultMethods = {
    array: strict ? copyArrayStrict : copyArrayLoose,
    arrayBuffer: copyArrayBuffer,
    asyncGenerator: copySelf,
    blob: copyBlob,
    dataView: copyDataView,
    date: copyDate,
    error: copySelf,
    generator: copySelf,
    map: strict ? copyMapStrict : copyMapLoose,
    object: strict ? copyObjectStrict : copyObjectLoose,
    regExp: copyRegExp,
    set: strict ? copySetStrict : copySetLoose,
  };

  const methods = methodsOverride ? Object.assign(defaultMethods, methodsOverride) : defaultMethods;
  const copiers = getTagSpecificCopiers(methods);
  const createCache = createCacheOverride || createDefaultCache;

  // Extra safety check to ensure that object and array copiers are always provided,
  // avoiding runtime errors.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!copiers.Object || !copiers.Array) {
    throw new Error('An object and array copier must be provided.');
  }

  return {
    createCache,
    copiers,
    maxDepth: maxDepth === undefined ? DEFAULT_MAX_DEPTH : maxDepth,
    methods,
    strict: Boolean(strict),
  };
}

/**
 * Get the copiers used for each specific object tag.
 */
export function getTagSpecificCopiers(methods: Required<CopierMethods>): Copiers {
  return {
    Arguments: methods.object,
    Array: methods.array,
    ArrayBuffer: methods.arrayBuffer,
    AsyncGenerator: methods.asyncGenerator,
    BigInt64Array: methods.arrayBuffer,
    BigUint64Array: methods.arrayBuffer,
    Blob: methods.blob,
    Boolean: copyPrimitiveWrapper,
    DataView: methods.dataView,
    Date: methods.date,
    Error: methods.error,
    Float32Array: methods.arrayBuffer,
    Float64Array: methods.arrayBuffer,
    Generator: methods.generator,
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
  };
}
