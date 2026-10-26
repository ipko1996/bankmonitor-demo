import { describe, expect, it } from 'vitest';
import type { SourceRef } from '../lib/types';
import { extractCitations, extractNumbers, verifyAnswer } from '../lib/verify';

const source = (n: number, text: string): SourceRef => ({
  n,
  id: `doc#${n}`,
  docId: 'doc',
  title: 'Teszt dokumentum',
  product: 'lakashitel',
  bank: 'Kékduna Bank',
  version: '2.0',
  validFrom: '2026-10-01',
  owner: 'Teszt',
  section: 'Konstrukciók és kamatok',
  text,
});

const sources = [
  source(1, '- **10 éves kamatperiódus:** ügyleti kamat 6,29%, THM 6,51%'),
  source(2, '- Folyósítási díj: a hitelösszeg 1%-a, legfeljebb 150 000 Ft'),
];

describe('extractNumbers', () => {
  it('kezeli a magyar szám- és pénzformátumokat', () => {
    expect(extractNumbers('6,29% és 150 000 Ft, illetve 1.000.000 Ft')).toEqual(['6.29', '150000', '1000000']);
  });

  it('figyelmen kívül hagyja a hivatkozásokat és a listajelölőket', () => {
    expect(extractNumbers('1. A kamat 6,29% [1, 2]')).toEqual(['6.29']);
  });
});

describe('extractCitations', () => {
  it('felismeri az egyes és a többes hivatkozást', () => {
    expect(extractCitations('A [1] és a [2, 3] forrás')).toEqual([1, 2, 3]);
  });
});

describe('verifyAnswer', () => {
  it('rendben van, ha minden szám a hivatkozott forrásban szerepel', () => {
    const result = verifyAnswer('A 10 éves kamat 6,29%, a THM 6,51% [1]. A folyósítási díj legfeljebb 150 000 Ft [2].', sources);
    expect(result).toEqual({ status: 'verified', unverifiedNumbers: [], invalidCitations: [] });
  });

  it('jelez, ha egy szám nem szerepel a hivatkozott forrásban', () => {
    const result = verifyAnswer('A 10 éves kamat 6,89% [1].', sources);
    expect(result.status).toBe('warning');
    expect(result.unverifiedNumbers).toEqual(['6.89']);
  });

  it('jelez, ha a szám csak egy nem hivatkozott forrásban van', () => {
    const result = verifyAnswer('A folyósítási díj legfeljebb 150 000 Ft [1].', sources);
    expect(result.unverifiedNumbers).toEqual(['150000']);
  });

  it('jelez, ha nem létező forrásra hivatkozik', () => {
    const result = verifyAnswer('A kamat 6,29% [7].', sources);
    expect(result.status).toBe('warning');
    expect(result.invalidCitations).toEqual([7]);
  });

  it('jelez, ha hivatkozás nélkül állít számot', () => {
    const result = verifyAnswer('A 10 éves kamat 5,5%.', sources);
    expect(result.status).toBe('warning');
    expect(result.unverifiedNumbers).toEqual(['10', '5.5']);
  });

  it('a kérdésben szereplő számokat nem tekinti állításnak', () => {
    const result = verifyAnswer('A 10 éves kamatperiódus kamata 6,29% [1].', [source(1, 'ügyleti kamat 6,29%')], 'Mennyi a 10 éves fix kamat?');
    expect(result.status).toBe('verified');
  });

  it.each([
    'Erről nem találtam információt a tudásbázisban.',
    'Ebben nem tudok segíteni, csak a banki termékekkel kapcsolatos kérdésekre válaszolok.',
  ])('az elutasító válasznak nincs ellenőrizendő állítása: %s', (answer) => {
    expect(verifyAnswer(answer, sources).status).toBe('no-claims');
  });
});

describe('verifyAnswer – metaadatok', () => {
  it('a hivatkozott forrás verziója és érvényessége is ellenőrzött adat', () => {
    const result = verifyAnswer('A 2.0 verzió 2026. október 1-jétől érvényes [1].', sources);
    expect(result.status).toBe('verified');
  });
});

describe('extractNumbers – határesetek', () => {
  it('nem vonja össze a szóközzel elválasztott, különálló számokat', () => {
    expect(extractNumbers('0 2026 és 5 1000')).toEqual(['0', '2026', '5', '1000']);
  });
});

describe('verifyAnswer – hivatkozás nélküli válasz', () => {
  it('ha csak a kérdés számait ismétli, nincs ellenőrizendő állítás', () => {
    const result = verifyAnswer('A 10 éves lakáshitelhez kapcsold a szűrőt Automatikusra.', sources, 'Mennyi a 10 éves fix kamat?');
    expect(result.status).toBe('no-claims');
  });
});
