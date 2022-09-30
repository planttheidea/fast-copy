import { getCleanClone, getRegExpFlags } from './utils';

import type { Cache } from './utils';

export type InternalCopier<Value = any> = (value: Value, state: State) => Value;

export interface State {
  Constructor: any;
  cache: Cache;
  copier: InternalCopier;
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

export function copyArrayLoose(array: any[], state: State) {
  const clone = new state.Constructor();
  const { cache, copier } = state;

  cache.set(array, clone);

  for (let index: number = 0, length = array.length; index < length; ++index) {
    clone[index] = copier(array[index], state);
  }

  return clone;
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

export function copyMap<Value extends Map<any, any>>(
  map: Value,
  state: State
): Value {
  const clone = new state.Constructor() as Value;
  const { cache, copier } = state;

  cache.set(map, clone);

  map.forEach((value, key) => {
    clone.set(key, copier(value, state));
  });

  return map;
}

function copyObjectLooseLegacy<Value extends {}>(
  object: Value,
  state: State
): Value {
  const clone: any = getCleanClone(state.prototype);
  const { cache, copier } = state;

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = copier(object[key], state);
    }
  }

  return clone;
}

function copyObjectLooseModern<Value extends {}>(
  object: Value,
  state: State
): Value {
  const clone: any = getCleanClone(state.prototype);
  const { cache, copier } = state;

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = copier(object[key], state);
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
      clone[symbol] = copier((object as any)[symbol], state);
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
  const { cache, copier } = state;

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  const properties = getStrictProperties(object);

  for (
    let index = 0, length = properties.length, property, descriptor;
    index < length;
    ++index
  ) {
    property = properties[index];

    if (property === 'callee' || property === 'caller') {
      continue;
    }

    descriptor = getOwnPropertyDescriptor(object, property);

    if (!descriptor) {
      // In extra edge cases where the property descriptor cannot be retrived, fall back to
      // the loose assignment.
      clone[property] = copier((object as any)[property], state);
      continue;
    }

    // Only clone the value if actually a value, not a getter / setter.
    if (!descriptor.get && !descriptor.set) {
      descriptor.value = copier(descriptor.value, state);
    }

    try {
      defineProperty(clone, property, descriptor);
    } catch (error) {
      // Tee above can fail on node in edge cases, so fall back to the loose assignment.
      clone[property] = descriptor.value;
    }
  }

  return clone;
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

export function copySet<Value extends Set<any>>(
  set: Value,
  state: State
): Value {
  const clone = new state.Constructor() as Value;
  const { cache, copier } = state;

  cache.set(set, clone);

  set.forEach((value) => {
    clone.add(copier(value, state));
  });

  return set;
}
