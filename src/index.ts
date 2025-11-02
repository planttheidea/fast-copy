import { getOptions } from './options.ts';
import { getTag } from './utils.ts';

import type { State } from './copier.ts';
import type { CreateCopierOptions } from './options.ts';

export type { State } from './copier.ts';
export type { CreateCopierOptions } from './options.ts';

/**
 * Create a custom copier based on custom options for any of the following:
 *   - `createCache` method to create a cache for copied objects
 *   - custom copier `methods` for specific object types
 *   - `strict` mode to copy all properties with their descriptors
 */
export function createCopier(options: CreateCopierOptions = {}) {
  const { createCache, copiers } = getOptions(options);
  const { Array: copyArray, Object: copyObject } = copiers;

  function copier(value: any, state: State): any {
    state.prototype = state.Constructor = undefined;

    if (!value || typeof value !== 'object') {
      return value;
    }

    if (state.cache.has(value)) {
      return state.cache.get(value);
    }

    state.prototype = Object.getPrototypeOf(value);
    // Using logical AND for speed, since optional chaining transforms to
    // a local variable usage.
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    state.Constructor = state.prototype && state.prototype.constructor;

    // plain objects
    if (!state.Constructor || state.Constructor === Object) {
      return copyObject(value as Record<string, any>, state);
    }

    // arrays
    if (Array.isArray(value)) {
      return copyArray(value, state);
    }

    const tagSpecificCopier = copiers[getTag(value)];

    if (tagSpecificCopier) {
      return tagSpecificCopier(value, state);
    }

    return typeof value.then === 'function'
      ? value
      : copyObject(value as Record<string, any>, state);
  }

  return function copy<Value>(value: Value): Value {
    return copier(value, {
      Constructor: undefined,
      cache: createCache(),
      copier,
      prototype: undefined,
    });
  };
}

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export const copyStrict = createCopier({ strict: true });

/**
 * Copy an value deeply as much as possible.
 */
export const copy = createCopier();
