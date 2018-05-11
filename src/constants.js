/**
 * @constant {boolean} HAS_ARRAYBUFFER_SUPPORT
 */
export const HAS_ARRAYBUFFER_SUPPORT = typeof ArrayBuffer === 'function';

/**
 * @constant {boolean} HAS_BUFFER_SUPPORT
 */
export const HAS_BUFFER_SUPPORT = typeof Buffer === 'function';

/**
 * @constant {boolean} HAS_MAP_SUPPORT
 */
export const HAS_MAP_SUPPORT = typeof Map === 'function';

/**
 * @constant {boolean} HAS_PROPERTY_SYMBOL_SUPPORT
 */
export const HAS_PROPERTY_SYMBOL_SUPPORT = typeof Object.getOwnPropertySymbols === 'function';

/**
 * @constant {boolean} HAS_SET_SUPPORT
 */
export const HAS_SET_SUPPORT = typeof Set === 'function';

/**
 * @constant {boolean} HAS_TYPEDARRAY_SUPPORT
 */
export const HAS_TYPEDARRAY_SUPPORT = typeof TypedArray === 'function';
/**
 * @constant {boolean} HAS_WEAKMAP_SUPPORT
 */
export const HAS_WEAKMAP_SUPPORT = typeof WeakMap === 'function';

/**
 * @constant {boolean} HAS_WEAKSET_SUPPORT
 */
export const HAS_WEAKSET_SUPPORT = typeof WeakSet === 'function';
