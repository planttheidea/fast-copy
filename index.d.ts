export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

export interface Copy {
  <Value = any>(value: Value, options?: Options): Value;

  strict<Value = any>(value: Value, options?: Options): Value;
}

export type InternalCopier = <Value = any>(value: Value, cache: Cache) => Value;

export type ObjectCloner = <Value>(
  object: Value,
  realm: Realm,
  handleCopy: InternalCopier,
  cache: Cache
) => Value;

export interface Options {
  isStrict?: boolean;
  realm?: Realm;
}

export type Realm = Record<string, any>;

declare const copy: Copy;

export default copy;
