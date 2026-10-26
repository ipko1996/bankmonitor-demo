import { describe, expect, it } from 'vitest';
import { loadKnowledgeBase } from '../lib/knowledge';
import { createSourceRegistry } from '../lib/sources';

describe('createSourceRegistry', () => {
  const [a, b, c] = loadKnowledgeBase().chunks;

  it('több keresésen át folytonos, egyértelmű [n] számozást ad', () => {
    const registry = createSourceRegistry();
    expect(registry.add([a, b]).map((s) => s.n)).toEqual([1, 2]);
    // A már látott szakasz megtartja a számát, az új a következőt kapja.
    expect(registry.add([b, c]).map((s) => s.n)).toEqual([2, 3]);
    expect(registry.all().map((s) => s.id)).toEqual([a.id, b.id, c.id]);
  });
});
