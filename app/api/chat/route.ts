import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
} from 'ai';
import { z } from 'zod';
import { buildInstructions } from '@/lib/prompt';
import { getCatalog, retrieve } from '@/lib/search';
import { createSourceRegistry } from '@/lib/sources';
import { type ChatUIMessage, PRODUCTS, type ProductFilter, type SearchOutput } from '@/lib/types';
import { verifyAnswer } from '@/lib/verify';

export const maxDuration = 60;

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-haiku-5.5';

function textOf(message: ChatUIMessage): string {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
}

export async function POST(req: Request) {
  const body: { messages: ChatUIMessage[] } = await req.json();
  const question = textOf(body.messages.findLast((m) => m.role === 'user') ?? body.messages[0]);

  // Az előző válaszok keresési eredményeit nem küldjük vissza a modellnek: minden kérdésnél
  // friss keresés fut, így a [n] számozás mindig az aktuális válasz forrásaira vonatkozik.
  const history = body.messages.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type === 'text') }));

  const sources = createSourceRegistry();

  const stream = createUIMessageStream<ChatUIMessage>({
    async execute({ writer }) {
      writer.write({ type: 'start' });

      const searchKnowledgeBase = tool({
        description:
          'Keresés a belső tudásbázisban (kulcsszavas keresés). Rövid, kulcsszavas lekérdezést adj meg a tudásbázis szóhasználatával, a bank nevével együtt, ha releváns. Egy kérdéshez többször is hívható.',
        inputSchema: z.object({
          query: z.string().describe('Kulcsszavas keresőkifejezés, pl. "Tölgy Bank előtörlesztési díj"'),
          product: z.enum(PRODUCTS).optional().describe('Termékkör, ha a kérdésből egyértelmű'),
        }),
        execute: async ({ query, product }): Promise<SearchOutput> => {
          const filter: ProductFilter = product ?? 'all';
          const refs = sources.add(retrieve(query, filter));
          writer.write({ type: 'data-sources', id: 'sources', data: { items: sources.all() } });
          return {
            product: filter,
            results: refs.map(({ n, title, section, version, validFrom, text }) => ({
              n,
              title,
              section,
              version,
              validFrom,
              text,
            })),
          };
        },
      });

      const result = streamText({
        model: openrouter(MODEL),
        instructions: buildInstructions(getCatalog()),
        messages: await convertToModelMessages(history),
        tools: { searchKnowledgeBase },
        stopWhen: isStepCount(6),
        temperature: 0,
      });

      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          sendStart: false,
          sendFinish: false,
          onEnd: ({ outcome }) => writer.setOutcome(outcome),
        }),
      );

      // A teljes válasz után determinisztikus ellenőrzés: minden szám a hivatkozott forrásból jön-e.
      const answer = (await result.steps).map((s) => s.text).join('\n');
      writer.write({ type: 'data-verification', data: verifyAnswer(answer, sources.all(), question) });
      writer.write({ type: 'finish' });
    },
    onError: (error) => {
      console.error(error);
      return 'Hiba történt a válasz előállítása közben. Kérlek, próbáld újra.';
    },
  });

  return createUIMessageStreamResponse({ stream });
}
