import { getCleanClone, getRegExpFlags } from './utils';

import type { Cache } from './utils';

export type InternalCopier<Value> = (value: Value, state: State) => Value;

export interface State {
  Constructor: any;
  cache: Cache;
  copier: InternalCopier<any>;
  prototype: any;
}

const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  getOwnPropertySymbols,
} = Object;
const { hasOwnProperty, propertyIsEnumerable } = Object.prototype;

const SUPPORTS_SYMBOL = typeof getOwnPropertySymbols === 'function';

function getStrictPropertiesModern(object: any): Array<string | symbol> {
  return (getOwnPropertyNames(object) as Array<string | symbol>).concat(
    getOwnPropertySymbols(object)
  );
}

const getStrictProperties = SUPPORTS_SYMBOL
  ? getStrictPropertiesModern
  : getOwnPropertyNames;

function copyOwnPropertiesStrict<Value extends any>(
  value: Value,
  clone: Value,
  state: State
): Value {
  const properties = getStrictProperties(value);

  for (
    let index = 0, length = properties.length, property, descriptor;
    index < length;
    ++index
  ) {
    property = properties[index];

    if (property === 'callee' || property === 'caller') {
      continue;
    }

    descriptor = getOwnPropertyDescriptor(value, property);

    if (!descriptor) {
      // In extra edge cases where the property descriptor cannot be retrived, fall back to
      // the loose assignment.
      (clone as any)[property] = state.copier((value as any)[property], state);
      continue;
    }

    // Only clone the value if actually a value, not a getter / setter.
    if (!descriptor.get && !descriptor.set) {
      descriptor.value = state.copier(descriptor.value, state);
    }

    try {
      defineProperty(clone, property, descriptor);
    } catch (error) {
      // Tee above can fail on node in edge cases, so fall back to the loose assignment.
      (clone as any)[property] = descriptor.value;
    }
  }

  return clone;
}

export function copyArrayLoose(array: any[], state: State) {
  const clone = new state.Constructor();

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(array, clone);

  for (let index: number = 0, length = array.length; index < length; ++index) {
    clone[index] = state.copier(array[index], state);
  }

  return clone;
}

export function copyArrayStrict<Value extends any[]>(
  array: Value,
  state: State
) {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(array, clone);

  return copyOwnPropertiesStrict(array, clone, state);
}

export function copyArrayBuffer<Value extends ArrayBuffer>(
  arrayBuffer: Value,
  _state: State
): Value {
  return arrayBuffer.slice(0) as Value;
}

export function copyBlob<Value extends Blob>(
  blob: Value,
  _state: State
): Value {
  return blob.slice(0, blob.size, blob.type) as Value;
}

export function copyDataView<Value extends DataView>(
  dataView: Value,
  state: State
): Value {
  return new state.Constructor(copyArrayBuffer(dataView.buffer, state));
}

export function copyDate<Value extends Date>(date: Value, state: State): Value {
  return new state.Constructor(date.getTime());
}

export function copyMapLoose<Value extends Map<any, any>>(
  map: Value,
  state: State
): Value {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(map, clone);

  map.forEach((value, key) => {
    clone.set(key, state.copier(value, state));
  });

  return clone;
}

export function copyMapStrict<Value extends Map<any, any>>(
  map: Value,
  state: State
) {
  return copyOwnPropertiesStrict(map, copyMapLoose(map, state), state);
}

function copyObjectLooseLegacy<Value extends {}>(
  object: Value,
  state: State
): Value {
  const clone: any = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = state.copier(object[key], state);
    }
  }

  return clone;
}

function copyObjectLooseModern<Value extends {}>(
  object: Value,
  state: State
): Value {
  const clone: any = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = state.copier(object[key], state);
    }
  }

  const symbols: symbol[] = getOwnPropertySymbols(object);

  for (
    let index = 0, length = symbols.length, symbol;
    index < length;
    ++index
  ) {
    symbol = symbols[index];

    if (propertyIsEnumerable.call(object, symbol)) {
      clone[symbol] = state.copier((object as any)[symbol], state);
    }
  }

  return clone;
}

/**
 * Get a copy of the object based on loose rules, meaning all enumerable keys
 * and symbols are copied, but property descriptors are not considered.
 */
export const copyObjectLoose = SUPPORTS_SYMBOL
  ? copyObjectLooseModern
  : copyObjectLooseLegacy;

/**
 * Get a copy of the object based on strict rules, meaning all keys and symbols
 * are copied based on the original property descriptors.
 */
export function copyObjectStrict<Value extends {}>(
  object: Value,
  state: State
): Value {
  const clone = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  return copyOwnPropertiesStrict(object, clone, state);
}

export function copyRegExp<Value extends RegExp>(
  regExp: Value,
  state: State
): Value {
  const clone = new state.Constructor(
    regExp.source,
    getRegExpFlags(regExp)
  ) as Value;

  clone.lastIndex = regExp.lastIndex;

  return clone;
}

export function copySelf<Value>(value: Value, _state: State): Value {
  return value;
}

export function copySetLoose<Value extends Set<any>>(
  set: Value,
  state: State
): Value {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(set, clone);

  set.forEach((value) => {
    clone.add(state.copier(value, state));
  });

  return clone;
}

export function copySetStrict<Value extends Set<any>>(
  set: Value,
  state: State
): Value {
  return copyOwnPropertiesStrict(set, copySetLoose(set, state), state);
}
