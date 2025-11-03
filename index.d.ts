interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

type InternalCopier<Value> = (value: Value, state: State) => Value;

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
export interface CreateCopierOptions {
  createCache?: () => Cache;
  methods?: CopierMethods;
  strict?: boolean;
}

export interface State {
  Constructor: any;
  cache: Cache;
  copier: InternalCopier<any>;
  prototype: any;
}

/**
 * Copy an value deeply as much as possible.
 */
export function copy<Value>(value: Value): Value;

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export function copyStrict<Value>(value: Value): Value;

/**
 * Create a custom copier based on custom options for any of the following:
 *   - `createCache` method to create a cache for copied objects
 *   - custom copier `methods` for specific object types
 *   - `strict` mode to copy all properties with their descriptors
 */
export function createCopier(
  options?: CreateCopierOptions,
): <Value>(value: Value) => Value;
