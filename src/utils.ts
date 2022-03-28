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

/**
 * @enum
 *
 * @const {Object} SUPPORTS
 *
 * @property {boolean} SYMBOL_PROPERTIES are symbol properties supported
 * @property {boolean} WEAKMAP is WeakMap supported
 */
export const SUPPORTS = {
  SYMBOL_PROPERTIES: typeof getOwnPropertySymbols === 'function',
  WEAKMAP: typeof WeakMap === 'function',
};

/**
 * @function createCache
 *
 * @description
 * get a new cache object to prevent circular references
 *
 * @returns the new cache object
 */
export const createCache = (): FastCopy.Cache => {
  if (SUPPORTS.WEAKMAP) {
    return new WeakMap();
  }

  // tiny implementation of WeakMap
  const object = create({
    has: (key: any) => !!~object._keys.indexOf(key),
    set: (key: any, value: any) => {
      object._keys.push(key);
      object._values.push(value);
    },
    get: (key: any) => object._values[object._keys.indexOf(key)],
  });

  object._keys = [];
  object._values = [];

  return object;
};

/**
 * @function getCleanClone
 *
 * @description
 * get an empty version of the object with the same prototype it has
 *
 * @param object the object to build a clean clone from
 * @param realm the realm the object resides in
 * @returns the empty cloned object
 */
export const getCleanClone = (object: any, realm: FastCopy.Realm): any => {
  if (!object.constructor) {
    return create(null);
  }

  const { constructor: Constructor } = object;
  const prototype = object.__proto__ || getPrototypeOf(object);

  if (Constructor === realm.Object) {
    return prototype === realm.Object.prototype ? {} : create(prototype);
  }

  if (
    typeof Constructor === 'function' &&
    ~toStringFunction.call(Constructor).indexOf('[native code]')
  ) {
    try {
      return new Constructor();
    } catch {}
  }

  return create(prototype);
};

/**
 * @function getObjectCloneLoose
 *
 * @description
 * get a copy of the object based on loose rules, meaning all enumerable keys
 * and symbols are copied, but property descriptors are not considered
 *
 * @param object the object to clone
 * @param realm the realm the object resides in
 * @param handleCopy the function that handles copying the object
 * @returns the copied object
 */
export const getObjectCloneLoose: FastCopy.ObjectCloner = (
  object: any,
  realm: FastCopy.Realm,
  handleCopy: FastCopy.Copier,
  cache: FastCopy.Cache,
): any => {
  const clone: any = getCleanClone(object, realm);
  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
    }
  }

  if (SUPPORTS.SYMBOL_PROPERTIES) {
    const symbols: symbol[] = getOwnPropertySymbols(object);

    const { length } = symbols;

    if (length) {
      for (let index = 0, symbol; index < length; index++) {
        symbol = symbols[index];

        if (propertyIsEnumerable.call(object, symbol)) {
          clone[symbol] = handleCopy(object[symbol], cache);
        }
      }
    }
  }

  return clone;
};

/**
 * @function getObjectCloneStrict
 *
 * @description
 * get a copy of the object based on strict rules, meaning all keys and symbols
 * are copied based on the original property descriptors
 *
 * @param object the object to clone
 * @param realm the realm the object resides in
 * @param handleCopy the function that handles copying the object
 * @returns the copied object
 */
export const getObjectCloneStrict: FastCopy.ObjectCloner = (
  object: any,
  realm: FastCopy.Realm,
  handleCopy: FastCopy.Copier,
  cache: FastCopy.Cache,
): any => {
  const clone: any = getCleanClone(object, realm);
  // set in the cache immediately to be able to reuse the object recursively
  cache.set(object, clone);

  const properties: (string | symbol)[] = SUPPORTS.SYMBOL_PROPERTIES
    ? getOwnPropertyNames(object).concat((getOwnPropertySymbols(object) as unknown) as string[])
    : getOwnPropertyNames(object);

  const { length } = properties;

  if (length) {
    for (let index = 0, property, descriptor; index < length; index++) {
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
  }

  return clone;
};

/**
 * @function getRegExpFlags
 *
 * @description
 * get the flags to apply to the copied regexp
 *
 * @param regExp the regexp to get the flags of
 * @returns the flags for the regexp
 */
export const getRegExpFlags = (regExp: RegExp): string => {
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
};
