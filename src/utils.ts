export interface Cache {
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

const { create } = Object;
const toStringFunction = Function.prototype.toString;
const toStringObject = Object.prototype.toString;

/**
 * Get an empty version of the object with the same prototype it has.
 */
export function getCleanClone(prototype: any): any {
  if (!prototype) {
    return create(null);
  }

  const Constructor = prototype.constructor;

  if (Constructor === Object) {
    return prototype === Object.prototype
      ? {}
      : create(prototype as object | null);
  }

  if (
    // Being extremely cautious here, in case someone does something wild like
    // explicitly setting the constructor to a primitive.

    Constructor &&
    ~toStringFunction.call(Constructor).indexOf('[native code]')
  ) {
    try {
      return new Constructor();
    } catch {
      // Ignore
    }
  }

  return create(prototype as object | null);
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

/**
 * Get the tag of the value passed, so that the correct copier can be used.
 */
export function getTag(value: any): string {
  const stringTag = value[Symbol.toStringTag];

  if (stringTag) {
    return stringTag;
  }

  const type = toStringObject.call(value);

  return type.substring(8, type.length - 1);
}
