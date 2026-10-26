import MiniSearch from 'minisearch';
import { loadKnowledgeBase } from './knowledge';
import { type Chunk, PRODUCT_LABELS, PRODUCTS, type ProductFilter } from './types';

const TOP_K = 4;
/** E pontszám alatti találatot nem tekintünk relevánsnak. */
const MIN_SCORE = 3;

const STOPWORDS = new Set(
  [
    'a', 'az', 'egy', 'es', 'is', 'de', 'hogy', 'nem', 'ki', 'be', 'le', 'fel', 'meg', 'el',
    'mi', 'mit', 'mennyi', 'mennyit', 'milyen', 'hogyan', 'hol', 'mikor', 'van', 'vannak',
    'lesz', 'kell', 'lehet', 'nal', 'nel', 'nak', 'nek', 'ban', 'ben', 'ra', 're', 'rol', 'tol',
    'csak', 'mar', 'vagy', 'ha', 'ez', 'azt', 'ezt', 'en', 'te', 'ti', 'ok',
    'kerlek', 'szia', 'jelenleg', 'most', 'aktualis',
  ],
);

/**
 * Egyszerű magyar normalizálás: kisbetű, ékezet nélkül, 6 karakterre csonkolva.
 * A csonkolás egy nagyon durva „stemmer”: az előtörlesztési / előtörlesztés / előtörlesztést mind `elotor` lesz.
 * Élesben ezt egy embedding alapú szemantikus keresés + reranker váltaná ki (hibrid keresés).
 */
export function normalizeTerm(term: string): string | null {
  const t = term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (t.length < 2 || STOPWORDS.has(t)) return null;
  return t.slice(0, 6);
}

function buildIndex(chunks: Chunk[]) {
  const index = new MiniSearch<Chunk>({
    fields: ['title', 'bank', 'section', 'text'],
    storeFields: ['id'],
    processTerm: (term) => normalizeTerm(term),
    searchOptions: {
      boost: { bank: 2, section: 2, title: 1.5 },
      prefix: true,
      fuzzy: (term) => (term.length >= 5 ? 1 : 0),
      combineWith: 'OR',
    },
  });
  index.addAll(chunks);
  return index;
}

/** A tudásbázis tartalomjegyzéke a modellnek: termékkör → dokumentum → szakaszok. Tartalmat (számot) nem tartalmaz. */
function buildCatalog(chunks: Chunk[]): string {
  const docs = new Map<string, { chunk: Chunk; sections: string[] }>();
  for (const c of chunks) {
    const doc = docs.get(c.docId) ?? { chunk: c, sections: [] };
    doc.sections.push(c.section);
    docs.set(c.docId, doc);
  }
  return PRODUCTS.map((product) => {
    const lines = [...docs.values()]
      .filter((d) => d.chunk.product === product)
      .map((d) => `- ${d.chunk.title} — szakaszok: ${d.sections.join('; ')}`);
    return `### ${PRODUCT_LABELS[product]} (product: "${product}")\n${lines.join('\n')}`;
  }).join('\n\n');
}

let cache: { index: MiniSearch<Chunk>; byId: Map<string, Chunk>; catalog: string } | null = null;

function getKnowledge() {
  if (!cache) {
    const { chunks } = loadKnowledgeBase();
    cache = {
      index: buildIndex(chunks),
      byId: new Map(chunks.map((c) => [c.id, c])),
      catalog: buildCatalog(chunks),
    };
  }
  return cache;
}

export function getCatalog(): string {
  return getKnowledge().catalog;
}

/** A kérdéshez legrelevánsabb szakaszok a kiválasztott termékkörben. */
export function retrieve(query: string, product: ProductFilter, limit = TOP_K): Chunk[] {
  const { index, byId } = getKnowledge();
  return index
    .search(query, {
      filter: (r) => product === 'all' || byId.get(r.id)?.product === product,
    })
    .filter((r) => r.score >= MIN_SCORE)
    .slice(0, limit)
    .map((r) => byId.get(r.id)!);
}
