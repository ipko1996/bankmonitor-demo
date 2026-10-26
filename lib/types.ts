import type { UIMessage } from 'ai';

export const PRODUCT_LABELS = {
  all: 'Mind',
  lakashitel: 'Lakáshitel',
  szemelyi_kolcson: 'Személyi kölcsön',
  bankszamla: 'Bankszámla',
} as const;

export type ProductFilter = keyof typeof PRODUCT_LABELS;
export type Product = Exclude<ProductFilter, 'all'>;
export const PRODUCTS = ['lakashitel', 'szemelyi_kolcson', 'bankszamla'] as const satisfies readonly Product[];

/** Egy dokumentum egy `##` szakasza – ez a keresés és a hivatkozás egysége. */
export interface Chunk {
  id: string;
  docId: string;
  title: string;
  product: Product;
  bank: string;
  version: string;
  validFrom: string;
  owner: string;
  section: string;
  text: string;
}

/** A válaszhoz előkerült forrás, `n` a hivatkozás száma: [n]. */
export interface SourceRef extends Chunk {
  n: number;
}

export interface Verification {
  /** 'no-claims': a válaszban nincs se szám, se hivatkozás (pl. bemutatkozás, elutasítás). */
  status: 'verified' | 'warning' | 'no-claims';
  unverifiedNumbers: string[];
  invalidCitations: number[];
}

export interface SearchInput {
  query: string;
  product?: Product;
}

export interface SearchOutput {
  /** A keresésnél alkalmazott termékszűrő. */
  product: ProductFilter;
  results: { n: number; title: string; section: string; version: string; validFrom: string; text: string }[];
}

export type ChatUIMessage = UIMessage<
  never,
  {
    sources: { items: SourceRef[] };
    verification: Verification;
  },
  {
    searchKnowledgeBase: { input: SearchInput; output: SearchOutput };
  }
>;
