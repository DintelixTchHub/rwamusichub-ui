'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarDays, MapPin, Pencil, Save } from 'lucide-react';
import { Modal } from '@/components/modal';
import { Notice } from '@/components/notice';
import { api, uploadMedia } from '@/lib/api';
import { Opportunity } from '@/lib/types';

type Organization = {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  physicalAddress?: string | null;
  website?: string | null;
  socialLinks?: Partial<Record<'website' | 'facebook' | 'instagram' | 'youtube' | 'tiktok', string>> | null;
  registrationNumber?: string | null;
  establishedYear?: number | null;
  email?: string | null;
  phone?: string | null;
  owner: { id: string; fullName: string; username: string };
  opportunities: Opportunity[];
  _count?: { opportunities: number };
};
type ManagedOrganization = { id: string };
type MediaAsset = { url?: string | null };
const SOCIAL_FIELDS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
] as const;

export default function OrganizationDetailPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', type: '', location: '', description: '', logoUrl: '', coverImageUrl: '',
    country: '', city: '', physicalAddress: '', website: '', facebook: '', instagram: '',
    youtube: '', tiktok: '', registrationNumber: '', establishedYear: '', email: '', phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Organization>(`/organizations/${encodeURIComponent(organizationId)}`),
      api<ManagedOrganization[]>('/organizations/managed'),
    ]).then(([item, managed]) => {
      if (!active) return;
      setOrganization(item);
      setCanManage(managed.some(({ id }) => id === item.id));
      setForm({
        name: item.name,
        type: item.type ?? '',
        location: item.location ?? '',
        description: item.description ?? '',
        logoUrl: item.logoUrl ?? '',
        coverImageUrl: item.coverImageUrl ?? '',
        country: item.country ?? '',
        city: item.city ?? '',
        physicalAddress: item.physicalAddress ?? '',
        website: item.website ?? '',
        facebook: item.socialLinks?.facebook ?? '',
        instagram: item.socialLinks?.instagram ?? '',
        youtube: item.socialLinks?.youtube ?? '',
        tiktok: item.socialLinks?.tiktok ?? '',
        registrationNumber: item.registrationNumber ?? '',
        establishedYear: item.establishedYear?.toString() ?? '',
        email: item.email ?? '',
        phone: item.phone ?? '',
      });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load this organization.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId]);

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<Organization>(`/organizations/${organization.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          type: form.type || undefined,
          location: form.location || undefined,
          description: form.description || undefined,
          logoUrl: form.logoUrl || undefined,
          coverImageUrl: form.coverImageUrl || undefined,
          country: form.country || undefined,
          city: form.city || undefined,
          physicalAddress: form.physicalAddress || undefined,
          website: form.website || undefined,
          socialLinks: Object.fromEntries([
            ['website', form.website],
            ['facebook', form.facebook],
            ['instagram', form.instagram],
            ['youtube', form.youtube],
            ['tiktok', form.tiktok],
          ].filter(([, value]) => typeof value === 'string' && value.trim())),
          registrationNumber: form.registrationNumber || undefined,
          establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
        }),
      });
      setOrganization((current) => current ? { ...current, ...updated } : updated);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this organization.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadOrganizationImage(event: ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverImageUrl') {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP image no larger than 15 MB.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const asset = await uploadMedia<MediaAsset>(file, field === 'logoUrl' ? 'Organization' : 'Cover', 'Public');
      if (!asset.url) throw new Error('No public image URL was returned. Check backend R2 configuration.');
      setForm((current) => ({ ...current, [field]: asset.url ?? '' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload this organization image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link href="/app/organizations" className="inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={16} /> Organizations</Link>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-5 p-6 text-sm text-muted">Loading organization…</div>}
      {!loading && organization && <>
        <header className="card mt-5 overflow-hidden">
          <div className="relative flex flex-wrap items-center gap-5 bg-forest p-6 text-white md:p-9">
            {organization.coverImageUrl && <img src={organization.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
            <div className="relative flex flex-wrap items-center gap-5">
            {organization.logoUrl ? <img src={organization.logoUrl} alt="" className="h-20 w-20 rounded-2xl bg-white object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white/10 text-lime"><Building2 size={34} /></span>}
            <div className="min-w-0 flex-1"><p className="eyebrow !text-lime">{organization.type || 'Music organization'}</p><h1 className="mt-2 text-3xl font-black">{organization.name}</h1><p className="mt-2 text-sm text-white/75">Managed by {organization.owner.fullName}</p></div>
            {canManage && <button type="button" onClick={() => setEditing(true)} className="btn-secondary border-white/30 bg-white/10 text-white hover:bg-white/20"><Pencil size={15} /> Manage</button>}
            </div>
          </div>
          <div className="p-6 md:p-9">
            {organization.description && <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted">{organization.description}</p>}
            <div className="mt-4 flex flex-wrap gap-5 text-xs font-semibold text-muted">
              {organization.location && <span className="inline-flex items-center gap-1"><MapPin size={14} />{organization.location}</span>}
              {organization.website && <a className="text-forest hover:underline" href={organization.website} target="_blank" rel="noreferrer">Website ↗</a>}
              {organization.email && <a className="text-forest hover:underline" href={`mailto:${organization.email}`}>{organization.email}</a>}
              {organization.phone && <a className="text-forest hover:underline" href={`tel:${organization.phone}`}>{organization.phone}</a>}
              {SOCIAL_FIELDS.map(([key, label]) => organization.socialLinks?.[key] && <a key={key} className="text-forest hover:underline" href={organization.socialLinks[key]} target="_blank" rel="noreferrer">{label} ↗</a>)}
              <span>{organization._count?.opportunities ?? organization.opportunities.length} open opportunities</span>
            </div>
          </div>
        </header>
        <div className="mt-8 flex items-end justify-between gap-3"><div><p className="eyebrow">Work with this organization</p><h2 className="mt-1 text-xl font-black">Open opportunities</h2></div><Link href="/app/opportunities" className="btn-secondary">Explore all</Link></div>
        <div className="mt-4 space-y-3">
          {organization.opportunities.map((opportunity) => <article key={opportunity.id} className="card flex flex-wrap items-center gap-4 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest"><BriefcaseBusiness size={19} /></span>
            <div className="min-w-0 flex-1"><h3 className="font-extrabold">{opportunity.title}</h3><div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">{opportunity.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{opportunity.location}</span>}{opportunity.deadline && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />Apply by {new Date(opportunity.deadline).toLocaleDateString()}</span>}</div></div>
            <Link href={`/app/opportunities/${opportunity.id}`} className="btn-primary px-3 py-2 text-xs">View opportunity</Link>
          </article>)}
          {!organization.opportunities.length && <div className="card p-7 text-center text-sm text-muted">No open opportunities at the moment.</div>}
        </div>
      </>}
      {editing && organization && <Modal title="Manage organization" onClose={() => setEditing(false)}>
        <form onSubmit={saveOrganization} className="grid gap-4 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><Notice>{error}</Notice></div>}
          <label className="text-xs font-bold sm:col-span-2">Name<input required maxLength={120} className="field mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="text-xs font-bold">Category<input maxLength={80} className="field mt-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
          <label className="text-xs font-bold">Country<input maxLength={100} className="field mt-2" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></label>
          <label className="text-xs font-bold">City or district<input maxLength={100} className="field mt-2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <label className="text-xs font-bold">Contact phone<input type="tel" maxLength={40} className="field mt-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">Verified contact email<input type="email" maxLength={254} className="field mt-2" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">Logo<input type="file" accept="image/jpeg,image/png,image/webp" className="field mt-2" onChange={(event) => void uploadOrganizationImage(event, 'logoUrl')} />{form.logoUrl && <img src={form.logoUrl} alt="Organization logo preview" className="mt-2 h-16 w-16 rounded-xl object-cover" />}</label>
          <label className="text-xs font-bold sm:col-span-2">Cover image<input type="file" accept="image/jpeg,image/png,image/webp" className="field mt-2" onChange={(event) => void uploadOrganizationImage(event, 'coverImageUrl')} />{form.coverImageUrl && <img src={form.coverImageUrl} alt="Organization cover preview" className="mt-2 h-16 w-28 rounded-xl object-cover" />}</label>
          <label className="text-xs font-bold sm:col-span-2">Website<input type="url" maxLength={500} className="field mt-2" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
          {SOCIAL_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="url" className="field mt-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
          <label className="text-xs font-bold sm:col-span-2">Physical address<input maxLength={250} className="field mt-2" value={form.physicalAddress} onChange={(event) => setForm({ ...form, physicalAddress: event.target.value })} /></label>
          <label className="text-xs font-bold">Registration number<input maxLength={100} className="field mt-2" value={form.registrationNumber} onChange={(event) => setForm({ ...form, registrationNumber: event.target.value })} /></label>
          <label className="text-xs font-bold">Year established<input type="number" min="1800" max="2100" className="field mt-2" value={form.establishedYear} onChange={(event) => setForm({ ...form, establishedYear: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">About<textarea maxLength={2000} rows={4} className="field mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary"><Save size={15} />{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </Modal>}
    </section>
  );
}
