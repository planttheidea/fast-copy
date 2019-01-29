declare namespace FastCopy {
  export interface Constructor extends Function {
    new (...args: any[]): any;
  }

  // @ts-ignore
  export type Realm = Window | Global;

  export interface Cache {
    _values?: any[];
    add: (value: any) => void;
    has: (value: any) => boolean;
  }

  export type Copier = (object: any, cache: Cache) => any;

  export type ObjectCloner = (
    object: any,
    realm: Realm,
    handleCopy: Copier,
    cache: Cache,
  ) => any;

  export type Options = {
    isStrict?: boolean;
    realm?: Realm;
  };
}

declare function copy<T>(object: T, options?: FastCopy.Options): T;

declare namespace copy {
  function strictCopy<T>(object: T, options?: FastCopy.Options): T;
}
