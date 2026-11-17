'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { CalendarDays, Plus, Save, Trash2, Upload, UserRound } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api, uploadMedia } from '@/lib/api';

type Profile = {
  stageName?: string | null;
  headline?: string | null;
  biography?: string | null;
  experience?: number | null;
  skillLevel?: string | null;
  city?: string | null;
  country?: string | null;
  province?: string | null;
  district?: string | null;
  visibility?: string;
  contactPreference?: string;
  bookingPreference?: string;
  customGenres?: string[];
  socialLinks?: Partial<Record<'website' | 'facebook' | 'instagram' | 'youtube' | 'tiktok', string>> | null;
  user?: {
    professions?: Array<{ professionId: string; profession: CatalogItem }>;
    instruments?: Array<{ instrumentId: string; skillLevel?: string | null; yearsExperience?: number | null; instrument: CatalogItem }>;
    genres?: Array<{ genreId: string; genre: CatalogItem }>;
  };
};

type CatalogItem = { id: string; name: string };
type PortfolioItem = { id: string; title: string; description?: string | null; mediaUrl?: string | null };
type AvailabilityItem = { id?: string; dayOfWeek: string; startTime: string; endTime: string; timezone: string; isAvailable: boolean };
type MediaAsset = { url?: string | null };
type AvatarAsset = { id: string; url?: string | null };
type AccountSummary = { fullName: string; phone?: string | null; avatarMediaId?: string | null; avatarUrl?: string | null };
const SOCIAL_FIELDS = [
  ['website', 'Website'],
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
] as const;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'video/mp4', 'application/pdf'];

export default function ProfilePage() {
  const [form, setForm] = useState<Profile>({ visibility: 'Public', bookingPreference: 'OpenToBooking' });
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [social, setSocial] = useState<Record<(typeof SOCIAL_FIELDS)[number][0], string>>({
    website: '', facebook: '', instagram: '', youtube: '', tiktok: '',
  });
  const [customGenres, setCustomGenres] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [profileExists, setProfileExists] = useState(false);
  const [item, setItem] = useState({ title: '', description: '', mediaUrl: '' });
  const [professions, setProfessions] = useState<CatalogItem[]>([]);
  const [instruments, setInstruments] = useState<CatalogItem[]>([]);
  const [genres, setGenres] = useState<CatalogItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilityItem[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Profile | null>('/profiles/me'),
      api<PortfolioItem[]>('/profiles/me/portfolio'),
      api<CatalogItem[]>('/professions'),
      api<CatalogItem[]>('/instruments'),
      api<CatalogItem[]>('/genres'),
      api<AvailabilityItem[]>('/profiles/me/availability'),
      api<AccountSummary>('/auth/me'),
    ]).then(([profile, items, professionList, instrumentList, genreList, availabilityItems, accountResult]) => {
      if (profile) {
        setForm(profile);
        setProfileExists(true);
        setSocial({
          website: profile.socialLinks?.website ?? '',
          facebook: profile.socialLinks?.facebook ?? '',
          instagram: profile.socialLinks?.instagram ?? '',
          youtube: profile.socialLinks?.youtube ?? '',
          tiktok: profile.socialLinks?.tiktok ?? '',
        });
        setCustomGenres(profile.customGenres?.join(', ') ?? '');
      }
      setAccount(accountResult);
      setPortfolio(items);
      setProfessions(professionList);
      setInstruments(instrumentList);
      setGenres(genreList);
      setAvailability(availabilityItems.map((entry) => ({
        ...entry,
        startTime: entry.startTime ?? '',
        endTime: entry.endTime ?? '',
        timezone: entry.timezone || 'Africa/Kigali',
      })));
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load your profile.'));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(profileExists ? '/profiles/me' : '/profiles', {
        method: profileExists ? 'PATCH' : 'POST',
        body: JSON.stringify({
          stageName: form.stageName,
          headline: form.headline,
          biography: form.biography,
          experience: form.experience,
          skillLevel: form.skillLevel,
          country: form.country,
          province: form.province,
          district: form.district,
          city: form.city,
          visibility: form.visibility,
          contactPreference: form.contactPreference,
          bookingPreference: form.bookingPreference,
          socialLinks: social,
          customGenres: customGenres.split(',').map((genre) => genre.trim()).filter(Boolean),
        }),
      });
      setProfileExists(true);
      setSuccess('Your professional profile has been saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your profile.');
    } finally { setBusy(false); }
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setError('Choose a JPEG, PNG, or WebP profile photo no larger than 15 MB.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const asset = await uploadMedia<AvatarAsset>(file, 'Avatar', 'Public');
      if (!asset.id || !asset.url) throw new Error('No public image URL was returned. Check backend R2 configuration.');
      await api('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarMediaId: asset.id }),
      });
      setAccount((current) => current ? { ...current, avatarMediaId: asset.id, avatarUrl: asset.url ?? null } : current);
      setSuccess('Profile photo updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update your profile photo.');
    } finally {
      setUploading(false);
    }
  }

  async function addPortfolioItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const created = await api<PortfolioItem>('/profiles/me/portfolio', { method: 'POST', body: JSON.stringify(item) });
      setPortfolio((current) => [...current, created]);
      setItem({ title: '', description: '', mediaUrl: '' });
      setSuccess('Portfolio item added.');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add portfolio item.');
    }
  }

  async function uploadPortfolioMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, WebP, MP3, MP4, or PDF file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Files must be 15 MB or smaller.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const asset = await uploadMedia<MediaAsset>(file, 'Portfolio', 'Public');
      if (!asset.url) {
        throw new Error('Upload completed, but no public media URL was returned. Configure R2_PUBLIC_BASE_URL on the backend before attaching portfolio media.');
      }
      setItem((current) => ({ ...current, mediaUrl: asset.url ?? '' }));
      setSuccess('Media uploaded. Add a title and save it to your portfolio.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload portfolio media.');
    } finally {
      setUploading(false);
    }
  }

  async function toggleAssociation(kind: 'professions' | 'instruments' | 'genres', id: string, selected: boolean) {
    const singular = kind === 'professions' ? 'profession' : kind === 'instruments' ? 'instrument' : 'genre';
    const endpoint = `/profiles/me/${kind}/${id}`;
    const body = kind === 'professions' ? { professionId: id } : kind === 'instruments' ? { instrumentId: id } : { genreId: id };
    try {
      if (selected) {
        await api(endpoint, { method: 'DELETE' });
      } else {
        await api(kind === 'instruments' ? '/profiles/me/instruments' : `/profiles/me/${kind}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      const profile = await api<Profile | null>('/profiles/me');
      setForm((current) => ({ ...current, user: profile?.user }));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not update ${singular} selection.`);
    }
  }

  async function saveAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/profiles/me/availability', {
        method: 'PUT',
        body: JSON.stringify(availability.map(({ dayOfWeek, startTime, endTime, timezone, isAvailable }) => ({
          dayOfWeek, startTime: startTime || undefined, endTime: endTime || undefined, timezone, isAvailable,
        }))),
      });
      const saved = await api<AvailabilityItem[]>('/profiles/me/availability');
      setAvailability(saved.map((entry) => ({ ...entry, startTime: entry.startTime ?? '', endTime: entry.endTime ?? '', timezone: entry.timezone || 'Africa/Kigali' })));
      setSuccess('Your availability has been saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save availability.');
    } finally { setBusy(false); }
  }

  const selectedIds = {
    professions: new Set(form.user?.professions?.map((entry) => entry.professionId) ?? []),
    instruments: new Set(form.user?.instruments?.map((entry) => entry.instrumentId) ?? []),
    genres: new Set(form.user?.genres?.map((entry) => entry.genreId) ?? []),
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div><p className="eyebrow">Your professional identity</p><h1 className="mt-2 text-3xl font-black tracking-tight">My profile</h1><p className="mt-2 text-sm text-muted">Show people what you do and what you&apos;re available for.</p></div>
      {(error || success) && <div className="mt-5"><Notice kind={success && !error ? 'success' : 'error'}>{error || success}</Notice></div>}
      <section className="card mt-6 flex flex-wrap items-center gap-4 p-5">
        {account?.avatarUrl ? <img src={account.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-full bg-[#edf4eb] text-forest"><UserRound /></span>}
        <div className="min-w-0 flex-1"><h2 className="font-extrabold">{account?.fullName ?? 'Profile photo'}</h2><p className="text-xs text-muted">Your account photo appears with your personal posts.</p></div>
        <label className="btn-secondary cursor-pointer"><Upload size={15} />{uploading ? 'Uploading…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only" onChange={(event) => void uploadAvatar(event)} /></label>
      </section>
      <form onSubmit={saveProfile} className="card mt-6 p-5 md:p-7">
        <div className="flex items-center gap-3 border-b border-line pb-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><UserRound /></span><div><h2 className="font-extrabold">Profile details</h2><p className="text-xs text-muted">Your public professional profile</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold">Stage / artist name<input className="field mt-2" value={form.stageName ?? ''} onChange={(e) => setForm({ ...form, stageName: e.target.value })} /></label>
          <label className="text-xs font-bold">Headline<input className="field mt-2" placeholder="Singer · songwriter · Kigali" value={form.headline ?? ''} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
          <label className="text-xs font-bold md:col-span-2">Biography<textarea rows={4} className="field mt-2" value={form.biography ?? ''} onChange={(e) => setForm({ ...form, biography: e.target.value })} /></label>
          <label className="text-xs font-bold">City<input className="field mt-2" value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label className="text-xs font-bold">Country<input className="field mt-2" value={form.country ?? 'Rwanda'} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
          <label className="text-xs font-bold">Years of experience<input type="number" min="0" className="field mt-2" value={form.experience ?? ''} onChange={(e) => setForm({ ...form, experience: e.target.value ? Number(e.target.value) : null })} /></label>
          <label className="text-xs font-bold">Skill level<select className="field mt-2" value={form.skillLevel ?? ''} onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}><option value="">Select a level</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Professional</option></select></label>
          <label className="text-xs font-bold">Booking availability<select className="field mt-2" value={form.bookingPreference ?? 'OpenToBooking'} onChange={(e) => setForm({ ...form, bookingPreference: e.target.value })}><option value="OpenToBooking">Open to booking</option><option value="InquireFirst">Inquire first</option><option value="NotAvailable">Not available</option></select></label>
          <label className="text-xs font-bold">Preferred contact method<select className="field mt-2" value={form.contactPreference ?? 'DirectMessage'} onChange={(e) => setForm({ ...form, contactPreference: e.target.value })}><option value="DirectMessage">Direct message</option><option value="Email">Email</option><option value="Phone">Phone</option></select></label>
          <label className="text-xs font-bold">Profile visibility<select className="field mt-2" value={form.visibility ?? 'Public'} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="Public">Public</option><option value="Private">Private</option><option value="Unlisted">Unlisted</option></select></label>
          {SOCIAL_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="url" className="field mt-2" value={social[key]} onChange={(event) => setSocial({ ...social, [key]: event.target.value })} /></label>)}
        </div>
        <button disabled={busy} className="btn-primary mt-5"><Save size={16} />{busy ? 'Saving…' : 'Save profile'}</button>
      </form>

      <section className="card mt-5 p-5 md:p-7">
        <h2 className="font-extrabold">Your music identity</h2><p className="mt-1 text-sm text-muted">Choose the professions, instruments and genres that describe you.</p>
        {([
          ['Professions', professions, 'professions'],
          ['Instruments', instruments, 'instruments'],
          ['Genres', genres, 'genres'],
        ] as const).map(([label, catalog, kind]) => (
          <fieldset key={kind} className="mt-5">
            <legend className="text-xs font-bold">{label}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalog.map((entry) => {
                const checked = selectedIds[kind].has(entry.id);
                return <label key={entry.id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${checked ? 'border-forest bg-[#edf4eb] text-forest' : 'border-line bg-white text-muted'}`}>
                  <input className="sr-only" type="checkbox" checked={checked} onChange={() => void toggleAssociation(kind, entry.id, checked)} />
                  {entry.name}
                </label>;
              })}
              {catalog.length === 0 && <span className="text-xs text-muted">Catalog is empty.</span>}
            </div>
          </fieldset>
        ))}
        <label className="mt-5 block text-xs font-bold">Additional genres<input className="field mt-2" placeholder="Separate custom genres with commas" value={customGenres} onChange={(event) => setCustomGenres(event.target.value)} /></label>
      </section>

      <form onSubmit={saveAvailability} className="card mt-5 p-5 md:p-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest"><CalendarDays size={20} /></span><div><h2 className="font-extrabold">Weekly availability</h2><p className="text-xs text-muted">Set the days and hours you&apos;re available for work.</p></div></div>
        <div className="mt-5 space-y-3">
          {DAYS.map((day) => {
            const existing = availability.find((entry) => entry.dayOfWeek === day);
            const entry = existing ?? { dayOfWeek: day, startTime: '', endTime: '', timezone: 'Africa/Kigali', isAvailable: false };
            const update = (patch: Partial<AvailabilityItem>) => setAvailability((current) => [
              ...current.filter((item) => item.dayOfWeek !== day),
              { ...entry, ...patch },
            ].sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek)));
            return <div key={day} className="grid items-center gap-3 rounded-xl bg-canvas p-3 sm:grid-cols-[120px_1fr_1fr_1fr]">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={entry.isAvailable} onChange={(e) => update({ isAvailable: e.target.checked })} />{day}</label>
              <label className="text-[11px] font-semibold text-muted">From<input type="time" disabled={!entry.isAvailable} className="field mt-1 py-2 text-xs" value={entry.startTime} onChange={(e) => update({ startTime: e.target.value })} /></label>
              <label className="text-[11px] font-semibold text-muted">Until<input type="time" disabled={!entry.isAvailable} className="field mt-1 py-2 text-xs" value={entry.endTime} onChange={(e) => update({ endTime: e.target.value })} /></label>
              <label className="text-[11px] font-semibold text-muted">Timezone<select disabled={!entry.isAvailable} className="field mt-1 py-2 text-xs" value={entry.timezone} onChange={(e) => update({ timezone: e.target.value })}><option value="Africa/Kigali">Africa/Kigali (CAT)</option><option value="UTC">UTC</option></select></label>
            </div>;
          })}
        </div>
        <button disabled={busy} className="btn-primary mt-5"><Save size={16} /> Save availability</button>
      </form>

      <section className="card mt-5 p-5 md:p-7">
        <h2 className="font-extrabold">Portfolio</h2><p className="mt-1 text-sm text-muted">Add a project, track or performance to showcase your work.</p>
        <div className="mt-4 space-y-3">{portfolio.map((portfolioItem) => <article key={portfolioItem.id} className="rounded-xl bg-canvas p-4"><h3 className="text-sm font-bold">{portfolioItem.title}</h3>{portfolioItem.description && <p className="mt-1 text-xs text-muted">{portfolioItem.description}</p>}{portfolioItem.mediaUrl && <a className="mt-2 inline-block text-xs font-bold text-forest" href={portfolioItem.mediaUrl} target="_blank" rel="noreferrer">Open media ↗</a>}</article>)}</div>
        <form onSubmit={addPortfolioItem} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold">Title<input required maxLength={200} className="field mt-2" value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} /></label>
          <label className="text-xs font-bold">Media URL<input type="url" className="field mt-2" value={item.mediaUrl} onChange={(e) => setItem({ ...item, mediaUrl: e.target.value })} /></label>
          <label className="text-xs font-bold md:col-span-2">Description<input className="field mt-2" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></label>
          <label className="btn-secondary cursor-pointer md:col-span-2"><Upload size={16} />{uploading ? 'Uploading…' : 'Upload media'}<input type="file" accept={ALLOWED_MIME_TYPES.join(',')} disabled={uploading} className="sr-only" onChange={(event) => void uploadPortfolioMedia(event)} /></label>
          <button className="btn-secondary md:col-span-2"><Plus size={16} /> Add to portfolio</button>
        </form>
      </section>
    </section>
  );
}
