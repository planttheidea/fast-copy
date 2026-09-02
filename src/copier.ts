import { getCleanClone } from './utils.js';
import type { Cache } from './utils.ts';

export type InternalCopier<Value> = (value: Value, state: State) => Value;

export interface State {
  /**
   * The constructor of the value currently being copied, derived from its `prototype`.
   * Used to construct the clone for values that are not plain objects, such as subclasses
   * of `Array` or custom classes.
   *
   * @note
   * This is `undefined` for primitives and for values already present in the `cache`. It is
   * also reassigned for every value copied, so it must be read before any recursive
   * `copier` call is made, not after.
   */
  Constructor: any;
  /**
   * The cache of values already copied, mapping each original to its clone. Copiers should
   * populate it with the clone _before_ copying that value's contents, so that circular
   * references resolve to the clone rather than recursing infinitely.
   */
  cache: Cache;
  /**
   * The copier used for nested values. Call it as `state.copier(value, state)` to deeply
   * copy the contents of the value being copied.
   */
  copier: InternalCopier<any>;
  /**
   * The number of nested objects currently being copied, used to bound traversal of
   * deeply-nested values before the call stack is exhausted.
   *
   * @note
   * This is maintained by the copier itself; custom methods should not modify it.
   */
  depth: number;
  /**
   * The prototype of the value currently being copied, used to create a clone that
   * maintains the original's prototype chain.
   *
   * @note
   * This is `undefined` for primitives and for values already present in the `cache`. It is
   * also reassigned for every value copied, so it must be read before any recursive
   * `copier` call is made, not after.
   */
  prototype: any;
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const { propertyIsEnumerable } = Object.prototype;

/**
 * The shared `%TypedArray%.prototype.slice`, which every typed array inherits.
 *
 * @note
 * This is used instead of the `slice` found on the value itself because subclasses can
 * override it with one that does not copy. `Buffer` is the notable case: its `slice`
 * returns a view over the same memory, so copying through it would alias the original.
 */
const sliceTypedArray = Object.getPrototypeOf(Int8Array.prototype).slice as (
  this: ArrayBufferView,
  start: number,
) => ArrayBufferView;

function copyOwnDescriptor<Value extends object>(
  original: Value,
  clone: Value,
  property: string | symbol,
  state: State,
): void {
  const ownDescriptor = Object.getOwnPropertyDescriptor(original, property) || {
    configurable: true,
    enumerable: true,
    value: original[property as keyof Value],
    writable: true,
  };
  const descriptor =
    ownDescriptor.get || ownDescriptor.set
      ? ownDescriptor
      : {
          configurable: ownDescriptor.configurable,
          enumerable: ownDescriptor.enumerable,
          value: state.copier(ownDescriptor.value, state),
          writable: ownDescriptor.writable,
        };

  try {
    Object.defineProperty(clone, property, descriptor);
  } catch {
    // The above can fail on node in extreme edge cases, so fall back to the loose assignment.
    clone[property as keyof Value] = descriptor.get ? descriptor.get() : descriptor.value;
  }
}

/**
 * Strictly copy all properties contained on the object.
 */
function copyOwnPropertiesStrict<Value extends object>(value: Value, clone: Value, state: State): Value {
  for (const name of Object.getOwnPropertyNames(value)) {
    copyOwnDescriptor(value, clone, name, state);
  }

  for (const symbol of Object.getOwnPropertySymbols(value)) {
    copyOwnDescriptor(value, clone, symbol, state);
  }

  return clone;
}

/**
 * Deeply copy the indexed values in the array.
 */
export function copyArrayLoose(array: any[], state: State) {
  const clone = new state.Constructor();

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(array, clone);

  for (let index = 0; index < array.length; ++index) {
    clone[index] = state.copier(array[index], state);
  }

  return clone;
}

/**
 * Deeply copy the indexed values in the array, as well as any custom properties.
 */
export function copyArrayStrict<Value extends any[]>(array: Value, state: State) {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(array, clone);

  return copyOwnPropertiesStrict(array, clone, state);
}

/**
 * Copy the contents of the ArrayBuffer, or of the typed array viewing one.
 */
export function copyArrayBuffer<Value extends ArrayBufferLike | ArrayBufferView>(
  arrayBuffer: Value,
  _state: State,
): Value {
  if (ArrayBuffer.isView(arrayBuffer)) {
    return sliceTypedArray.call(arrayBuffer, 0) as Value;
  }

  return arrayBuffer.slice(0) as Value;
}

/**
 * Create a new Blob with the contents of the original.
 */
export function copyBlob<Value extends Blob>(blob: Value, _state: State): Value {
  return blob.slice(0, blob.size, blob.type) as Value;
}

/**
 * Create a new DataView with the contents of the original.
 */
export function copyDataView<Value extends DataView>(dataView: Value, state: State): Value {
  return new state.Constructor(copyArrayBuffer(dataView.buffer, state));
}

/**
 * Create a new Date based on the time of the original.
 */
export function copyDate<Value extends Date>(date: Value, state: State): Value {
  return new state.Constructor(date.getTime());
}

/**
 * Deeply copy the keys and values of the original.
 */
export function copyMapLoose<Value extends Map<any, any>>(map: Value, state: State): Value {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(map, clone);

  for (const [key, value] of map) {
    clone.set(key, state.copier(value, state));
  }

  return clone;
}

/**
 * Deeply copy the keys and values of the original, as well as any custom properties.
 */
export function copyMapStrict<Value extends Map<any, any>>(map: Value, state: State) {
  return copyOwnPropertiesStrict(map, copyMapLoose(map, state), state);
}

/**
 * Deeply copy the properties (keys and symbols) and values of the original.
 */
export function copyObjectLoose<Value extends Record<string, any>>(object: Value, state: State): Value {
  const clone = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  for (const key of Object.keys(object)) {
    clone[key] = state.copier(object[key], state);
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    if (propertyIsEnumerable.call(object, symbol)) {
      clone[symbol] = state.copier((object as any)[symbol], state);
    }
  }

  return clone;
}

/**
 * Deeply copy the properties (keys and symbols) and values of the original, as well
 * as any hidden or non-enumerable properties.
 */
export function copyObjectStrict<Value extends Record<string, any>>(object: Value, state: State): Value {
  const clone = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  return copyOwnPropertiesStrict(object, clone, state);
}

/**
 * Create a new primitive wrapper from the value of the original.
 */
export function copyPrimitiveWrapper<
  // Specifically use the object constructor types
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  Value extends Boolean | Number | String,
>(primitiveObject: Value, state: State): Value {
  return new state.Constructor(primitiveObject.valueOf());
}

/**
 * Create a new RegExp based on the value and flags of the original.
 */
export function copyRegExp<Value extends RegExp>(regExp: Value, state: State): Value {
  const clone = new state.Constructor(regExp.source, regExp.flags) as Value;

  clone.lastIndex = regExp.lastIndex;

  return clone;
}

/**
 * Return the original value (an identity function).
 *
 * @note
 * THis is used for objects that cannot be copied, such as WeakMap.
 */
export function copySelf<Value>(value: Value, _state: State): Value {
  return value;
}

/**
 * Deeply copy the values of the original.
 */
export function copySetLoose<Value extends Set<any>>(set: Value, state: State): Value {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(set, clone);

  for (const value of set) {
    clone.add(state.copier(value, state));
  }

  return clone;
}

/**
 * Deeply copy the values of the original, as well as any custom properties.
 */
export function copySetStrict<Value extends Set<any>>(set: Value, state: State): Value {
  return copyOwnPropertiesStrict(set, copySetLoose(set, state), state);
}
