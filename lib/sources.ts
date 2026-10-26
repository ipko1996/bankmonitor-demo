import type { Chunk, SourceRef } from './types';

/**
 * Egy válaszon belül több keresés is történhet. A registry minden új szakasznak
 * a következő hivatkozási számot adja, a már látott szakasz megtartja a sajátját,
 * így a [n] számozás az egész válaszban egyértelmű.
 */
export function createSourceRegistry() {
  const byId = new Map<string, SourceRef>();

  return {
    add(chunks: Chunk[]): SourceRef[] {
      return chunks.map((chunk) => {
        let ref = byId.get(chunk.id);
        if (!ref) {
          ref = { ...chunk, n: byId.size + 1 };
          byId.set(chunk.id, ref);
        }
        return ref;
      });
    },
    all(): SourceRef[] {
      return [...byId.values()];
    },
  };
}
