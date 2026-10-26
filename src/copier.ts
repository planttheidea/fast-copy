import { getCleanClone, getTag } from './utils.js';
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

/**
 * Copy the descriptor from the original value to the clone.
 */
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
 * Strictly copy all properties contained on the object, starting with the name at the `start` index.
 *
 * @note
 * `Object.getOwnPropertyNames` lists integer keys first in ascending order, so array-like values
 * whose indices are already copied can pass their count as `start` to skip them.
 */
function copyOwnPropertiesStrict<Value extends object>(
  value: Value,
  clone: Value,
  state: State,
  names: string[],
  start: number,
): Value {
  for (let index = start; index < names.length; ++index) {
    copyOwnDescriptor(value, clone, names[index]!, state);
  }

  for (const symbol of Object.getOwnPropertySymbols(value)) {
    copyOwnDescriptor(value, clone, symbol, state);
  }

  return clone;
}

/**
 * Deeply copy the indexed values in the array.
 */
export function copyArray<Value extends any[]>(array: Value, state: State): Value {
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
export function copyArrayStrict<Value extends any[]>(array: Value, state: State): Value {
  const clone = new state.Constructor() as Value;

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(array, clone);

  // Indices are copied by descriptor rather than by assignment, unlike typed arrays and strings,
  // because array indices can be holes, accessors, or non-writable / non-enumerable values.
  return copyOwnPropertiesStrict(array, clone, state, Object.getOwnPropertyNames(array), 0);
}

/**
 * Copy the contents of the ArrayBuffer, or of the typed array viewing one.
 *
 * @note
 * `slice` always returns a fixed-length buffer, so a resizable or growable buffer that can change
 * size is instead constructed with the same `maxByteLength` and has its contents copied in.
 */
export function copyArrayBuffer<Value extends ArrayBufferLike | ArrayBufferView>(
  arrayBuffer: Value,
  state: State,
): Value {
  if (ArrayBuffer.isView(arrayBuffer)) {
    return sliceTypedArray.call(arrayBuffer, 0) as Value;
  }

  if ((arrayBuffer as ArrayBuffer).resizable || (arrayBuffer as SharedArrayBuffer).growable) {
    const maxByteLength = (arrayBuffer as ArrayBuffer).maxByteLength;
    const { Constructor } = state;
    const clone = new Constructor(arrayBuffer.byteLength, { maxByteLength });

    // The new buffer is zero-filled, and buffers can only be read or written through a view, so
    // copy the original's bytes into it through byte-level views of both. Without this, the clone
    // would have the right size but be all zeros.
    new Uint8Array(clone).set(new Uint8Array(arrayBuffer));

    return clone as Value;
  }

  // V8 throws when slicing an empty, fixed-length SharedArrayBuffer.
  if (!arrayBuffer.byteLength && getTag(arrayBuffer) === 'SharedArrayBuffer') {
    return new SharedArrayBuffer(0) as Value;
  }

  return arrayBuffer.slice(0) as Value;
}

/**
 * Copy the contents of the ArrayBuffer, or of the typed array viewing one, as well as
 * any custom properties.
 */
export function copyArrayBufferStrict<Value extends ArrayBufferLike | ArrayBufferView>(
  arrayBuffer: Value,
  state: State,
): Value {
  const clone = copyArrayBuffer(arrayBuffer, state);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(arrayBuffer, clone);

  // Typed arrays list their indices first, but unlike arrays have no own `length` to skip. The
  // fresh clone is read, since the original may have an own `length` that shadows the real one.
  const start = ArrayBuffer.isView(clone) ? (clone as unknown as ArrayLike<unknown>).length || 0 : 0;

  return copyOwnPropertiesStrict(arrayBuffer, clone, state, Object.getOwnPropertyNames(arrayBuffer), start);
}

/**
 * Create a new Blob with the contents of the original.
 */
export function copyBlob<Value extends Blob>(blob: Value, _state: State): Value {
  return blob.slice(0, blob.size, blob.type) as Value;
}

/**
 * Create a new Blob with the contents of the original, and copy any custom properties.
 */
export const copyBlobStrict = createStrictHandler(copyBlob);

/**
 * Create a new DataView with the contents of the original.
 */
export function copyDataView<Value extends DataView>(dataView: Value, state: State): Value {
  return new state.Constructor(state.copier(dataView.buffer, state), dataView.byteOffset, dataView.byteLength);
}

/**
 * Create a new DataView with the contents of the original, and copy any custom properties.
 *
 * @note
 * The buffer is shared with any other reference to it in the value being copied, and has
 * its own custom properties copied, the same as if it were reached directly.
 */
export function copyDataViewStrict<Value extends DataView>(dataView: Value, state: State): Value {
  const { buffer } = dataView;
  const { cache, Constructor } = state;
  const bufferCopied = cache.has(buffer);
  const bufferClone = bufferCopied ? cache.get(buffer) : state.copier(buffer, state);

  // The buffer's custom properties may reference this DataView, in which case copying the buffer
  // already created and cached its clone. Reuse it so that every reference resolves to one clone.
  if (!bufferCopied && cache.has(dataView)) {
    return cache.get(dataView);
  }

  const clone = new Constructor(bufferClone, dataView.byteOffset, dataView.byteLength) as Value;

  // set in the cache immediately to be able to reuse the object recursively.
  state.cache.set(dataView, clone);

  return copyOwnPropertiesStrict(dataView, clone, state, Object.getOwnPropertyNames(dataView), 0);
}

/**
 * Create a new Date based on the time of the original.
 */
export function copyDate<Value extends Date>(date: Value, state: State): Value {
  return new state.Constructor(date.getTime());
}

/**
 * Create a new Date based on the time of the original, and copy any custom properties.
 */
export const copyDateStrict = createStrictHandler(copyDate);

/**
 * Deeply copy the keys and values of the original.
 */
export function copyMap<Value extends Map<any, any>>(map: Value, state: State): Value {
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
export function copyMapStrict<Value extends Map<any, any>>(map: Value, state: State): Value {
  return copyOwnPropertiesStrict(map, copyMap(map, state), state, Object.getOwnPropertyNames(map), 0);
}

/**
 * Deeply copy the properties (keys and symbols) and values of the original.
 */
export function copyObject<Value extends Record<string, any>>(object: Value, state: State): Value {
  const clone = getCleanClone(state.prototype);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(object, clone);

  for (const key of Object.keys(object)) {
    if (key === '__proto__') {
      // Native assignment would attempt to use `Object.setPropertyOf` under the hood, when this
      // property has been explicitly set as a standard property. Using `defineProperty` ensures
      // its treatment in the clone is unchanged from the source.
      Object.defineProperty(clone, key, {
        configurable: true,
        enumerable: true,
        value: state.copier(object[key], state),
        writable: true,
      });
    } else {
      clone[key] = state.copier(object[key], state);
    }
  }

  for (const symbol of Object.getOwnPropertySymbols(object)) {
    // Only copy enumerable symbols in loose mode, to align with handling of `keys`.
    if (Object.prototype.propertyIsEnumerable.call(object, symbol)) {
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

  return copyOwnPropertiesStrict(object, clone, state, Object.getOwnPropertyNames(object), 0);
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
 * Create a new primitive wrapper from the value of the original, and copy any
 * custom properties.
 */
export const copyPrimitiveWrapperStrict = createStrictHandler(copyPrimitiveWrapper);

/**
 * Create a new RegExp based on the value and flags of the original.
 */
export function copyRegExp<Value extends RegExp>(regExp: Value, state: State): Value {
  const clone = new state.Constructor(regExp.source, regExp.flags) as Value;

  // `lastIndex` is not retained when constructing anew, so manually copy it.
  clone.lastIndex = regExp.lastIndex;

  return clone;
}

/**
 * Copy the original RegExp, as well as any custom properties.
 */
export const copyRegExpStrict = createStrictHandler(copyRegExp);

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
export function copySet<Value extends Set<any>>(set: Value, state: State): Value {
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
  return copyOwnPropertiesStrict(set, copySet(set, state), state, Object.getOwnPropertyNames(set), 0);
}

/**
 * Copy the original value based on the handler passed, and also copy custom properties.
 *
 * @note
 * The handlers used here have no nested values to copy, so they skip the cache to keep loose
 * copies fast. Custom properties can reference the value itself, so the clone is cached here
 * before they are copied.
 */
function createStrictHandler<Value extends object>(handler: (value: Value, state: State) => Value) {
  return (value: Value, state: State): Value => {
    const clone = handler(value, state);

    // set in the cache immediately to be able to reuse the object recursively
    state.cache.set(value, clone);

    return copyOwnPropertiesStrict(value, clone, state, Object.getOwnPropertyNames(value), 0);
  };
}

/**
 * Create a new String wrapper from the value of the original, and copy custom properties.
 */
// `String` primitive constructor is intentional.
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export function copyStringStrict<Value extends String>(string: Value, state: State): Value {
  const clone = copyPrimitiveWrapper(string, state);

  // set in the cache immediately to be able to reuse the object recursively
  state.cache.set(string, clone);

  const { length } = string;
  const names = Object.getOwnPropertyNames(string);
  // Custom integer keys beyond the string's length are listed before `length`, so only skip
  // `length` when it directly follows the characters.
  const start = names[length] === 'length' ? length + 1 : length;

  return copyOwnPropertiesStrict(string, clone, state, names, start);
}
