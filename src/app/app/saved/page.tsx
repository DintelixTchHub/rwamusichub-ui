'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, BriefcaseBusiness, CalendarDays, MapPin, Trash2 } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';
import { Opportunity } from '@/lib/types';

type SavedOpportunity = {
  id: string;
  createdAt: string;
  opportunity: Opportunity;
};

export default function SavedPage() {
  const [items, setItems] = useState<SavedOpportunity[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    let active = true;
    api<SavedOpportunity[]>('/users/me/saved-opportunities')
      .then((saved) => { if (active) setItems(saved); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load saved opportunities.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function remove(opportunityId: string) {
    setRemovingId(opportunityId);
    try {
      await api(`/users/me/saved-opportunities/${opportunityId}`, { method: 'DELETE' });
      setItems((current) => current.filter((entry) => entry.opportunity.id !== opportunityId));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not remove saved opportunity.');
    } finally {
      setRemovingId('');
    }
  }

  return (
    <section>
      <p className="eyebrow">Keep your next move close</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Saved opportunities</h1>
      <p className="mt-2 text-sm text-muted">The listings you bookmarked for later.</p>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-6 p-6 text-sm text-muted">Loading saved opportunities…</div>}
      {!loading && <div className="mt-6 space-y-4">
        {items.map(({ opportunity }) => <article key={opportunity.id} className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><BriefcaseBusiness /></span>
            <div>
              <h2 className="text-lg font-extrabold">{opportunity.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{opportunity.description || 'An exciting opportunity for a music professional.'}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">
                {opportunity.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{opportunity.location}</span>}
                {opportunity.eventDate && <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{new Date(opportunity.eventDate).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <span className="text-sm font-extrabold text-forest">{opportunity.budget ? `${Number(opportunity.budget).toLocaleString()} ${opportunity.currency ?? 'RWF'}` : 'Open budget'}</span>
            <button onClick={() => void remove(opportunity.id)} disabled={removingId === opportunity.id} aria-label="Remove saved opportunity" className="rounded-lg p-2 text-muted hover:bg-canvas"><Trash2 size={17} /></button>
            <Link href={`/app/opportunities/${opportunity.id}`} className="btn-secondary px-3 py-2 text-xs">View <ArrowUpRight size={14} /></Link>
          </div>
        </article>)}
      </div>}
      {!loading && items.length === 0 && !error && <div className="card mt-6 p-10 text-center"><Bookmark className="mx-auto text-muted" /><h2 className="mt-3 font-extrabold">Nothing saved yet</h2><p className="mt-1 text-sm text-muted">Bookmark an opportunity and it will be waiting here.</p><Link href="/app/opportunities" className="btn-primary mt-5">Explore opportunities</Link></div>}
    </section>
  );
}
