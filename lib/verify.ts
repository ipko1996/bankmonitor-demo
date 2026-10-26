import type { SourceRef, Verification } from './types';

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
// Számok magyar formátumban: 300 000, 1 000 000, 6,29, 0,5 (ezres tagolás szóközzel / nem törő szóközzel / ponttal)
const NUMBER = /\d{1,3}(?:[ \u00a0\u202f.]\d{3}(?!\d))+(?:,\d+)?|\d+(?:,\d+)?/g;

export function extractCitations(text: string): number[] {
  const found = new Set<number>();
  for (const match of text.matchAll(CITATION)) {
    match[1].split(',').forEach((n) => found.add(Number(n.trim())));
  }
  return [...found];
}

/** A szövegben szereplő számok normalizált alakban (ezres tagolás nélkül, tizedespont): "300 000" → "300000", "6,29" → "6.29". */
export function extractNumbers(text: string): string[] {
  const cleaned = text
    .replace(CITATION, ' ')
    .replace(/^\s*\d+\.\s/gm, ' '); // számozott lista jelölői
  const found = new Set<string>();
  for (const match of cleaned.matchAll(NUMBER)) {
    const normalized = match[0].replace(/[ \u00a0\u202f.]/g, '').replace(',', '.');
    found.add(String(Number(normalized)));
  }
  return [...found];
}

/**
 * Determinisztikus utóellenőrzés: minden szám, ami a válaszban szerepel, megtalálható-e
 * a hivatkozott forrásokban, és minden hivatkozás létező forrásra mutat-e.
 * A felhasználó kérdésében szereplő számok (pl. "10 éves") nem állítások, ezek engedélyezettek.
 */
export function verifyAnswer(answer: string, sources: SourceRef[], question = ''): Verification {
  const cited = extractCitations(answer);
  const numbers = extractNumbers(answer);

  if (cited.length === 0 && numbers.length === 0) {
    return { status: 'no-claims', unverifiedNumbers: [], invalidCitations: [] };
  }

  const byN = new Map(sources.map((s) => [s.n, s]));
  const invalidCitations = cited.filter((n) => !byN.has(n));
  const citedSources = cited.map((n) => byN.get(n)).filter((s) => s !== undefined);

  const allowed = new Set([
    ...citedSources.flatMap((s) =>
      extractNumbers([s.bank, s.section, ...s.version.split('.'), ...s.validFrom.split('-'), s.text].join(' | ')),
    ),
    ...extractNumbers(question),
  ]);
  const unverifiedNumbers = numbers.filter((n) => !allowed.has(n));

  const clean = unverifiedNumbers.length === 0 && invalidCitations.length === 0;
  return {
    // Hivatkozás nélkül csak a kérdés számait ismételte → nincs mit ellenőrizni, nem jelezzük zölddel.
    status: !clean ? 'warning' : cited.length === 0 ? 'no-claims' : 'verified',
    unverifiedNumbers,
    invalidCitations,
  };
}
