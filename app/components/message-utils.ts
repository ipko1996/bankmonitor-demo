import type { ChatUIMessage, SourceRef, Verification } from '@/lib/types';

export function getText(message: ChatUIMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

export function getSources(message: ChatUIMessage): SourceRef[] {
  for (const part of message.parts) {
    if (part.type === 'data-sources') return part.data.items;
  }
  return [];
}

export function getVerification(message: ChatUIMessage): Verification | undefined {
  for (const part of message.parts) {
    if (part.type === 'data-verification') return part.data;
  }
  return undefined;
}

/** "6.29" → "6,29", "150000" → "150 000" – a normalizált számok visszaalakítása magyar formátumra. */
export function formatNumber(normalized: string): string {
  const [int, frac] = normalized.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return frac ? `${grouped},${frac}` : grouped;
}
