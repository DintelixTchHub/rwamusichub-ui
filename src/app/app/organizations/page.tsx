'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Plus, Search } from 'lucide-react';
import { Modal } from '@/components/modal';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

type Organization = {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  _count?: { opportunities: number };
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', location: '', description: '', logoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (type.trim()) params.set('type', type.trim());
      if (location.trim()) params.set('location', location.trim());
      api<Organization[]>(`/organizations${params.size ? `?${params}` : ''}`)
        .then((items) => { if (active) { setOrganizations(items); setError(''); } })
        .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load organizations.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, type, location]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const created = await api<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          type: form.type || undefined,
          location: form.location || undefined,
          description: form.description || undefined,
          logoUrl: form.logoUrl || undefined,
        }),
      });
      setOrganizations((current) => [created, ...current]);
      setForm({ name: '', type: '', location: '', description: '', logoUrl: '' });
      setFormOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create organization.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">People behind the music</p><h1 className="mt-2 text-3xl font-black tracking-tight">Organizations</h1><p className="mt-2 text-sm text-muted">Discover venues, studios, labels, festivals and music businesses.</p></div>
        <button type="button" onClick={() => setFormOpen(true)} className="btn-primary"><Plus size={16} /> Create organization</button>
      </div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <div className="card mt-6 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
        <label className="flex items-center gap-2 rounded-xl bg-canvas px-3"><Search size={16} className="text-muted" /><input aria-label="Search organizations" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search name or category" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="sr-only" htmlFor="organization-type">Organization type</label>
        <input id="organization-type" className="field" placeholder="Filter by type" value={type} onChange={(event) => setType(event.target.value)} />
        <label className="relative flex items-center"><MapPin size={15} className="absolute left-3 text-muted" /><input aria-label="Filter by location" className="field pl-9" placeholder="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
      </div>
      {loading && <div className="card mt-5 p-6 text-sm text-muted">Finding organizations…</div>}
      {!loading && organizations.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {organizations.map((organization) => <article key={organization.id} className="card overflow-hidden">
          <div className="flex min-h-28 items-center gap-4 bg-[#f3f7ed] p-5">
            {organization.logoUrl
              ? <img src={organization.logoUrl} alt="" className="h-16 w-16 rounded-2xl bg-white object-cover" />
              : <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-forest"><Building2 size={26} /></span>}
            <div className="min-w-0"><p className="truncate text-lg font-extrabold">{organization.name}</p><p className="mt-1 text-xs font-bold text-forest">{organization.type || 'Music organization'}</p></div>
          </div>
          <div className="p-5">
            <p className="min-h-12 text-sm leading-6 text-muted">{organization.description || 'Supporting and growing Rwanda’s music community.'}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              {organization.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{organization.location}</span>}
              <span>{organization._count?.opportunities ?? 0} open opportunities</span>
            </div>
            <Link href={`/app/organizations/${organization.id}`} className="btn-secondary mt-4 w-full justify-center">View organization</Link>
          </div>
        </article>)}
      </div>}
      {!loading && !organizations.length && !error && <div className="card mt-5 p-9 text-center"><Building2 className="mx-auto text-muted" /><h2 className="mt-3 font-extrabold">No organizations found</h2><p className="mt-1 text-sm text-muted">Try another search, or create an organization for your music project.</p></div>}
      {formOpen && <Modal title="Create an organization" onClose={() => setFormOpen(false)}>
        <form onSubmit={createOrganization} className="grid gap-4 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><Notice>{error}</Notice></div>}
          <label className="text-xs font-bold sm:col-span-2">Name<input required maxLength={120} className="field mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-xs font-bold">Type<input maxLength={80} className="field mt-2" placeholder="Venue, label, festival…" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
          <label className="text-xs font-bold">Location<input maxLength={120} className="field mt-2" placeholder="Kigali, Rwanda" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">Logo URL<input type="url" maxLength={2048} className="field mt-2" value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">About<textarea maxLength={2000} rows={3} className="field mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create organization'}</button></div>
        </form>
      </Modal>}
    </section>
  );
}
