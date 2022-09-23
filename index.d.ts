export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
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

export interface StrictOptions extends Omit<Options, 'isStrict'> {}

export type Realm = Record<string, any>;

export const copy: <Value = any>(value: Value, options?: Options) => Value;
export const copyStrict: <Value = any>(
  value: Value,
  options?: StrictOptions
) => Value;
