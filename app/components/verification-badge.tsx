import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Verification } from '@/lib/types';
import { formatNumber } from './message-utils';

export function VerificationBadge({ verification }: { verification: Verification }) {
  if (verification.status === 'no-claims') return null;

  if (verification.status === 'verified') {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <ShieldCheck className="size-3.5" />
        Minden szám és hivatkozás a forrásból ellenőrizve
      </p>
    );
  }

  const problems = [
    verification.unverifiedNumbers.length > 0 &&
      `forrásban nem található szám: ${verification.unverifiedNumbers.map(formatNumber).join(', ')}`,
    verification.invalidCitations.length > 0 &&
      `nem létező hivatkozás: ${verification.invalidCitations.map((n) => `[${n}]`).join(', ')}`,
  ].filter(Boolean);

  return (
    <p className="inline-flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
      <ShieldAlert className="mt-px size-3.5 shrink-0" />
      <span>Ellenőrizd a forrást – {problems.join('; ')}</span>
    </p>
  );
}
