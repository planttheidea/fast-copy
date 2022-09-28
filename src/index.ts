import { createCopier } from './copier';
import { createCache } from './utils';

const copierStrict = createCopier(true);
const copierLoose = createCopier(false);

/**
 * Copy an value deeply as much as possible.
 */
export default function copy<Value>(value: Value): Value {
  return copierLoose(value, createCache());
}

/**
 * Copy an value deeply as much as possible, where strict recreation of object properties
 * are maintained. All properties (including non-enumerable ones) are copied with their
 * original property descriptors on both objects and arrays.
 */
export function copyStrict<Value>(value: Value): Value {
  return copierStrict(value, createCache());
}
