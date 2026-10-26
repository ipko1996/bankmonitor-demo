'use client';

import type { ChatUIMessage } from '@/lib/types';
import { AnswerMarkdown } from './answer-markdown';
import { getText, getVerification } from './message-utils';
import { SearchStep } from './search-step';
import { VerificationBadge } from './verification-badge';

export function ChatMessage({
  message,
  activeN,
  onCite,
}: {
  message: ChatUIMessage;
  activeN: number | null;
  onCite: (n: number) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
          {getText(message)}
        </p>
      </div>
    );
  }

  const searches = message.parts.filter((p) => p.type === 'tool-searchKnowledgeBase');
  const text = getText(message);
  const verification = getVerification(message);

  return (
    <div className="flex flex-col items-start gap-2">
      {searches.length > 0 && (
        <div className="flex flex-col gap-1 border-l-2 pl-3">
          {searches.map((part) => (
            <SearchStep key={part.toolCallId} part={part} />
          ))}
        </div>
      )}
      {text && <AnswerMarkdown text={text} activeN={activeN} onCite={onCite} />}
      {verification && <VerificationBadge verification={verification} />}
    </div>
  );
}
