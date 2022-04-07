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
}

export default copy;
