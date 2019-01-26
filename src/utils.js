const {create, getOwnPropertySymbols: getSymbols, getPrototypeOf} = Object;
const {hasOwnProperty, propertyIsEnumerable} = Object.prototype;

/**
 * @constant {Object} SUPPORTS cache of values supported
 */
export const SUPPORTS = {
  FLAGS: typeof /foo/g.flags === 'string',
  SYMBOL_PROPERTIES: typeof global.Object.getOwnPropertySymbols === 'function',
  WEAKSET: typeof global.WeakSet === 'function',
};

/**
 * @function getNewCache
 *
 * @description
 * get a new cache object to prevent circular references
 *
 * @returns {Object|Weakset} the new cache object
 */
export const getNewCache = () =>
  SUPPORTS.WEAKSET
    ? new WeakSet()
    : create({
      _values: [],
      add(value) {
        this._values.push(value);
      },
      has(value) {
        return !!~this._values.indexOf(value);
      },
    });

/**
 * @function getObjectToCopy
 *
 * @description
 * get the object to copy, including appropriate prototype
 *
 * @param {Object} object the object to copy
 * @param {function} RealmObject the realm-specific Object constructor
 * @param {boolean} isPlainObject is the object a plain object
 * @returns {Object} an empty version of the object to copy
 */
export const getObjectToCopy = (object, RealmObject, isPlainObject) => {
  if (isPlainObject) {
    const prototype = object.__proto__ || getPrototypeOf(object);

    return prototype === RealmObject.prototype ? {} : create(prototype);
  }

  return object.constructor ? new object.constructor() : create(null);
};

/**
 * @function getRegExpFlags
 *
 * @description
 * get the flags to apply to the copied regexp
 *
 * @param {RegExp} regExp the regexp to get the flags of
 * @returns {string} the flags for the regexp
 */
export const getRegExpFlags = (regExp) => {
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

/**
 * @function isObjectCopyable
 *
 * @description
 * is the object able to be copied
 *
 * @param {any} object the object to test
 * @param {Object|Weakset} cache the cache of copied values
 * @returns {boolean} can the object be copied
 */
export const isObjectCopyable = (object, cache) => typeof object === 'object' && object !== null && !cache.has(object);

/**
 * @function shouldObjectBeCopied
 *
 * @description
 * should the object be copied
 *
 * @param {any} object the object to test
 * @param {any} realm the realm to check instanceof in
 * @returns {boolean} should the object be copied
 */
export const shouldObjectBeCopied = (object, realm) =>
  typeof object.then !== 'function'
  && !(object instanceof realm.Error)
  && !(realm.WeakMap && object instanceof realm.WeakMap)
  && !(realm.WeakSet && object instanceof realm.WeakSet);

/**
 * @function copyArray
 *
 * @description
 * copy the array, deeply copying the values
 *
 * @param {Array<any>} array the array to copy
 * @param {function} copy the function to copy values
 * @param {any} realm the realm to check instanceof in
 * @returns {Array<any>} the copied array
 */
export const copyArray = (array, copy, realm) => {
  const newArray = new array.constructor();

  for (let index = 0; index < array.length; index++) {
    newArray[index] = copy(array[index], realm);
  }

  return newArray;
};

/**
 * @function copyArrayBuffer
 *
 * @description
 * copy the arrayBuffer, deeply copying the values
 *
 * @param {ArrayBuffer} arrayBuffer the arrayBuffer to copy
 * @returns {ArrayBuffer} the copied bufarrayBufferfer
 */
export const copyArrayBuffer = (arrayBuffer) => arrayBuffer.slice(0);

/**
 * @function copyBuffer
 *
 * @description
 * copy the buffer, deeply copying the values
 *
 * @param {Buffer} buffer the buffer to copy
 * @param {any} realm the realm to check instanceof in
 * @returns {Buffer} the copied buffer
 */
export const copyBuffer = (buffer, realm) => {
  const {Buffer: RealmBuffer} = realm;
  const newBuffer = RealmBuffer.allocUnsafe ? RealmBuffer.allocUnsafe(buffer.length) : new RealmBuffer(buffer.length);

  buffer.copy(newBuffer);

  return newBuffer;
};

/**
 * @function copyMap
 *
 * @description
 * copy the map values into a new map
 *
 * @param {Map} map the map to copy
 * @param {function} copy the copy object method
 * @param {Object} realm the realm the constructor resides in
 * @returns {Map} the copied map
 */
export const copyMap = (map, copy, realm) => {
  const newMap = new map.constructor();

  map.forEach((value, key) => newMap.set(key, copy(value, realm)));

  return newMap;
};

/**
 * @function copySet
 *
 * @description
 * copy the set values into a new set
 *
 * @param {Set} set the set to copy
 * @param {function} copy the copy object method
 * @param {Object} realm the realm the constructor resides in
 * @returns {Set} the copied set
 */
export const copySet = (set, copy, realm) => {
  const newSet = new set.constructor();

  set.forEach((value) => newSet.add(copy(value, realm)));

  return newSet;
};

/**
 * @function copyObject
 *
 * @description
 * copy the object values into a new object of the same type
 *
 * @param {Object} object the object to copy
 * @param {function} copy the copy method
 * @param {any} realm the realm to check instanceof in
 * @param {boolean} isPlainObject is the object to copy a plain object
 * @returns {Object} the copied object
 */
export const copyObject = (object, copy, realm, isPlainObject) => {
  const newObject = getObjectToCopy(object, realm.Object, isPlainObject);

  for (let key in object) {
    if (hasOwnProperty.call(object, key)) {
      newObject[key] = copy(object[key], realm);
    }
  }

  if (SUPPORTS.SYMBOL_PROPERTIES) {
    const symbols = getSymbols(object);

    if (symbols.length) {
      for (let index = 0, symbol; index < symbols.length; index++) {
        symbol = symbols[index];

        if (propertyIsEnumerable.call(object, symbol)) {
          newObject[symbol] = copy(object[symbol], realm);
        }
      }
    }
  }

  return newObject;
};

/**
 * @function copyRegExp
 *
 * @description
 * copy the RegExp to a new RegExp with the same properties
 *
 * @param {RegExp} regExp the RegExp to copy
 * @param {function} RealmRegExp the realm-specific RegExp constructor
 * @returns {RegExp} the copied RegExp
 */
export const copyRegExp = (regExp, RealmRegExp) => {
  const newRegExp = new RealmRegExp(regExp.source, SUPPORTS.FLAGS ? regExp.flags : getRegExpFlags(regExp));

  newRegExp.lastIndex = regExp.lastIndex;

  return newRegExp;
};

/**
 * @function copyTypedArray
 *
 * @description
 * copy the typedArray, deeply copying the values
 *
 * @param {TypedArray} typedArray the typedArray to copy
 * @returns {TypedArray} the copied typedArray
 */
export const copyTypedArray = (typedArray) => new typedArray.constructor(copyArrayBuffer(typedArray.buffer));
