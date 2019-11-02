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
 * @property {boolean} WEAKSET is WeakSet supported
 */
export const SUPPORTS = {
  SYMBOL_PROPERTIES: typeof getOwnPropertySymbols === 'function',
  WEAKSET: typeof WeakSet === 'function',
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
  if (SUPPORTS.WEAKSET) {
    return new WeakSet();
  }

  const object = create({
    add: (value: any) => object._values.push(value),
    has: (value: any) => !!~object._values.indexOf(value),
  });

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

  const prototype = object.__proto__ || getPrototypeOf(object);

  if (object.constructor === realm.Object) {
    return prototype === realm.Object.prototype ? {} : create(prototype);
  }

  if (~toStringFunction.call(object.constructor).indexOf('[native code]')) {
    try {
      return new object.constructor();
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

  for (const key in object) {
    if (hasOwnProperty.call(object, key)) {
      clone[key] = handleCopy(object[key], cache);
    }
  }

  if (SUPPORTS.SYMBOL_PROPERTIES) {
    const symbols: symbol[] = getOwnPropertySymbols(object);
    const symbolsLength = symbols.length;
    if (symbolsLength) {
      for (let index = 0, symbol; index < symbolsLength; index++) {
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

  const properties: (string | symbol)[] = SUPPORTS.SYMBOL_PROPERTIES
    ? [].concat(getOwnPropertyNames(object), getOwnPropertySymbols(object))
    : getOwnPropertyNames(object);
  const propertiesLength = properties.length;
  if (propertiesLength) {
    for (
      let index = 0, property, descriptor;
      index < propertiesLength;
      index++
    ) {
      property = properties[index];

      if (property !== 'callee' && property !== 'caller') {
        descriptor = getOwnPropertyDescriptor(object, property);

        descriptor.value = handleCopy(object[property], cache);

        defineProperty(clone, property, descriptor);
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
