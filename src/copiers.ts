import { getCleanClone, getRegExpFlags } from './utils';

import type { Cache } from './utils';

type InternalCopier = <Value = any>(value: Value, cache: Cache) => Value;

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

export function copyArrayLoose(
  array: any[],
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
) {
  const clone = new prototype.constructor();

  cache.set(array, clone);

  for (let index: number = 0, length = array.length; index < length; ++index) {
    clone[index] = handleCopy(array[index], cache);
  }

  return clone;
}

function copyObjectLooseLegacy<Value extends {}>(
  object: Value,
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
): Value {
  const clone: any = getCleanClone(prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
    }
  }

  return clone;
}

function copyObjectLooseModern<Value extends {}>(
  object: Value,
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
): Value {
  const clone: any = getCleanClone(prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
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
      clone[symbol] = handleCopy((object as any)[symbol], cache);
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
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
): Value {
  const clone = getCleanClone(prototype);

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
      clone[property] = handleCopy((object as any)[property], cache);
      continue;
    }

    // Only clone the value if actually a value, not a getter / setter.
    if (!descriptor.get && !descriptor.set) {
      descriptor.value = handleCopy(descriptor.value, cache);
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

export function copyMap<Value extends Map<any, any>>(
  value: Value,
  Constructor: MapConstructor,
  handleCopy: InternalCopier,
  cache: Cache
): Value {
  const clone = new Constructor() as Value;

  cache.set(value, clone);

  value.forEach((v, k) => {
    clone.set(k, handleCopy(v, cache));
  });

  return value;
}

export function copyRegExp<Value extends RegExp>(
  value: Value,
  Constructor: RegExpConstructor
): Value {
  const clone = new Constructor(value.source, getRegExpFlags(value)) as Value;

  clone.lastIndex = value.lastIndex;

  return clone;
}

export function copySet<Value extends Set<any>>(
  value: Value,
  Constructor: SetConstructor,
  handleCopy: InternalCopier,
  cache: Cache
): Value {
  const clone = new Constructor() as Value;

  cache.set(value, clone);

  value.forEach((v) => {
    clone.add(handleCopy(v, cache));
  });

  return value;
}
