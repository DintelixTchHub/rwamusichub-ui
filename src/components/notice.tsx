import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Notice({ children, kind = 'error' }: { children: ReactNode; kind?: 'error' | 'success' }) {
  const success = kind === 'success';
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div role={success ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
      <Icon className="mt-0.5 shrink-0" size={17} />
      <span>{children}</span>
    </div>
  );
}
