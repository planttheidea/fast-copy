declare namespace FastCopy {
  export type Realm = Record<string, any>;

  export interface Cache {
    _keys?: any[];
    _values?: any[];
    has: (value: any) => boolean;
    set: (key: any, value: any) => void;
    get: (key: any) => any;
  }

  export type Copier = <Value = any>(value: Value, cache: Cache) => Value;

  export type ObjectCloner = <Value>(
    object: Value,
    realm: Realm,
    handleCopy: Copier,
    cache: Cache,
  ) => Value;

  export type Options = {
    isStrict?: boolean;
    /**
     * The maximum number of nested objects to traverse before throwing a
     * `MaxDepthExceededError`. Pass `Infinity` to traverse without a limit.
     *
     * @default 1000
     */
    maxDepth?: number;
    realm?: Realm;
  };
}

declare function copy<Value = any>(
  value: Value,
  options?: FastCopy.Options,
): Value;

declare namespace copy {
  function strictCopy<Value = any>(
    value: Value,
    options?: FastCopy.Options,
  ): Value;

  /**
   * Error thrown when the copier traverses deeper than the `maxDepth` option allows.
   *
   * Extends `RangeError` for backwards compatibility, since exceeding the maximum depth
   * previously surfaced as a native `RangeError` from stack exhaustion.
   */
  class MaxDepthExceededError extends RangeError {
    maxDepth: number;

    constructor(maxDepth: number);
  }
}

export default copy;
