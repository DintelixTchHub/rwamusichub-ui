'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Compass, Guitar, MapPin, Mic2, Music2, Search, UserRoundPlus, UserRoundCheck, UsersRound } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

type CatalogItem = { id: string; name: string; category?: string | null; description?: string | null };
type Musician = {
  id: string;
  stageName?: string | null;
  headline?: string | null;
  city?: string | null;
  bookingPreference: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    professions: Array<{ profession: CatalogItem }>;
    instruments: Array<{ instrument: CatalogItem }>;
    genres: Array<{ genre: CatalogItem }>;
  };
};

export default function DiscoverPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [professions, setProfessions] = useState<CatalogItem[]>([]);
  const [instruments, setInstruments] = useState<CatalogItem[]>([]);
  const [genres, setGenres] = useState<CatalogItem[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [busyUserId, setBusyUserId] = useState('');
  const [messagingUserId, setMessagingUserId] = useState('');
  const [searchingMusicians, setSearchingMusicians] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get('q') ?? '');
  }, []);

  useEffect(() => {
    Promise.all([
      api<CatalogItem[]>('/professions'),
      api<CatalogItem[]>('/instruments'),
      api<CatalogItem[]>('/genres'),
      api<Array<{ following: { id: string } }>>('/users/me/following'),
    ])
      .then(([professionList, instrumentList, genreList, following]) => {
        setProfessions(professionList);
        setInstruments(instrumentList);
        setGenres(genreList);
        setFollowingIds(following.map(({ following: person }) => person.id));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load discovery catalogs.'));
  }, []);

  useEffect(() => {
    let active = true;
    setSearchingMusicians(true);
    const timer = window.setTimeout(() => {
      api<Musician[]>(`/profiles${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
        .then((results) => { if (active) setMusicians(results); })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : 'Could not search musician profiles.');
        })
        .finally(() => { if (active) setSearchingMusicians(false); });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function messageMusician(userId: string) {
    setMessagingUserId(userId);
    setError('');
    try {
      const conversation = await api<{ id: string }>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId }),
      });
      router.push(`/app/messages?conversationId=${encodeURIComponent(conversation.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start a conversation.');
    } finally {
      setMessagingUserId('');
    }
  }

  async function toggleFollow(userId: string) {
    const following = followingIds.includes(userId);
    setBusyUserId(userId);
    try {
      await api(`/users/${userId}/follow`, { method: following ? 'DELETE' : 'POST' });
      setFollowingIds((current) => following
        ? current.filter((id) => id !== userId)
        : [...current, userId]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this connection.');
    } finally {
      setBusyUserId('');
    }
  }

  const filter = (items: CatalogItem[]) => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const groups = [
    { title: 'Professions', description: 'Explore roles across the music industry.', icon: Mic2, items: filter(professions) },
    { title: 'Instruments', description: 'Find the sound and skills you need.', icon: Guitar, items: filter(instruments) },
    { title: 'Genres', description: 'Connect through the music you love.', icon: Music2, items: filter(genres) },
  ];

  return (
    <section>
      <p className="eyebrow">Find your next connection</p><h1 className="mt-2 text-3xl font-black tracking-tight">Discover the music scene</h1><p className="mt-2 text-sm text-muted">Explore music roles, instruments and sounds represented across the hub.</p>
      <div className="mt-6 flex max-w-xl items-center gap-3 rounded-xl border border-line bg-white px-4"><Search size={18} className="text-muted" /><input className="h-12 flex-1 bg-transparent text-sm outline-none" placeholder="Search professions, instruments, genres…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <section className="mt-8">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb] text-forest"><UsersRound size={19} /></span><div><h2 className="font-extrabold">Musicians</h2><p className="text-xs text-muted">Public professional profiles in the hub.</p></div></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {musicians.map((musician) => <article key={musician.id} className="card p-5">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime font-extrabold text-forest">{musician.user.fullName[0]}</span><div className="min-w-0 flex-1"><h3 className="truncate font-extrabold">{musician.stageName || musician.user.fullName}</h3><p className="truncate text-xs text-muted">@{musician.user.username}{musician.city ? ` · ${musician.city}` : ''}</p></div><span className="rounded-full bg-[#edf4eb] px-2.5 py-1 text-[10px] font-bold text-forest">{musician.bookingPreference === 'OpenToBooking' ? 'BOOKABLE' : musician.bookingPreference === 'InquireFirst' ? 'INQUIRE' : 'UNAVAILABLE'}</span></div>
            <p className="mt-3 text-sm text-muted">{musician.headline || musician.user.professions.map(({ profession }) => profession.name).join(' · ') || 'Music professional'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{[...musician.user.instruments.map(({ instrument }) => instrument.name), ...musician.user.genres.map(({ genre }) => genre.name)].slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-canvas px-2.5 py-1 text-[10px] font-semibold text-muted">{tag}</span>)}</div>
            {musician.city && <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted"><MapPin size={13} />{musician.city}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button onClick={() => void toggleFollow(musician.user.id)} disabled={busyUserId === musician.user.id} className="inline-flex items-center gap-1 text-xs font-extrabold text-forest">
                {followingIds.includes(musician.user.id) ? <UserRoundCheck size={14} /> : <UserRoundPlus size={14} />}
                {busyUserId === musician.user.id ? 'Saving…' : followingIds.includes(musician.user.id) ? 'Following' : 'Follow'}
              </button>
              <button onClick={() => void messageMusician(musician.user.id)} disabled={Boolean(messagingUserId)} className="inline-flex items-center gap-1 text-xs font-extrabold text-forest disabled:opacity-60">{messagingUserId === musician.user.id ? 'Opening chat…' : 'Start a conversation'} <ArrowUpRight size={14} /></button>
            </div>
          </article>)}
        </div>
        {searchingMusicians && <p className="mt-3 text-sm text-muted">Searching musician profiles…</p>}
        {!searchingMusicians && musicians.length === 0 && <p className="mt-3 text-sm text-muted">{query ? 'No public musician profiles match this search.' : 'No public musician profiles are available yet.'}</p>}
      </section>
      <div className="mt-8 space-y-8">{groups.map(({ title, description, icon: Icon, items }) => <section key={title}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb] text-forest"><Icon size={19} /></span><div><h2 className="font-extrabold">{title}</h2><p className="text-xs text-muted">{description}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <span key={item.id} title={item.description ?? undefined} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold">{item.name}{item.category && <span className="ml-2 text-xs font-normal text-muted">{item.category}</span>}</span>)}</div>{items.length === 0 && <p className="mt-3 text-sm text-muted">{query ? 'No matching items.' : 'No items are available yet.'}</p>}</section>)}</div>
      <div className="card mt-9 flex items-start gap-4 bg-forest p-5 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-forest"><UsersRound size={20} /></span><div><h2 className="font-extrabold">Make your talent discoverable</h2><p className="mt-1 text-sm text-white/70">Complete your musician profile and add your skills so the right people can find you.</p><a href="/app/profile" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-lime"><Compass size={15} /> Build your profile</a></div></div>
    </section>
  );
}
