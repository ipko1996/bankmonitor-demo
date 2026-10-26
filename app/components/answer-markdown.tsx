'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
const CITE_HREF = '#cite-';

/** A modell [1] / [2, 3] jelöléseit markdown linkekké alakítja, hogy chipként renderelhessük őket. */
function linkCitations(text: string): string {
  return text.replace(CITATION, (_, nums: string) =>
    nums
      .split(',')
      .map((n) => `[${n.trim()}](${CITE_HREF}${n.trim()})`)
      .join(''),
  );
}

export function AnswerMarkdown({
  text,
  activeN,
  onCite,
}: {
  text: string;
  activeN?: number | null;
  onCite?: (n: number) => void;
}) {
  return (
    <div className="prose prose-sm max-w-none prose-neutral prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith(CITE_HREF)) {
              const n = Number(href.slice(CITE_HREF.length));
              return (
                <button
                  type="button"
                  onClick={() => onCite?.(n)}
                  aria-label={`${n}. forrás megnyitása`}
                  className={cn(
                    'mx-0.5 inline-flex h-4.5 min-w-4.5 -translate-y-px items-center justify-center rounded px-1 align-middle text-[0.7rem] font-semibold no-underline transition-colors',
                    activeN === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground',
                  )}
                >
                  {n}
                </button>
              );
            }
            // Külső linkeket nem renderelünk kattinthatóként (adatkiszivárgás elleni védelem).
            return <span className="underline decoration-dotted">{children}</span>;
          },
          img: () => null,
        }}
      >
        {linkCitations(text)}
      </ReactMarkdown>
    </div>
  );
}
