import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Chunk, Product } from './types';

interface Frontmatter {
  id: string;
  title: string;
  product: Product;
  bank: string;
  version: string;
  valid_from: Date | string;
  owner: string;
  status: 'active' | 'archived';
}

export interface KnowledgeBase {
  chunks: Chunk[];
  archivedDocIds: string[];
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

/** Szakaszokra bontja a dokumentumot a `##` címsorok mentén. Az első címsor előtti bevezető kimarad. */
function splitSections(content: string): { section: string; text: string }[] {
  return content
    .split(/^## /m)
    .slice(1)
    .map((block) => {
      const [heading, ...rest] = block.split('\n');
      return { section: heading.trim(), text: rest.join('\n').trim() };
    })
    .filter((s) => s.text.length > 0);
}

export function loadKnowledgeBase(): KnowledgeBase {
  const files = fs
    .readdirSync(path.join(process.cwd(), 'knowledge'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.md'))
    .sort();

  const chunks: Chunk[] = [];
  const archivedDocIds: string[] = [];

  for (const file of files) {
    const { data, content } = matter(fs.readFileSync(path.join(process.cwd(), 'knowledge', file), 'utf8'));
    const fm = data as Frontmatter;

    // Csak az érvényes verzió kerül az indexbe – az elavult anyag a hibás válaszok első számú forrása.
    if (fm.status !== 'active') {
      archivedDocIds.push(fm.id);
      continue;
    }

    splitSections(content).forEach(({ section, text }, i) => {
      chunks.push({
        id: `${fm.id}#${i}`,
        docId: fm.id,
        title: fm.title,
        product: fm.product,
        bank: fm.bank,
        version: String(fm.version),
        validFrom: toIsoDate(fm.valid_from),
        owner: fm.owner,
        section,
        text,
      });
    });
  }

  return { chunks, archivedDocIds };
}
