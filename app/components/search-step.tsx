import { Loader2, Search } from 'lucide-react';
import { PRODUCT_LABELS, type ChatUIMessage } from '@/lib/types';

type SearchPart = Extract<ChatUIMessage['parts'][number], { type: 'tool-searchKnowledgeBase' }>;

/** Egy keresési lépés a válaszban: mit, melyik termékkörben keresett a modell, és hány találatot kapott. */
export function SearchStep({ part }: { part: SearchPart }) {
  const done = part.state === 'output-available';
  const product = done ? part.output.product : part.input?.product;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      {done ? <Search className="size-3.5" /> : <Loader2 className="size-3.5 animate-spin" />}
      <span>
        Keresés: <span className="font-medium text-foreground">„{part.input?.query ?? '…'}”</span>
      </span>
      {product && product !== 'all' && <span>· {PRODUCT_LABELS[product]}</span>}
      {done && <span>· {part.output.results.length > 0 ? `${part.output.results.length} találat` : 'nincs találat'}</span>}
      {part.state === 'output-error' && <span className="text-destructive">· hiba</span>}
    </p>
  );
}
