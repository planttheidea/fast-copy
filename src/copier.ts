import { getCleanClone, getRegExpFlags } from './utils';

import type { Cache } from './utils';

type InternalCopier = <Value = any>(value: Value, cache: Cache) => Value;

const { isArray } = Array;
const {
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  getPrototypeOf,
} = Object;
const { hasOwnProperty, propertyIsEnumerable } = Object.prototype;

const ARRAY_BUFFER_OBJECT_CLASSES: Record<string, boolean> = {
  ['[object ArrayBuffer]']: true,
  ['[object Float32Array]']: true,
  ['[object Float64Array]']: true,
  ['[object Int8Array]']: true,
  ['[object Int16Array]']: true,
  ['[object Int32Array]']: true,
  ['[object Uint8Array]']: true,
  ['[object Uint8ClampedArray]']: true,
  ['[object Uint16Array]']: true,
  ['[object Uint32Array]']: true,
  ['[object Uint64Array]']: true,
};
const UNCOPIABLE_OBJECT_CLASSES: Record<string, boolean> = {
  ['[object Error]']: true,
  ['[object Promise]']: true,
  ['[object WeakMap]']: true,
  ['[object WeakSet]']: true,
};

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
  copier: InternalCopier,
  cache: Cache
) {
  const clone = new prototype.constructor();

  cache.set(array, clone);

  for (let index: number = 0, length = array.length; index < length; ++index) {
    clone[index] = copier(array[index], cache);
  }

  return clone;
}

function copyObjectLooseLegacy<Value extends {}>(
  object: Value,
  prototype: any,
  copier: InternalCopier,
  cache: Cache
): Value {
  const clone: any = getCleanClone(prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = copier(object[key], cache);
    }
  }

  return clone;
}

function copyObjectLooseModern<Value extends {}>(
  object: Value,
  prototype: any,
  copier: InternalCopier,
  cache: Cache
): Value {
  const clone: any = getCleanClone(prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = copier(object[key], cache);
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
      clone[symbol] = copier((object as any)[symbol], cache);
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
  copier: InternalCopier,
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
      clone[property] = copier((object as any)[property], cache);
      continue;
    }

    // Only clone the value if actually a value, not a getter / setter.
    if (!descriptor.get && !descriptor.set) {
      descriptor.value = copier(descriptor.value, cache);
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
  copier: InternalCopier,
  cache: Cache
): Value {
  const clone = new Constructor() as Value;

  cache.set(value, clone);

  value.forEach((v, k) => {
    clone.set(k, copier(v, cache));
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
  copier: InternalCopier,
  cache: Cache
): Value {
  const clone = new Constructor() as Value;

  cache.set(value, clone);

  value.forEach((v) => {
    clone.add(copier(v, cache));
  });

  return value;
}

export function createCopier(isStrict: boolean) {
  const copyArray = isStrict ? copyObjectStrict : copyArrayLoose;
  const copyObject = isStrict ? copyObjectStrict : copyObjectLoose;

  return function copier(value: any, cache: Cache): any {
    if (!value || typeof value !== 'object') {
      return value;
    }

    if (cache.has(value)) {
      return cache.get(value);
    }

    const prototype = value.__proto__ || getPrototypeOf(value);
    const Constructor = prototype && prototype.constructor;

    // plain objects
    if (!Constructor || Constructor === Object) {
      return copyObject(value, prototype, copier, cache);
    }

    // arrays
    if (isArray(value)) {
      return copyArray(value, prototype, copier, cache);
    }

    const objectClass = toString.call(value);

    // dates
    if (objectClass === '[object Date]') {
      return new Constructor(value.getTime());
    }

    // regexps
    if (objectClass === '[object RegExp]') {
      return copyRegExp(value, Constructor);
    }

    // maps
    if (objectClass === '[object Map]') {
      return copyMap(value, Constructor, copier, cache);
    }

    // sets
    if (objectClass === '[object Set]') {
      return copySet(value, Constructor, copier, cache);
    }

    // blobs
    if (objectClass === '[object Blob]') {
      return value.slice(0, value.size, value.type);
    }

    // dataviews
    if (objectClass === '[object DataView]') {
      return new Constructor(value.buffer.slice(0));
    }

    // array buffers
    if (ARRAY_BUFFER_OBJECT_CLASSES[objectClass]) {
      return value.slice(0);
    }

    // if the value cannot / should not be copied deeply, return the reference
    if (
      // promise-like
      typeof value.then === 'function' ||
      // object classes which cannot be introspected for copy
      UNCOPIABLE_OBJECT_CLASSES[objectClass]
    ) {
      return value;
    }

    // assume anything left is a custom constructor
    return copyObject(value, prototype, copier, cache);
  };
}
