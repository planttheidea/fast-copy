export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

export const copy: <Value = any>(value: Value) => Value;
export const copyStrict: <Value = any>(value: Value) => Value;
