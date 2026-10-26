'use client';

import { CalendarDays, FileText, UserRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { PRODUCT_LABELS, type SourceRef } from '@/lib/types';
import { cn } from '@/lib/utils';

function SourceCard({
  source,
  active,
  cited,
  onSelect,
}: {
  source: SourceRef;
  active: boolean;
  cited: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [active]);

  return (
    <article
      ref={ref}
      onClick={onSelect}
      className={cn(
        'cursor-pointer rounded-xl border bg-card p-3 text-sm transition-all',
        active ? 'border-primary ring-2 ring-primary/20' : 'hover:border-foreground/20',
        !cited && !active && 'opacity-60',
      )}
    >
      <header className="flex items-start gap-2">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded text-[0.7rem] font-semibold',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {source.n}
        </span>
        <div className="min-w-0">
          <h3 className="leading-tight font-medium">{source.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">§ {source.section}</p>
        </div>
      </header>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="secondary">{PRODUCT_LABELS[source.product]}</Badge>
        <Badge variant="outline">v{source.version}</Badge>
      </div>

      <dl className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="size-3" />
          <dt className="sr-only">Érvényes</dt>
          <dd>Érvényes: {source.validFrom}-tól</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <UserRound className="size-3" />
          <dt className="sr-only">Gazda</dt>
          <dd>{source.owner}</dd>
        </div>
      </dl>

      {active && (
        <div className="prose prose-sm prose-neutral mt-3 max-w-none rounded-lg bg-muted/60 p-2.5 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-table:my-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{source.text}</ReactMarkdown>
        </div>
      )}
    </article>
  );
}

export function SourcePanel({
  sources,
  citedNs,
  activeN,
  onSelect,
}: {
  sources: SourceRef[];
  citedNs: number[];
  activeN: number | null;
  onSelect: (n: number) => void;
}) {
  if (sources.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <FileText className="size-6" />
        <p>
          Itt jelennek meg a források, amelyek alapján az asszisztens válaszolt. Kattints egy hivatkozásra a válaszban a
          pontos szövegrész megtekintéséhez.
        </p>
      </div>
    );
  }

  const cited = sources.filter((s) => citedNs.includes(s.n));
  const other = sources.filter((s) => !citedNs.includes(s.n));

  return (
    <div className="flex flex-col gap-4 p-4">
      {cited.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Hivatkozott források</h2>
          {cited.map((s) => (
            <SourceCard key={s.id} source={s} cited active={s.n === activeN} onSelect={() => onSelect(s.n)} />
          ))}
        </section>
      )}
      {other.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Megtalált, de nem hivatkozott
          </h2>
          {other.map((s) => (
            <SourceCard key={s.id} source={s} cited={false} active={s.n === activeN} onSelect={() => onSelect(s.n)} />
          ))}
        </section>
      )}
    </div>
  );
}
