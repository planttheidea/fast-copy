import { describe, expect, it, vi } from 'vitest';
import type { State } from '../src/index.js';
import { copy, copyStrict, createCopier } from '../src/index.js';

describe.each([
  ['copy', copy],
  ['copyStrict', copyStrict],
] as const)('%s Map keys', (_name, clone) => {
  it.each(['key first', 'map first'])('shares a copied object key with the rest of the graph (%s)', (order) => {
    const key = { id: 1 };
    const map = new Map([[key, 'value']]);
    const members = new Set([key]);
    const original = order === 'key first' ? { key, map, members } : { map, key, members };
    const result = clone(original);
    const mapKey = result.map.keys().next().value!;

    expect(mapKey).not.toBe(key);
    expect(mapKey).toBe(result.key);
    expect(result.map.get(result.key)).toBe('value');
    expect([...result.members][0]).toBe(result.key);
    mapKey.id = 2;
    expect(original.key.id).toBe(1);
  });

  it('copies a Map used as its own key and value', () => {
    const original = new Map();
    original.set(original, original);
    const result = clone(original);

    expect(result).not.toBe(original);
    expect(result.has(original)).toBe(false);
    expect(result.get(result)).toBe(result);
  });

  it('reuses a key that is also a value and refers back to its Map', () => {
    const original = new Map();
    const key = { owner: original };
    original.set(key, key);
    const result = clone(original);
    const mapKey = result.keys().next().value!;

    expect(mapKey).not.toBe(key);
    expect(mapKey.owner).toBe(result);
    expect(result.get(mapKey)).toBe(mapKey);
  });

  it('shares nested collection keys across multiple Maps', () => {
    const key = new Set([{ id: 1 }]);
    const original = { first: new Map([[key, 1]]), second: new Map([[key, 2]]), key };
    const result = clone(original);

    expect(result.key).not.toBe(key);
    expect([...result.key][0]).not.toBe([...key][0]);
    expect(result.first.get(result.key)).toBe(1);
    expect(result.second.get(result.key)).toBe(2);
  });

  it('preserves primitive, symbol and function key identities', () => {
    const keys = [undefined, null, false, 0, NaN, BigInt(1), 'name', Symbol('key'), () => 'function key'];
    const original = new Map(keys.map((key, index) => [key, index] as const));
    const result = clone(original);

    expect(result).not.toBe(original);
    for (const [index, key] of keys.entries()) expect(result.get(key)).toBe(index);
  });

  it('preserves the Map subclass when copying object keys', () => {
    class CustomMap extends Map {}
    const key = { id: 1 };
    const original = new CustomMap();
    original.set(key, key);
    const result = clone(original);
    const mapKey = result.keys().next().value!;

    expect(result).toBeInstanceOf(CustomMap);
    expect(mapKey).not.toBe(key);
    expect(result.get(mapKey)).toBe(mapKey);
  });
});

it('uses the configured copier for keys and caches a shared key before values', () => {
  const object = vi.fn((value: Record<string, unknown>, state: State) => {
    const result = { ...value, copied: true };
    state.cache.set(value, result);
    return result;
  });
  const clone = createCopier({ methods: { object } });
  const key = { id: 1 };
  const result = clone(new Map([[key, key]]));
  const mapKey = result.keys().next().value!;

  expect(object).toHaveBeenCalledTimes(1);
  expect(mapKey).toEqual({ id: 1, copied: true });
  expect(result.get(mapKey)).toBe(mapKey);
});

it('shares strict custom property values with cloned keys and preserves descriptors', () => {
  const key = { id: 1 };
  const original = new Map([[key, 'value']]);
  Object.defineProperty(original, 'keyAlias', { value: key });
  const result = copyStrict(original);
  const mapKey = result.keys().next().value!;

  expect(mapKey).not.toBe(key);
  expect(Object.getOwnPropertyDescriptor(result, 'keyAlias')).toEqual({
    value: mapKey,
    configurable: false,
    enumerable: false,
    writable: false,
  });
});
