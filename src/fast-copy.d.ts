declare namespace FastCopy {
  // @ts-ignore
  export type Realm = Window | Global;

  export interface Cache {
    _keys?: any[];
    _values?: any[];
    has: (value: any) => boolean;
    set: (key: any, value: any) => void;
    get: (key: any) => any;
  }

  export type Copier = <Value = any>(value: Value, cache: Cache) => Value;

  export type ObjectCloner = <Obj>(
    object: Obj,
    realm: Realm,
    handleCopy: Copier,
    cache: Cache,
  ) => Obj;

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
