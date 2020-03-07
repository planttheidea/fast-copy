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

  export type Copier = (object: any, cache: Cache) => any;

  export type ObjectCloner = (object: any, realm: Realm, handleCopy: Copier, cache: Cache) => any;

  export type Options = {
    isStrict?: boolean;
    realm?: Realm;
  };
}

declare function copy<ObjectType extends any = any>(
  object: ObjectType,
  options?: FastCopy.Options,
): ObjectType;

declare namespace copy {
  function strictCopy<ObjectType extends any = any>(
    object: ObjectType,
    options?: FastCopy.Options,
  ): ObjectType;
}
