'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, BookmarkCheck, BriefcaseBusiness, CalendarDays, MapPin, Plus } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';
import { Opportunity, User } from '@/lib/types';

type ManagedOrganization = { id: string; name: string };

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [managedOrganizations, setManagedOrganizations] = useState<ManagedOrganization[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', location: '', eventDate: '', budget: '', organizationId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [opportunities, currentUser] = await Promise.all([
        api<Opportunity[]>('/opportunities'),
        api<User>('/auth/me'),
      ]);
      const [saved, managed] = await Promise.all([
        api<Array<{ opportunityId: string }>>('/users/me/saved-opportunities'),
        api<ManagedOrganization[]>('/organizations/managed'),
      ]);
      setItems(opportunities);
      setUser(currentUser);
      setSavedIds(saved.map(({ opportunityId }) => opportunityId));
      setManagedOrganizations(managed);
      setError('');
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load opportunities.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === '1') {
      setForm((current) => ({ ...current, organizationId: params.get('organizationId') ?? '' }));
      setOpen(true);
    }
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          eventDate: form.eventDate || undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          organizationId: form.organizationId || undefined,
        }),
      });
      setForm({ title: '', description: '', location: '', eventDate: '', budget: '', organizationId: '' });
      setOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not publish opportunity.');
    } finally { setBusy(false); }
  }

  async function toggleSaved(opportunityId: string) {
    const saved = savedIds.includes(opportunityId);
    setSavingId(opportunityId);
    try {
      await api(`/users/me/saved-opportunities/${opportunityId}`, { method: saved ? 'DELETE' : 'POST' });
      setSavedIds((current) => saved
        ? current.filter((id) => id !== opportunityId)
        : [...current, opportunityId]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update saved opportunities.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Work that moves you forward</p><h1 className="mt-2 text-3xl font-black tracking-tight">Opportunities</h1><p className="mt-2 text-sm text-muted">Auditions, gigs and collaborations looking for your talent.</p></div>
        <button onClick={() => setOpen((value) => !value)} className="btn-primary"><Plus size={17} /> Post an opportunity</button>
      </div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {open && <form onSubmit={create} className="card mt-6 grid gap-4 p-5 md:grid-cols-2">
        {managedOrganizations.length > 0 && <label className="text-xs font-bold md:col-span-2">Publish on behalf of
          <select required className="field mt-2" value={form.organizationId} onChange={(event) => setForm({ ...form, organizationId: event.target.value })}>
            <option value="">Choose an organization</option>
            {managedOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>}
        <label className="text-xs font-bold">Opportunity title<input required className="field mt-2" placeholder="e.g. Vocalist for live band" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="text-xs font-bold">Location<input className="field mt-2" placeholder="Kigali, Rwanda" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label className="text-xs font-bold">Date<input type="date" className="field mt-2" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} /></label>
        <label className="text-xs font-bold">Budget (RWF)<input type="number" min="0" className="field mt-2" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></label>
        <label className="text-xs font-bold md:col-span-2">Description<textarea rows={3} className="field mt-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button disabled={busy} className="btn-primary md:col-span-2">{busy ? 'Publishing…' : 'Publish opportunity'}</button>
      </form>}
      {loading && <div className="card mt-6 p-6 text-sm text-muted">Loading opportunities…</div>}
      <div className="mt-7 space-y-4">
        {items.map((item) => <article key={item.id} className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><BriefcaseBusiness /></span><div><h2 className="text-lg font-extrabold">{item.title}</h2><p className="mt-1 text-sm leading-6 text-muted">{item.description || 'An exciting opportunity for a music professional.'}</p>{item.organization && <Link href={`/app/organizations/${item.organization.id}`} className="mt-2 inline-flex text-xs font-bold text-forest hover:underline">{item.organization.name}</Link>}<div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-muted">{item.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{item.location}</span>}{item.eventDate && <span className="inline-flex items-center gap-1"><CalendarDays size={14} />{new Date(item.eventDate).toLocaleDateString()}</span>}{item.deadline && <span>Apply by {new Date(item.deadline).toLocaleDateString()}</span>}</div></div></div>
          <div className="flex items-center justify-between gap-3 md:justify-end"><span className="text-sm font-extrabold text-forest">{item.budget ? `${Number(item.budget).toLocaleString()} ${item.currency ?? 'RWF'}` : 'Open budget'}</span><button onClick={() => void toggleSaved(item.id)} disabled={savingId === item.id} aria-label={savedIds.includes(item.id) ? 'Remove saved opportunity' : 'Save opportunity'} title={savedIds.includes(item.id) ? 'Remove from saved' : 'Save opportunity'} className="rounded-lg p-2 text-forest hover:bg-canvas">{savedIds.includes(item.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button><Link href={`/app/opportunities/${item.id}`} className="btn-secondary px-3 py-2 text-xs">{item.organizerId === user?.id || managedOrganizations.some(({ id }) => id === item.organization?.id) ? 'Manage' : 'View details'} <ArrowUpRight size={14} /></Link></div>
        </article>)}
      </div>
      {!loading && items.length === 0 && !error && <div className="card mt-5 p-9 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><BriefcaseBusiness /></div><h2 className="mt-4 font-extrabold">Your next opportunity starts here</h2><p className="mt-1 text-sm text-muted">No listings yet. Check back soon or share an opportunity with the community.</p></div>}
    </section>
  );
}
