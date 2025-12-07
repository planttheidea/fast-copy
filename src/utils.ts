export interface Cache {
  has: (value: any) => boolean;
  set: (key: any, value: any) => void;
  get: (key: any) => any;
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const toStringFunction = Function.prototype.toString;
// eslint-disable-next-line @typescript-eslint/unbound-method
const toStringObject = Object.prototype.toString;

/**
 * Get an empty version of the object with the same prototype it has.
 */
export function getCleanClone(prototype: any): any {
  if (!prototype) {
    return Object.create(null);
  }

  const Constructor = prototype.constructor;

  if (Constructor === Object) {
    return prototype === Object.prototype ? {} : Object.create(prototype as object | null);
  }

  if (Constructor && ~toStringFunction.call(Constructor).indexOf('[native code]')) {
    try {
      return new Constructor();
    } catch {
      // Ignore
    }
  }

  return Object.create(prototype as object | null);
}

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
