'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { BookOpen, Loader2, RotateCcw, Send, Square } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ChatUIMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { extractCitations } from '@/lib/verify';
import { ChatMessage } from './components/chat-message';
import { getSources, getText } from './components/message-utils';
import { SourcePanel } from './components/source-panel';

const EXAMPLES = [
  'Mit tudsz csinálni?',
  'Mennyi az előtörlesztési díj a Tölgy Banknál?',
  'Melyik bank számlája ingyenes?',
  'Hasonlítsd össze a 10 éves fix lakáshitelek THM-jét',
  'Mi az a JTM, és mennyi lehet a törlesztő?',
  'Írj egy Python hello world-öt',
];

export default function Page() {
  const [input, setInput] = useState('');
  // Melyik válasz forrásait mutatjuk, és azon belül melyik forrás van kijelölve.
  const [selection, setSelection] = useState<{ messageId: string; n: number | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status, stop } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const busy = status === 'submitted' || status === 'streaming';
  const lastMessage = messages.at(-1);
  // Amíg a válasz szövege meg nem jelenik (gondolkodás, keresések között), jelezzük, hogy dolgozik.
  const waitingForText = busy && !(lastMessage?.role === 'assistant' && getText(lastMessage));

  const panelMessage = useMemo(() => {
    if (selection) return messages.find((m) => m.id === selection.messageId);
    return messages.findLast((m) => m.role === 'assistant' && getSources(m).length > 0);
  }, [messages, selection]);

  const panelSources = panelMessage ? getSources(panelMessage) : [];
  const citedNs = panelMessage ? extractCitations(getText(panelMessage)) : [];
  const activeN = selection && selection.messageId === panelMessage?.id ? selection.n : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setSelection(null);
    setInput('');
    sendMessage({ text });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function reset() {
    stop();
    setMessages([]);
    setSelection(null);
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="size-4" />
            </div>
            <div>
              <h1 className="text-sm leading-tight font-semibold">Tudásbázis asszisztens</h1>
              <p className="text-xs text-muted-foreground">Belső eszköz pénzügyi szakértőknek</p>
            </div>
            <Badge variant="outline" className="ml-1">
              DEMÓ
            </Badge>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset} aria-label="Új beszélgetés">
              <RotateCcw />
              <span className="hidden sm:inline">Új beszélgetés</span>
            </Button>
          )}
        </div>
      </header>

      <main
        className={cn(
          'grid min-h-0 w-full flex-1 lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-1',
          panelSources.length > 0 ? 'grid-rows-[minmax(0,1fr)_minmax(0,40%)]' : 'grid-rows-1',
        )}
      >
        <section className="flex min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
              {messages.length === 0 && (
                <div className="flex flex-col gap-4 pt-8">
                  <div>
                    <h2 className="text-lg font-semibold">Kérdezz a tudásbázisból</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Kérdezz természetesen: az asszisztens maga ismeri fel a terméket és a bankot, rákeres a
                      jóváhagyott, érvényes tudásanyagokban, minden állításnál megjelöli a forrást, és ha nem talál
                      választ, megmondja.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {EXAMPLES.map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => ask(question)}
                        className="rounded-xl border p-3 text-left text-sm transition-colors hover:bg-muted"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  activeN={selection?.messageId === m.id ? selection.n : null}
                  onCite={(n) => setSelection({ messageId: m.id, n })}
                />
              ))}

              {waitingForText && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {status === 'submitted' ? 'Gondolkodom…' : 'Keresés a tudásbázisban…'}
                </p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <form onSubmit={onSubmit} className="border-t px-4 py-3">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder="Kérdezz a lakáshitelekről, személyi kölcsönökről vagy bankszámlákról…"
                rows={1}
                className="max-h-40 min-h-10 resize-none"
              />
              {busy ? (
                <Button type="button" size="icon-lg" variant="outline" onClick={stop} aria-label="Leállítás">
                  <Square />
                </Button>
              ) : (
                <Button type="submit" size="icon-lg" disabled={!input.trim()} aria-label="Küldés">
                  <Send />
                </Button>
              )}
            </div>
            <p className="mx-auto mt-2 max-w-2xl text-center text-[0.7rem] text-muted-foreground">
              DEMÓ: kitalált bankok és kondíciók. Az ügyfél tájékoztatása előtt a hivatkozott forrást ellenőrizd.
            </p>
          </form>
        </section>

        <aside
          className={cn(
            'min-h-0 overflow-y-auto border-t bg-muted/30 lg:block lg:border-t-0 lg:border-l',
            panelSources.length === 0 && 'hidden',
          )}
        >
          <SourcePanel
            sources={panelSources}
            citedNs={citedNs}
            activeN={activeN}
            onSelect={(n) => panelMessage && setSelection({ messageId: panelMessage.id, n })}
          />
        </aside>
      </main>
    </div>
  );
}
