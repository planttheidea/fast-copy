interface Cache {
    has: (value: any) => boolean;
    set: (key: any, value: any) => void;
    get: (key: any) => any;
}
/**
 * Error thrown when the copier traverses deeper than the configured `maxDepth`.
 *
 * @note
 * Extends `RangeError` for backwards compatibility, since exceeding the maximum depth
 * previously surfaced as a native `RangeError` from stack exhaustion.
 */
declare class MaxDepthExceededError extends RangeError {
    readonly maxDepth: number;
    constructor(maxDepth: number);
}

type InternalCopier<Value> = (value: Value, state: State) => Value;
interface State {
    /**
     * The constructor of the value currently being copied, derived from its `prototype`.
     * Used to construct the clone for values that are not plain objects, such as subclasses
     * of `Array` or custom classes.
     *
     * @note
     * This is `undefined` for primitives and for values already present in the `cache`. It is
     * also reassigned for every value copied, so it must be read before any recursive
     * `copier` call is made, not after.
     */
    Constructor: any;
    /**
     * The cache of values already copied, mapping each original to its clone. Copiers should
     * populate it with the clone _before_ copying that value's contents, so that circular
     * references resolve to the clone rather than recursing infinitely.
     */
    cache: Cache;
    /**
     * The copier used for nested values. Call it as `state.copier(value, state)` to deeply
     * copy the contents of the value being copied.
     */
    copier: InternalCopier<any>;
    /**
     * The number of nested objects currently being copied, used to bound traversal of
     * deeply-nested values before the call stack is exhausted.
     *
     * @note
     * This is maintained by the copier itself; custom methods should not modify it.
     */
    depth: number;
    /**
     * The prototype of the value currently being copied, used to create a clone that
     * maintains the original's prototype chain.
     *
     * @note
     * This is `undefined` for primitives and for values already present in the `cache`. It is
     * also reassigned for every value copied, so it must be read before any recursive
     * `copier` call is made, not after.
     */
    prototype: any;
}

interface CopierMethods {
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
interface CreateCopierOptions {
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

/**
 * Create a custom copier based on custom options for any of the following:
 *   - `createCache` method to create a cache for copied objects
 *   - custom copier `methods` for specific object types
 *   - `strict` mode to copy all properties with their descriptors
 */
declare function createCopier(options?: CreateCopierOptions): <Value>(value: Value) => Value;
/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
declare const copyStrict: <Value>(value: Value) => Value;
/**
 * Copy an value deeply as much as possible.
 */
declare const copy: <Value>(value: Value) => Value;

export { MaxDepthExceededError, copy, copyStrict, createCopier };
export type { CreateCopierOptions, State };
