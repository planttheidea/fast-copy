type InternalCopier = <Value = any>(value: Value, cache: Cache) => Value;

export interface Cache {
  _keys?: any[];
  _values?: any[];
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

const { toString: toStringFunction } = Function.prototype;
const {
  create,
  defineProperty,
  getOwnPropertyDescriptor,
  getOwnPropertyNames,
  getOwnPropertySymbols,
  getPrototypeOf,
} = Object;
const { hasOwnProperty, propertyIsEnumerable } = Object.prototype;

const SYMBOL_PROPERTIES = typeof getOwnPropertySymbols === 'function';

class LegacyCache {
  _keys: any[] = [];
  _values: any[] = [];

  has(key: any) {
    return !!~this._keys.indexOf(key);
  }

  get(key: any) {
    return this._values[this._keys.indexOf(key)];
  }

  set(key: any, value: any) {
    this._keys.push(key);
    this._values.push(value);
  }
}

function createCacheLegacy(): Cache {
  return new LegacyCache();
}

function createCacheModern(): Cache {
  return new WeakMap();
}

/**
 * Get a new cache object to prevent circular references.
 */
export const createCache =
  typeof WeakMap !== 'undefined' ? createCacheModern : createCacheLegacy;

export function getArrayCloneLoose(
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

/**
 * Get an empty version of the object with the same prototype it has.
 */
export function getCleanClone(object: any, prototype: any): any {
  if (!prototype) {
    return create(null);
  }

  const Constructor = prototype.constructor;

  if (Constructor === Object) {
    return prototype === Object.prototype ? {} : create(prototype);
  }

  if (~toStringFunction.call(Constructor).indexOf('[native code]')) {
    try {
      return new Constructor();
    } catch {}
  }

  return create(prototype);
}

/**
 * Get a copy of the object based on loose rules, meaning all enumerable keys
 * and symbols are copied, but property descriptors are not considered.
 */
export function getObjectCloneLoose(
  object: any,
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
): any {
  const clone: any = getCleanClone(object, prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
    }
  }

  if (SYMBOL_PROPERTIES) {
    const symbols: symbol[] = getOwnPropertySymbols(object);

    for (
      let index = 0, length = symbols.length, symbol;
      index < length;
      ++index
    ) {
      symbol = symbols[index];

      if (propertyIsEnumerable.call(object, symbol)) {
        clone[symbol] = handleCopy(object[symbol], cache);
      }
    }
  }

  return clone;
}

function getStrictPropertiesModern(object: any): Array<string | symbol> {
  return (getOwnPropertyNames(object) as Array<string | symbol>).concat(
    getOwnPropertySymbols(object)
  );
}

const getStrictProperties = SYMBOL_PROPERTIES
  ? getStrictPropertiesModern
  : getOwnPropertyNames;

/**
 * Get a copy of the object based on strict rules, meaning all keys and symbols
 * are copied based on the original property descriptors.
 */
export function getObjectCloneStrict(
  object: any,
  prototype: any,
  handleCopy: InternalCopier,
  cache: Cache
): any {
  const clone: any = getCleanClone(object, prototype);

  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  const properties = getStrictProperties(object);

  for (
    let index = 0, length = properties.length, property, descriptor;
    index < length;
    ++index
  ) {
    property = properties[index];

    if (property !== 'callee' && property !== 'caller') {
      descriptor = getOwnPropertyDescriptor(object, property);

      if (descriptor) {
        // Only clone the value if actually a value, not a getter / setter.
        if (!descriptor.get && !descriptor.set) {
          descriptor.value = handleCopy(object[property], cache);
        }

        try {
          defineProperty(clone, property, descriptor);
        } catch (error) {
          // Tee above can fail on node in edge cases, so fall back to the loose assignment.
          clone[property] = descriptor.value;
        }
      } else {
        // In extra edge cases where the property descriptor cannot be retrived, fall back to
        // the loose assignment.
        clone[property] = handleCopy(object[property], cache);
      }
    }
  }

  return clone;
}

function getRegExpFlagsLegacy(regExp: RegExp): string {
  let flags = '';

  if (regExp.global) {
    flags += 'g';
  }

  if (regExp.ignoreCase) {
    flags += 'i';
  }

  if (regExp.multiline) {
    flags += 'm';
  }

  if (regExp.unicode) {
    flags += 'u';
  }

  if (regExp.sticky) {
    flags += 'y';
  }

  return flags;
}

function getRegExpFlagsModern(regExp: RegExp): string {
  return regExp.flags;
}

/**
 * Get the flags to apply to the copied regexp.
 */
export const getRegExpFlags =
  /test/g.flags === 'g' ? getRegExpFlagsModern : getRegExpFlagsLegacy;
