/**
 * @constant {boolean} HAS_BUFFER_SUPPORT
 */
export const HAS_BUFFER_SUPPORT = typeof Buffer === 'function';

/**
 * @constant {boolean} HAS_MAP_SUPPORT
 */
export const HAS_MAP_SUPPORT = typeof Map === 'function';

/**
 * @constant {boolean} HAS_SET_SUPPORT
 */
export const HAS_SET_SUPPORT = typeof Set === 'function';

/**
 * @constant {boolean} HAS_WEAKMAP_SUPPORT
 */
export const HAS_WEAKMAP_SUPPORT = typeof WeakMap === 'function';

/**
 * @constant {boolean} HAS_WEAKSET_SUPPORT
 */
export const HAS_WEAKSET_SUPPORT = typeof WeakSet === 'function';
