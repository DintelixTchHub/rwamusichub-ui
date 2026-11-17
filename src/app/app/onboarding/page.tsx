'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Music2, Upload } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api, persistUser, uploadMedia } from '@/lib/api';
import { User } from '@/lib/types';

type CatalogItem = { id: string; name: string };
type SocialLinks = {
  website: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};
type Profile = {
  stageName?: string | null;
  headline?: string | null;
  biography?: string | null;
  city?: string | null;
  country?: string | null;
  socialLinks?: Partial<SocialLinks> | null;
  customGenres?: string[];
  user?: {
    professions?: Array<{ professionId: string }>;
    instruments?: Array<{ instrumentId: string }>;
    genres?: Array<{ genreId: string }>;
  };
} | null;
type PortfolioItem = { id: string; title: string; description?: string | null; mediaUrl?: string | null };
type MediaAsset = { id: string; url?: string | null };
type Organization = {
  id: string;
  ownerId: string;
  name: string;
  type?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  country?: string | null;
  city?: string | null;
  location?: string | null;
  physicalAddress?: string | null;
  website?: string | null;
  socialLinks?: Partial<SocialLinks> | null;
  registrationNumber?: string | null;
  establishedYear?: number | null;
  email?: string | null;
  phone?: string | null;
  members?: Array<{ role: string; title?: string | null; authorizationConfirmedAt?: string | null }>;
};

const ORGANIZATION_TYPES = [
  'Event Management Company',
  'Church / Religious Organization',
  'Music Festival',
  'Concert Promoter',
  'Recording Studio',
  'Music Production Company',
  'Entertainment Company',
  'Music Venue',
  'Music School / Institution',
  'Choir / Music Group',
  'Wedding and Event Planning',
  'Other',
];
const SOCIAL_FIELDS: Array<{ key: keyof SocialLinks; label: string }> = [
  { key: 'website', label: 'Website' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [professions, setProfessions] = useState<CatalogItem[]>([]);
  const [instruments, setInstruments] = useState<CatalogItem[]>([]);
  const [genres, setGenres] = useState<CatalogItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [personal, setPersonal] = useState({
    fullName: '',
    phone: '',
    country: 'Rwanda',
    city: '',
    avatarMediaId: '',
    avatarUrl: '',
  });
  const [professional, setProfessional] = useState({
    stageName: '',
    headline: '',
    biography: '',
    customGenres: '',
  });
  const [social, setSocial] = useState<SocialLinks>({
    website: '',
    facebook: '',
    instagram: '',
    youtube: '',
    tiktok: '',
  });
  const [portfolioDraft, setPortfolioDraft] = useState({ title: '', description: '', mediaUrl: '' });
  const [organizationForm, setOrganizationForm] = useState({
    name: '',
    type: '',
    description: '',
    logoUrl: '',
    coverImageUrl: '',
    country: 'Rwanda',
    city: '',
    physicalAddress: '',
    website: '',
    registrationNumber: '',
    establishedYear: '',
    email: '',
    phone: '',
    ownerTitle: '',
    ownerAuthorized: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const currentUser = await api<User>('/auth/me');
        if (!active) return;
        if (currentUser.onboardingCompleted) {
          window.location.replace('/app');
          return;
        }
        setUser(currentUser);
        setStep(Math.min(4, Math.max(1, currentUser.onboardingStep ?? 1)));
        setPersonal((current) => ({
          ...current,
          fullName: currentUser.fullName ?? '',
          phone: currentUser.phone ?? '',
          avatarMediaId: currentUser.avatarMediaId ?? '',
          avatarUrl: currentUser.avatarUrl ?? '',
        }));
        if (!currentUser.accountTypeSelected) return;

        if (currentUser.accountType === 'EventOrganizer') {
          const organizations = await api<Organization[]>('/organizations/managed');
          if (!active) return;
          const existing = organizations.find(({ ownerId }) => ownerId === currentUser.id) ?? null;
          setOrganization(existing);
          if (existing) {
            setSocial({
              website: existing.socialLinks?.website ?? existing.website ?? '',
              facebook: existing.socialLinks?.facebook ?? '',
              instagram: existing.socialLinks?.instagram ?? '',
              youtube: existing.socialLinks?.youtube ?? '',
              tiktok: existing.socialLinks?.tiktok ?? '',
            });
            setOrganizationForm({
              name: existing.name,
              type: existing.type ?? '',
              description: existing.description ?? '',
              logoUrl: existing.logoUrl ?? '',
              coverImageUrl: existing.coverImageUrl ?? '',
              country: existing.country ?? 'Rwanda',
              city: existing.city ?? '',
              physicalAddress: existing.physicalAddress ?? '',
              website: existing.website ?? '',
              registrationNumber: existing.registrationNumber ?? '',
              establishedYear: existing.establishedYear?.toString() ?? '',
              email: existing.email ?? currentUser.email ?? '',
              phone: existing.phone ?? currentUser.phone ?? '',
              ownerTitle: existing.members?.[0]?.title ?? '',
              ownerAuthorized: Boolean(existing.members?.[0]?.authorizationConfirmedAt),
            });
          } else {
            setOrganizationForm((current) => ({
              ...current,
              email: currentUser.email ?? '',
              phone: currentUser.phone ?? '',
            }));
          }
        } else {
          const [currentProfile, professionList, instrumentList, genreList, portfolioItems] = await Promise.all([
            api<Profile>('/profiles/me'),
            api<CatalogItem[]>('/professions'),
            api<CatalogItem[]>('/instruments'),
            api<CatalogItem[]>('/genres'),
            api<PortfolioItem[]>('/profiles/me/portfolio'),
          ]);
          if (!active) return;
          setProfile(currentProfile);
          setProfessions(professionList);
          setInstruments(instrumentList);
          setGenres(genreList);
          setPortfolio(portfolioItems);
          setSelectedProfessions(currentProfile?.user?.professions?.map(({ professionId }) => professionId) ?? []);
          setSelectedInstruments(currentProfile?.user?.instruments?.map(({ instrumentId }) => instrumentId) ?? []);
          setSelectedGenres(currentProfile?.user?.genres?.map(({ genreId }) => genreId) ?? []);
          setPersonal((current) => ({
            ...current,
            country: currentProfile?.country ?? 'Rwanda',
            city: currentProfile?.city ?? '',
          }));
          setProfessional({
            stageName: currentProfile?.stageName ?? '',
            headline: currentProfile?.headline ?? '',
            biography: currentProfile?.biography ?? '',
            customGenres: currentProfile?.customGenres?.join(', ') ?? '',
          });
          setSocial({
            website: currentProfile?.socialLinks?.website ?? '',
            facebook: currentProfile?.socialLinks?.facebook ?? '',
            instagram: currentProfile?.socialLinks?.instagram ?? '',
            youtube: currentProfile?.socialLinks?.youtube ?? '',
            tiktok: currentProfile?.socialLinks?.tiktok ?? '',
          });
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your onboarding.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const isOrganizer = user?.accountType === 'EventOrganizer';

  async function selectAccountType(accountType: 'Musician' | 'EventOrganizer') {
    setBusy(true);
    setError('');
    try {
      await api('/auth/onboarding/account-type', {
        method: 'PATCH',
        body: JSON.stringify({ accountType }),
      });
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your account type.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, category: 'Avatar' | 'Organization' | 'Cover') {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 15 MB or smaller.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const asset = await uploadMedia<MediaAsset>(file, category, 'Public');
      if (!asset.id || !asset.url) {
        throw new Error('The image uploaded, but R2 did not return a public URL. Check the backend R2 configuration.');
      }
      if (category === 'Avatar') {
        setPersonal((current) => ({ ...current, avatarMediaId: asset.id, avatarUrl: asset.url ?? '' }));
      } else {
        setOrganizationForm((current) => ({
          ...current,
          [category === 'Organization' ? 'logoUrl' : 'coverImageUrl']: asset.url ?? '',
        }));
      }
      setSuccess('Image uploaded successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload this image.');
    } finally {
      setUploading(false);
    }
  }

  function toggleSelection(current: string[], setCurrent: (next: string[]) => void, id: string) {
    setCurrent(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function savePersonalInformation() {
    if (!user || !personal.avatarMediaId) {
      throw new Error('Upload a profile photo to continue.');
    }
    const updatedUser = await api<Pick<User, 'fullName' | 'phone' | 'avatarMediaId' | 'avatarUrl'>>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: personal.fullName,
        phone: personal.phone,
        avatarMediaId: personal.avatarMediaId,
      }),
    });
    setUser((current) => current ? { ...current, ...updatedUser } : current);
    const profileData = {
      city: personal.city,
      country: personal.country,
      visibility: 'Private',
    };
    const savedProfile = await api<Profile>(profile ? '/profiles/me' : '/profiles', {
      method: profile ? 'PATCH' : 'POST',
      body: JSON.stringify(profileData),
    });
    setProfile(savedProfile ? { ...profile, ...savedProfile, user: profile?.user } : profile);
  }

  async function syncAssociations(
    kind: 'professions' | 'instruments' | 'genres',
    previousIds: string[],
    nextIds: string[],
  ) {
    const singular = kind === 'professions' ? 'professionId' : kind === 'instruments' ? 'instrumentId' : 'genreId';
    const tasks = [
      ...previousIds.filter((id) => !nextIds.includes(id)).map((id) =>
        api(`/profiles/me/${kind}/${id}`, { method: 'DELETE' })),
      ...nextIds.filter((id) => !previousIds.includes(id)).map((id) =>
        api(`/profiles/me/${kind}`, { method: 'POST', body: JSON.stringify({ [singular]: id }) })),
    ];
    await Promise.all(tasks);
  }

  async function saveMusicianProfessional() {
    if (!selectedProfessions.length) throw new Error('Select at least one profession.');
    if (!selectedGenres.length && !professional.customGenres.trim()) throw new Error('Select or enter at least one music genre.');
    const savedProfile = await api<Profile>(profile ? '/profiles/me' : '/profiles', {
      method: profile ? 'PATCH' : 'POST',
      body: JSON.stringify({
        stageName: professional.stageName || undefined,
        headline: professional.headline || undefined,
        biography: professional.biography,
        city: personal.city,
        country: personal.country,
        customGenres: professional.customGenres.split(',').map((genre) => genre.trim()).filter(Boolean),
        visibility: 'Private',
      }),
    });
    setProfile(savedProfile);
    await Promise.all([
      syncAssociations('professions', profile?.user?.professions?.map(({ professionId }) => professionId) ?? [], selectedProfessions),
      syncAssociations('instruments', profile?.user?.instruments?.map(({ instrumentId }) => instrumentId) ?? [], selectedInstruments),
      syncAssociations('genres', profile?.user?.genres?.map(({ genreId }) => genreId) ?? [], selectedGenres),
    ]);
  }

  function organizationPayload() {
    return {
      name: organizationForm.name,
      type: organizationForm.type,
      description: organizationForm.description,
      logoUrl: organizationForm.logoUrl,
      coverImageUrl: organizationForm.coverImageUrl || undefined,
      country: organizationForm.country,
      city: organizationForm.city,
      location: [organizationForm.city, organizationForm.country].filter(Boolean).join(', '),
      physicalAddress: organizationForm.physicalAddress || undefined,
      website: organizationForm.website || undefined,
      socialLinks: Object.fromEntries(Object.entries(social).filter(([, value]) => value.trim())),
      registrationNumber: organizationForm.registrationNumber || undefined,
      establishedYear: organizationForm.establishedYear ? Number(organizationForm.establishedYear) : undefined,
      email: user?.email,
      phone: organizationForm.phone,
    };
  }

  async function saveOrganizationDetails() {
    if (!user) throw new Error('Your account could not be loaded.');
    if (!organizationForm.logoUrl) throw new Error('Upload an organization logo to continue.');
    const updatedUser = await api<Pick<User, 'fullName' | 'phone' | 'avatarMediaId' | 'avatarUrl'>>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: personal.fullName,
        phone: personal.phone,
        avatarMediaId: personal.avatarMediaId || undefined,
      }),
    });
    setUser((current) => current ? { ...current, ...updatedUser } : current);
    const payload = organizationPayload();
    const saved = await api<Organization>(organization ? `/organizations/${organization.id}` : '/organizations', {
      method: organization ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    setOrganization(saved);
  }

  async function saveOrganizationPresence() {
    if (!organization) throw new Error('Save your organization information first.');
    const payload = organizationPayload();
    const saved = await api<Organization>(`/organizations/${organization.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setOrganization(saved);
  }

  async function saveOwnerInformation() {
    if (!organization) throw new Error('Save your organization information first.');
    if (!organizationForm.ownerTitle.trim() || !organizationForm.ownerAuthorized) {
      throw new Error('Add your position and confirm that you are authorized to represent the organization.');
    }
    const saved = await api<Organization>(`/organizations/${organization.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ownerTitle: organizationForm.ownerTitle,
        ownerAuthorized: true,
      }),
    });
    setOrganization(saved);
  }

  async function continueOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (isOrganizer) {
        if (step === 1) await saveOrganizationDetails();
        if (step === 2) await saveOrganizationPresence();
        if (step === 3) await saveOwnerInformation();
      } else {
        if (step === 1) await savePersonalInformation();
        if (step === 2) await saveMusicianProfessional();
        if (step === 3) {
          if (!profile) throw new Error('Save your professional profile first.');
          await api('/profiles/me', {
            method: 'PATCH',
            body: JSON.stringify({ socialLinks: social }),
          });
          if (portfolioDraft.title.trim() || portfolioDraft.mediaUrl.trim() || portfolioDraft.description.trim()) {
            const title = portfolioDraft.title.trim() || 'Portfolio sample';
            const item = await api<PortfolioItem>('/profiles/me/portfolio', {
              method: 'POST',
              body: JSON.stringify({ ...portfolioDraft, title }),
            });
            setPortfolio((current) => [...current, item]);
            setPortfolioDraft({ title: '', description: '', mediaUrl: '' });
          }
        }
      }

      const nextStep = Math.min(4, step + 1);
      await api('/auth/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({ step: nextStep }),
      });
      setStep(nextStep);
      setSuccess('Your progress has been saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this onboarding step.');
    } finally {
      setBusy(false);
    }
  }

  async function goBack() {
    const previousStep = Math.max(1, step - 1);
    setBusy(true);
    setError('');
    try {
      await api('/auth/onboarding/progress', {
        method: 'PATCH',
        body: JSON.stringify({ step: previousStep }),
      });
      setStep(previousStep);
      setSuccess('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not restore the previous step.');
    } finally {
      setBusy(false);
    }
  }

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/onboarding/complete', { method: 'POST', body: JSON.stringify({}) });
      if (user) persistUser({ ...user, fullName: personal.fullName, phone: personal.phone, onboardingStep: 4, onboardingCompleted: true });
      window.location.replace('/app');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not complete onboarding.');
    } finally {
      setBusy(false);
    }
  }

  const stepTitles = isOrganizer
    ? ['Organization information', 'Organization presence', 'Owner information', 'Review']
    : ['Personal information', 'Professional identity', 'Portfolio & social presence', 'Review'];

  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow">{isOrganizer ? 'Event organizer setup' : 'Musician setup'}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{isOrganizer ? 'Create your organization identity' : 'Build your musician profile'}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your account stays personal. You can add other professional identities after setup.
      </p>
      {(error || success) && <div className="mt-5"><Notice kind={success && !error ? 'success' : 'error'}>{error || success}</Notice></div>}
      {loading ? <div className="card mt-6 p-6 text-sm text-muted">Loading your saved setup…</div> : user && !user.accountTypeSelected ? (
        <div className="card mt-6 grid gap-4 p-5 md:grid-cols-2 md:p-7">
          <h2 className="font-extrabold md:col-span-2">Choose your starting experience</h2>
          <p className="text-sm leading-6 text-muted md:col-span-2">This choice sets up your first dashboard. You can add musician and organization identities to this same account later.</p>
          <button type="button" disabled={busy} onClick={() => void selectAccountType('Musician')} className="rounded-2xl border border-line p-5 text-left transition hover:border-forest hover:bg-[#f5f8f2]">
            <Music2 className="text-forest" /><h3 className="mt-3 font-extrabold">Musician or music professional</h3><p className="mt-1 text-sm text-muted">Build a profile, share work and find opportunities.</p>
          </button>
          <button type="button" disabled={busy} onClick={() => void selectAccountType('EventOrganizer')} className="rounded-2xl border border-line p-5 text-left transition hover:border-forest hover:bg-[#f5f8f2]">
            <Building2 className="text-forest" /><h3 className="mt-3 font-extrabold">Event organizer</h3><p className="mt-1 text-sm text-muted">Create an organization and connect with performers.</p>
          </button>
        </div>
      ) : user && (
        <form onSubmit={step === 4 ? completeOnboarding : continueOnboarding} className="card mt-6 p-5 md:p-7">
          <div className="flex items-center gap-3 border-b border-line pb-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest">{isOrganizer ? <Building2 size={20} /> : <Music2 size={20} />}</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold">{stepTitles[step - 1]}</h2>
              <p className="mt-1 text-xs text-muted">Step {step} of 4 · Your completed steps are saved automatically.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2" aria-label={`Step ${step} of 4`}>
            {stepTitles.map((title, index) => <div key={title} className={`h-1.5 rounded-full ${index < step ? 'bg-forest' : 'bg-line'}`} />)}
          </div>

          {isOrganizer && step === 1 && <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold sm:col-span-2">Organization name<input required maxLength={120} className="field mt-2" value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} /></label>
            <label className="text-xs font-bold">Category<select required className="field mt-2" value={organizationForm.type} onChange={(event) => setOrganizationForm({ ...organizationForm, type: event.target.value })}><option value="">Choose a category</option>{ORGANIZATION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="text-xs font-bold">City or district<input required maxLength={100} className="field mt-2" value={organizationForm.city} onChange={(event) => setOrganizationForm({ ...organizationForm, city: event.target.value })} /></label>
            <label className="text-xs font-bold">Country<input required maxLength={100} className="field mt-2" value={organizationForm.country} onChange={(event) => setOrganizationForm({ ...organizationForm, country: event.target.value })} /></label>
            <label className="text-xs font-bold">Contact phone<input required type="tel" maxLength={40} className="field mt-2" value={organizationForm.phone} onChange={(event) => {
              const phone = event.target.value;
              setOrganizationForm({ ...organizationForm, phone });
              setPersonal((current) => ({ ...current, phone }));
            }} /></label>
            <label className="text-xs font-bold">Verified contact email<input readOnly className="field mt-2 bg-canvas" value={user.email ?? ''} /></label>
            <label className="text-xs font-bold sm:col-span-2">Organization description<textarea required maxLength={2000} rows={4} className="field mt-2" value={organizationForm.description} onChange={(event) => setOrganizationForm({ ...organizationForm, description: event.target.value })} /></label>
            <label className="text-xs font-bold sm:col-span-2">Organization logo
              <span className="mt-2 flex flex-wrap items-center gap-3">
                <input required={!organizationForm.logoUrl} type="file" accept="image/jpeg,image/png,image/webp" className="field min-w-0 flex-1" onChange={(event) => void uploadImage(event, 'Organization')} />
                <span className="inline-flex items-center gap-1 text-muted"><Upload size={15} />{uploading ? 'Uploading…' : 'Upload to R2'}</span>
                {organizationForm.logoUrl && <img src={organizationForm.logoUrl} alt="Organization logo preview" className="h-14 w-14 rounded-xl object-cover" />}
              </span>
            </label>
          </div>}

          {isOrganizer && step === 2 && <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold sm:col-span-2">Website<input type="url" className="field mt-2" value={organizationForm.website} onChange={(event) => setOrganizationForm({ ...organizationForm, website: event.target.value })} /></label>
            {SOCIAL_FIELDS.filter(({ key }) => key !== 'website').map(({ key, label }) => <label key={key} className="text-xs font-bold">{label}<input type="url" className="field mt-2" value={social[key]} onChange={(event) => setSocial({ ...social, [key]: event.target.value })} /></label>)}
            <label className="text-xs font-bold sm:col-span-2">Cover image (optional)
              <span className="mt-2 flex flex-wrap items-center gap-3"><input type="file" accept="image/jpeg,image/png,image/webp" className="field min-w-0 flex-1" onChange={(event) => void uploadImage(event, 'Cover')} />{organizationForm.coverImageUrl && <img src={organizationForm.coverImageUrl} alt="Organization cover preview" className="h-14 w-24 rounded-xl object-cover" />}</span>
            </label>
            <label className="text-xs font-bold sm:col-span-2">Physical address (optional)<input maxLength={250} className="field mt-2" value={organizationForm.physicalAddress} onChange={(event) => setOrganizationForm({ ...organizationForm, physicalAddress: event.target.value })} /></label>
            <label className="text-xs font-bold">Registration number (optional)<input maxLength={100} className="field mt-2" value={organizationForm.registrationNumber} onChange={(event) => setOrganizationForm({ ...organizationForm, registrationNumber: event.target.value })} /></label>
            <label className="text-xs font-bold">Year established (optional)<input type="number" min="1800" max="2100" className="field mt-2" value={organizationForm.establishedYear} onChange={(event) => setOrganizationForm({ ...organizationForm, establishedYear: event.target.value })} /></label>
          </div>}

          {isOrganizer && step === 3 && <div className="mt-6 grid gap-4">
            <div className="rounded-xl bg-canvas p-4 text-sm"><p><strong>Owner:</strong> {user.fullName}</p><p className="mt-1"><strong>Verified account email:</strong> {user.email}</p><p className="mt-1"><strong>Phone:</strong> {personal.phone || organizationForm.phone}</p></div>
            <label className="text-xs font-bold">Your position or title<input required maxLength={120} className="field mt-2" placeholder="Founder, Director, Pastor…" value={organizationForm.ownerTitle} onChange={(event) => setOrganizationForm({ ...organizationForm, ownerTitle: event.target.value })} /></label>
            <label className="flex items-start gap-3 rounded-xl border border-line p-4 text-sm"><input required type="checkbox" checked={organizationForm.ownerAuthorized} onChange={(event) => setOrganizationForm({ ...organizationForm, ownerAuthorized: event.target.checked })} /><span>I am authorized to represent and manage this organization.</span></label>
          </div>}

          {!isOrganizer && step === 1 && <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold">Full name<input required minLength={2} maxLength={120} className="field mt-2" value={personal.fullName} onChange={(event) => setPersonal({ ...personal, fullName: event.target.value })} /></label>
            <label className="text-xs font-bold">Verified email<input readOnly className="field mt-2 bg-canvas" value={user.email ?? ''} /></label>
            <label className="text-xs font-bold">Phone number<input required type="tel" minLength={7} maxLength={40} className="field mt-2" value={personal.phone} onChange={(event) => setPersonal({ ...personal, phone: event.target.value })} /></label>
            <label className="text-xs font-bold">Country<input required maxLength={100} className="field mt-2" value={personal.country} onChange={(event) => setPersonal({ ...personal, country: event.target.value })} /></label>
            <label className="text-xs font-bold">City or district<input required maxLength={100} className="field mt-2" value={personal.city} onChange={(event) => setPersonal({ ...personal, city: event.target.value })} /></label>
            <label className="text-xs font-bold sm:col-span-2">Profile photo
              <span className="mt-2 flex flex-wrap items-center gap-3">
                <input required={!personal.avatarMediaId} type="file" accept="image/jpeg,image/png,image/webp" className="field min-w-0 flex-1" onChange={(event) => void uploadImage(event, 'Avatar')} />
                <span className="inline-flex items-center gap-1 text-muted"><Upload size={15} />{uploading ? 'Uploading…' : 'Upload to R2'}</span>
                {personal.avatarUrl && <img src={personal.avatarUrl} alt="Profile photo preview" className="h-14 w-14 rounded-full object-cover" />}
              </span>
            </label>
          </div>}

          {!isOrganizer && step === 2 && <div className="mt-6 grid gap-5">
            <label className="text-xs font-bold">Professional name (optional)<input maxLength={120} className="field mt-2" value={professional.stageName} onChange={(event) => setProfessional({ ...professional, stageName: event.target.value })} /></label>
            <label className="text-xs font-bold">Short professional biography<textarea required maxLength={5000} rows={4} className="field mt-2" value={professional.biography} onChange={(event) => setProfessional({ ...professional, biography: event.target.value })} /></label>
            <div>
              <p className="text-xs font-bold">Professions <span className="font-normal text-muted">(select at least one; multiple allowed)</span></p>
              <div className="mt-2 flex flex-wrap gap-2">{professions.map(({ id, name }) => <label key={id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${selectedProfessions.includes(id) ? 'border-forest bg-[#edf4eb] text-forest' : 'border-line text-muted'}`}><input className="sr-only" type="checkbox" checked={selectedProfessions.includes(id)} onChange={() => toggleSelection(selectedProfessions, setSelectedProfessions, id)} />{name}</label>)}{!professions.length && <span className="text-xs text-muted">No profession options are available. Run the backend catalog seed.</span>}</div>
            </div>
            <div>
              <p className="text-xs font-bold">Music genres <span className="font-normal text-muted">(select at least one; multiple allowed)</span></p>
              <div className="mt-2 flex flex-wrap gap-2">{genres.map(({ id, name }) => <label key={id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${selectedGenres.includes(id) ? 'border-forest bg-[#edf4eb] text-forest' : 'border-line text-muted'}`}><input className="sr-only" type="checkbox" checked={selectedGenres.includes(id)} onChange={() => toggleSelection(selectedGenres, setSelectedGenres, id)} />{name}</label>)}</div>
              <label className="mt-3 block text-xs font-bold">Additional genres (optional)<input className="field mt-2" placeholder="Separate additional genres with commas" value={professional.customGenres} onChange={(event) => setProfessional({ ...professional, customGenres: event.target.value })} /></label>
            </div>
            <div>
              <p className="text-xs font-bold">Instruments <span className="font-normal text-muted">(optional; choose any that apply)</span></p>
              <div className="mt-2 flex flex-wrap gap-2">{instruments.map(({ id, name }) => <label key={id} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold ${selectedInstruments.includes(id) ? 'border-forest bg-[#edf4eb] text-forest' : 'border-line text-muted'}`}><input className="sr-only" type="checkbox" checked={selectedInstruments.includes(id)} onChange={() => toggleSelection(selectedInstruments, setSelectedInstruments, id)} />{name}</label>)}</div>
            </div>
          </div>}

          {!isOrganizer && step === 3 && <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {SOCIAL_FIELDS.map(({ key, label }) => <label key={key} className="text-xs font-bold">{label}<input type="url" className="field mt-2" value={social[key]} onChange={(event) => setSocial({ ...social, [key]: event.target.value })} /></label>)}
            <label className="text-xs font-bold sm:col-span-2">Portfolio title (optional)<input maxLength={200} className="field mt-2" value={portfolioDraft.title} onChange={(event) => setPortfolioDraft({ ...portfolioDraft, title: event.target.value })} /></label>
            <label className="text-xs font-bold sm:col-span-2">Audio, image or video URL (optional)<input type="url" className="field mt-2" placeholder="Paste an external link or upload a media file below" value={portfolioDraft.mediaUrl} onChange={(event) => setPortfolioDraft({ ...portfolioDraft, mediaUrl: event.target.value })} /></label>
            <label className="text-xs font-bold sm:col-span-2">Upload an audio sample, image, video or document
              <input type="file" accept="image/jpeg,image/png,image/webp,audio/mpeg,video/mp4,application/pdf" className="field mt-2" onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                if (file.size > MAX_IMAGE_BYTES) { setError('Files must be 15 MB or smaller.'); return; }
                setUploading(true);
                try {
                  const asset = await uploadMedia<MediaAsset>(file, 'Portfolio', 'Public');
                  if (!asset.url) throw new Error('No public media URL was returned. Check backend R2 configuration.');
                  setPortfolioDraft((current) => ({ ...current, mediaUrl: asset.url ?? '' }));
                  setError('');
                  setSuccess('Portfolio media uploaded.');
                } catch (reason) {
                  setError(reason instanceof Error ? reason.message : 'Could not upload portfolio media.');
                } finally { setUploading(false); }
              }} />
            </label>
            <label className="text-xs font-bold sm:col-span-2">Portfolio description (optional)<textarea rows={3} className="field mt-2" value={portfolioDraft.description} onChange={(event) => setPortfolioDraft({ ...portfolioDraft, description: event.target.value })} /></label>
            {!!portfolio.length && <div className="sm:col-span-2 rounded-xl bg-canvas p-4"><p className="text-xs font-bold">Saved portfolio items</p>{portfolio.map((item) => <p key={item.id} className="mt-1 text-sm text-muted">{item.title}</p>)}</div>}
            <p className="text-xs leading-5 text-muted sm:col-span-2">External video links are saved as links;  does not download social-media videos.</p>
          </div>}

          {step === 4 && <div className="mt-6 space-y-4">
            {isOrganizer ? <div className="rounded-2xl bg-canvas p-5">
              <div className="flex items-center gap-4">{organizationForm.logoUrl && <img src={organizationForm.logoUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />}<div><p className="eyebrow">{organizationForm.type}</p><h3 className="mt-1 text-xl font-black">{organizationForm.name}</h3></div></div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{organizationForm.description}</p>
              <p className="mt-3 text-sm">{organizationForm.city}, {organizationForm.country}</p>
              <p className="mt-1 text-sm text-muted">{organizationForm.email || user.email} · {organizationForm.phone}</p>
              <p className="mt-1 text-sm text-muted">{organizationForm.website}</p>
              <p className="mt-3 text-sm">Owner: {user.fullName} · {organizationForm.ownerTitle}</p>
            </div> : <div className="rounded-2xl bg-canvas p-5">
              <div className="flex items-center gap-4">{personal.avatarUrl && <img src={personal.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />}<div><h3 className="text-xl font-black">{personal.fullName}</h3><p className="text-sm text-muted">{personal.city}, {personal.country}</p></div></div>
              <p className="mt-4 text-sm text-muted">{user.email} · {personal.phone}</p>
              <p className="mt-4 text-sm font-bold">{selectedProfessions.map((id) => professions.find((item) => item.id === id)?.name).filter(Boolean).join(', ')}</p>
              <p className="mt-2 text-sm text-muted">{[...selectedGenres.map((id) => genres.find((item) => item.id === id)?.name), professional.customGenres].filter(Boolean).join(', ')}</p>
              <p className="mt-2 text-sm text-muted">{selectedInstruments.map((id) => instruments.find((item) => item.id === id)?.name).filter(Boolean).join(', ')}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{professional.biography}</p>
              {!!portfolio.length && <p className="mt-3 text-sm text-muted">Portfolio: {portfolio.map((item) => item.title).join(', ')}</p>}
              {!!portfolioDraft.title && <p className="mt-2 text-sm text-muted">New portfolio item: {portfolioDraft.title}</p>}
            </div>}
            <p className="text-sm leading-6 text-muted">Review your details, use Back to make changes, then complete setup to enter the shared  community.</p>
          </div>}

          <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            <button type="button" disabled={busy || step === 1} onClick={() => void goBack()} className="btn-secondary"><ArrowLeft size={15} /> Back</button>
            {step < 4
              ? <button disabled={busy || uploading} className="btn-primary">{busy ? 'Saving…' : 'Save and continue'} <ArrowRight size={15} /></button>
              : <button disabled={busy} className="btn-primary">{busy ? 'Completing setup…' : isOrganizer ? 'Create Organization & Enter Community' : 'Complete Profile & Enter Community'} <ArrowRight size={15} /></button>}
          </div>
        </form>
      )}
    </section>
  );
}
