'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight, AudioLines, BriefcaseBusiness, Building2, CalendarDays, Check,
  ChevronRight, Church, HeartHandshake, Menu, Mic2, Music2, UsersRound, X,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { api } from '@/lib/api';
import styles from './landing-page.module.css';

type Musician = {
  id: string;
  stageName?: string | null;
  headline?: string | null;
  city?: string | null;
  country?: string | null;
  customGenres: string[];
  user: {
    fullName: string;
    username: string;
    avatarUrl?: string | null;
    professions: Array<{ profession: { name: string } }>;
    instruments: Array<{ instrument: { name: string } }>;
  };
};

type Organization = {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  location?: string | null;
  city?: string | null;
};

type MusicGroup = {
  id: string;
  name: string;
  description?: string | null;
  type?: string | null;
  community?: { name: string } | null;
};

type Opportunity = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  eventDate?: string | null;
  deadline?: string | null;
  createdAt: string;
  organization?: { id: string; name: string; logoUrl?: string | null; location?: string | null } | null;
  organizer: { fullName: string };
};

type LandingContent = {
  statistics: {
    publicMusicians: number;
    publicOrganizations: number;
    publicGroups: number;
    activeOpportunities: number;
  };
  musicians: Musician[];
  organizations: Organization[];
  groups: MusicGroup[];
  opportunities: Opportunity[];
};

const navigation = [
  { label: 'Home', href: '#top' },
  { label: 'Discover Musicians', href: '#musicians' },
  { label: 'Organizations', href: '#organizations' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Events', href: '#events' },
  { label: 'About Us', href: '#about' },
];

const audience = [
  {
    icon: Mic2,
    title: 'Musicians',
    roles: 'Singers · instrumentalists · producers · DJs · sound engineers',
    description: 'Build your professional identity, showcase your talent, connect with other musicians and discover opportunities.',
    action: 'Join as a musician',
    href: '/register',
  },
  {
    icon: UsersRound,
    title: 'Groups and music teams',
    roles: 'Choirs · bands · worship teams · orchestras · collectives',
    description: 'Build your group’s presence, connect with members and discover opportunities to perform and collaborate.',
    action: 'Explore music groups',
    href: '#groups',
  },
  {
    icon: CalendarDays,
    title: 'Event organizers',
    roles: 'Concerts · festivals · promoters · planners · conferences',
    description: 'Discover performers, publish opportunities and connect with music professionals.',
    action: 'Join as an organizer',
    href: '/register',
  },
  {
    icon: Church,
    title: 'Churches and ministries',
    roles: 'Churches · worship departments · ministries · choirs',
    description: 'Connect with musicians, worship teams and music professionals for your activities.',
    action: 'Explore organizations',
    href: '#organizations',
  },
  {
    icon: Building2,
    title: 'Music businesses',
    roles: 'Studios · schools · retailers · audio and equipment services',
    description: 'Showcase your organization, reach music professionals and build valuable business relationships.',
    action: 'Explore businesses',
    href: '#organizations',
  },
];

const features = [
  { icon: Mic2, title: 'Professional profiles', description: 'Showcase your professional identity, instruments, genres, experience and portfolio.' },
  { icon: AudioLines, title: 'Music community', description: 'Share updates, discuss projects and build relationships with music professionals.' },
  { icon: UsersRound, title: 'Discover talent', description: 'Explore public musician profiles, groups and organizations across the hub.' },
  { icon: BriefcaseBusiness, title: 'Music opportunities', description: 'Find current gigs, auditions, recruitment and collaboration opportunities.' },
  { icon: Music2, title: 'Groups and collaboration', description: 'Create or join music groups and develop projects together.' },
  { icon: HeartHandshake, title: 'Direct communication', description: 'Connect and continue conversations using the platform’s messaging tools.' },
];

function locationLabel(city?: string | null, country?: string | null) {
  return [city, country].filter(Boolean).join(', ');
}

function dateLabel(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-RW', { dateStyle: 'medium' }).format(date);
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cbd8cc] bg-white/70 px-6 py-10 text-center">
      <p className="mx-auto max-w-xl text-sm leading-6 text-muted">{children}</p>
      <Link href="/register" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-forest">
        Join  <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{description}</p>}
    </div>
  );
}

export function LandingPage() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function loadContent() {
    setLoading(true);
    setError('');
    try {
      const result = await api<LandingContent>('/public/landing-page');
      setContent(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Community content could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  const hasStatistics = content && Object.values(content.statistics).some((value) => value > 0);

  return (
    <main id="top" className="page-shell overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-[#e7ece5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Main navigation" className="hidden items-center gap-5 xl:flex">
            {navigation.map(({ label, href }) => (
              <a key={label} href={href} className="text-xs font-bold text-muted transition hover:text-forest">{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-forest hover:bg-[#f1f5f0]">Sign In</Link>
            <Link href="/register" className={`${styles.primary} px-4 py-2.5 text-sm`}>Join the Community <ArrowRight size={15} /></Link>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-forest hover:bg-[#f1f5f0] xl:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-primary-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div id="mobile-primary-navigation" className="border-t border-line bg-white px-4 pb-4 pt-2 xl:hidden">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {navigation.map(({ label, href }) => (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink hover:bg-canvas">{label}</a>
              ))}
            </nav>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="btn-secondary py-2.5 text-sm">Sign In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} className={`${styles.primary} py-2.5 text-sm`}>Join the Community</Link>
            </div>
          </div>
        )}
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7d7] bg-white px-3 py-2 text-[11px] font-extrabold tracking-[0.13em] text-forest">
            <span className="h-2 w-2 rounded-full bg-[#79a868]" /> 
          </span>
          <h1 className="mt-6 max-w-2xl text-[clamp(2.8rem,8vw,5.2rem)] font-black leading-[0.99] tracking-[-0.06em] text-ink">
            Where Rwanda&apos;s Music Industry <span className="text-forest">Connects.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Discover musicians, connect with music professionals, find opportunities and build meaningful relationships across Rwanda&apos;s music industry.
          </p>
          <p className="mt-3 text-sm font-extrabold text-forest">One community. Endless possibilities.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={`${styles.primary} px-6 py-3.5 text-sm`}>Join the Community <ArrowRight size={17} /></Link>
            <a href="#musicians" className="btn-secondary px-6 py-3.5 text-sm">Explore Musicians <ChevronRight size={17} /></a>
          </div>
          <p className="mt-4 text-xs text-muted">Free to join during our launch period.</p>
          {hasStatistics && (
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#dfe7dd] pt-5">
              {content.statistics.publicMusicians > 0 && <p className="text-xs text-muted"><strong className="text-lg text-ink">{content.statistics.publicMusicians}</strong><br />public musicians</p>}
              {content.statistics.publicOrganizations > 0 && <p className="text-xs text-muted"><strong className="text-lg text-ink">{content.statistics.publicOrganizations}</strong><br />organizations</p>}
              {content.statistics.activeOpportunities > 0 && <p className="text-xs text-muted"><strong className="text-lg text-ink">{content.statistics.activeOpportunities}</strong><br />open opportunities</p>}
            </div>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-[590px]">
          <div className="relative aspect-[1.05/1] overflow-hidden rounded-[1.6rem] bg-[#dbe5d9] shadow-[0_30px_90px_rgba(16,72,50,0.18)] sm:rounded-[2rem]">
            <Image
              src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1400&q=85"
              alt="Singer performing with a microphone on stage"
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#092d20]/75 via-transparent to-[#092d20]/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c5e87a]">Connect · Collaborate · Grow</p>
              <p className="mt-3 max-w-md text-2xl font-black leading-tight sm:text-3xl">A stronger network for Rwanda&apos;s music community.</p>
            </div>
            <span className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#c5e87a] text-forest shadow-lg sm:right-6 sm:top-6 sm:h-14 sm:w-14">
              <AudioLines size={25} />
            </span>
          </div>
        </div>
      </section>

      <section id="audience" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Who we bring together" title="Built for Everyone in the Music Industry." description="Wherever you contribute to music, find the people and opportunities that help your work move forward." />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {audience.map(({ icon: Icon, title, roles, description, action, href }) => (
              <article key={title} className="card flex flex-col p-5 sm:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest"><Icon size={21} /></span>
                <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-[#6b8175]">{roles}</p>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{description}</p>
                <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-forest">
                  {action} <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <SectionHeading eyebrow="The hub brings it together" title="Everything You Need to Connect, Discover and Grow." description="Tools already available on  help music professionals find one another and work together." />
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="card p-5 sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest"><Icon size={21} /></span>
              <h3 className="mt-5 font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="musicians" className="bg-[#eef3ec] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading eyebrow="Real people, real profiles" title="Meet the People Behind Rwanda's Music Industry." description="A snapshot of public musicians who have completed their profiles and chosen to be discovered." />
            <Link href="/app/discover" className="inline-flex items-center gap-2 text-sm font-extrabold text-forest">Discover more <ArrowRight size={16} /></Link>
          </div>
          {error && (
            <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#efcaca] bg-white p-4 text-sm text-[#842a2a]">
              <p>{error}</p>
              <button onClick={() => void loadContent()} className="font-bold underline">Try again</button>
            </div>
          )}
          {loading && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading public musicians">{[1, 2, 3].map((item) => <div key={item} className="card h-52 animate-pulse bg-white/70" />)}</div>}
          {!loading && content && (content.musicians.length ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.musicians.map((musician) => {
                const name = musician.stageName || musician.user.fullName;
                const professions = musician.user.professions.map(({ profession }) => profession.name);
                const instruments = musician.user.instruments.map(({ instrument }) => instrument.name);
                const genres = musician.customGenres;
                return (
                  <article key={musician.id} className="card p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      {musician.user.avatarUrl ? (
                        <Image src={musician.user.avatarUrl} alt={`${name} profile`} width={52} height={52} unoptimized className="h-[52px] w-[52px] rounded-full object-cover" />
                      ) : (
                        <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#dce9d5] text-sm font-extrabold text-forest">{initials(name)}</span>
                      )}
                      <div className="min-w-0">
                        <h3 className="truncate font-extrabold">{name}</h3>
                        <p className="truncate text-xs text-muted">{musician.headline || professions.join(' · ') || 'Music professional'}</p>
                      </div>
                    </div>
                    {locationLabel(musician.city, musician.country) && <p className="mt-4 text-xs text-muted">{locationLabel(musician.city, musician.country)}</p>}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[...instruments, ...genres].slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-[#f2f5f1] px-2.5 py-1 text-[10px] font-semibold text-muted">{tag}</span>)}
                      {professions.slice(0, 2).map((profession) => <span key={profession} className="rounded-full bg-[#f2f5f1] px-2.5 py-1 text-[10px] font-semibold text-muted">{profession}</span>)}
                    </div>
                    <Link href="/app/discover" className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-forest">View public musicians <ArrowRight size={13} /></Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-8"><EmptyState>No public musician profiles are available to feature yet. Join  and create a discoverable profile.</EmptyState></div>
          ))}
        </div>
      </section>

      <section id="organizations" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHeading eyebrow="Organizations" title="Find the Teams and Businesses Shaping Music." description="Explore published organizations that are active on ." />
          <Link href="/app/organizations" className="inline-flex items-center gap-2 text-sm font-extrabold text-forest">Explore organizations <ArrowRight size={16} /></Link>
        </div>
        {loading && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading organizations">{[1, 2, 3, 4].map((item) => <div key={item} className="card h-48 animate-pulse" />)}</div>}
        {!loading && content && (content.organizations.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.organizations.map((organization) => (
              <article key={organization.id} className="card p-5">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[#edf4eb] text-forest">
                  {organization.logoUrl ? <Image src={organization.logoUrl} alt={`${organization.name} logo`} width={48} height={48} unoptimized className="h-full w-full object-cover" /> : <Building2 size={22} />}
                </div>
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-[#698576]">{organization.type || 'Music organization'}</p>
                <h3 className="mt-1 font-extrabold">{organization.name}</h3>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{organization.description || 'A published organization in Rwanda’s music industry.'}</p>
                {(organization.location || organization.city) && <p className="mt-3 text-xs text-muted">{organization.location || organization.city}</p>}
                <Link href="/app/organizations" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-forest">View organizations <ArrowRight size={13} /></Link>
              </article>
            ))}
          </div>
        ) : <div className="mt-8"><EmptyState>No published organizations are featured yet. Join the community and bring your organization to the hub.</EmptyState></div>)}
      </section>

      <section id="groups" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHeading eyebrow="Groups and music teams" title="Make Something Together." description="Discover groups in the public music community and find collaborators for your next project." />
            <Link href="/app/groups" className="inline-flex items-center gap-2 text-sm font-extrabold text-forest">Explore groups <ArrowRight size={16} /></Link>
          </div>
          {loading && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading groups">{[1, 2, 3, 4].map((item) => <div key={item} className="card h-40 animate-pulse" />)}</div>}
          {!loading && content && (content.groups.length ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {content.groups.map((group) => (
                <article key={group.id} className="card p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf4eb] text-forest"><UsersRound size={20} /></span>
                  <p className="mt-4 text-[10px] font-extrabold uppercase tracking-wider text-[#698576]">{group.type || 'Music group'}</p>
                  <h3 className="mt-1 font-extrabold">{group.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted">{group.description || 'A music group in the public community.'}</p>
                  <Link href="/app/groups" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-forest">Explore groups <ArrowRight size={13} /></Link>
                </article>
              ))}
            </div>
          ) : <div className="mt-8"><EmptyState>No public music groups are available to feature yet. Start a group and invite collaborators.</EmptyState></div>)}
        </div>
      </section>

      <section id="opportunities" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <SectionHeading eyebrow="Gigs, auditions and collaborations" title="Opportunities Are Waiting." description="Current opportunities are listed by organizers and organizations on the platform." />
          <Link href="/app/opportunities" className="inline-flex items-center gap-2 text-sm font-extrabold text-forest">Explore opportunities <ArrowRight size={16} /></Link>
        </div>
        {loading && <div className="mt-8 space-y-3" aria-label="Loading opportunities">{[1, 2, 3].map((item) => <div key={item} className="card h-32 animate-pulse" />)}</div>}
        {!loading && content && (content.opportunities.length ? (
          <div className="mt-8 space-y-3">
            {content.opportunities.map((opportunity) => {
              const published = dateLabel(opportunity.createdAt);
              const deadline = dateLabel(opportunity.deadline);
              const eventDate = dateLabel(opportunity.eventDate);
              return (
                <article key={opportunity.id} className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#edf4eb] text-forest">
                      {opportunity.organization?.logoUrl ? <Image src={opportunity.organization.logoUrl} alt="" width={48} height={48} unoptimized className="h-full w-full rounded-xl object-cover" /> : <BriefcaseBusiness size={21} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-extrabold">{opportunity.title}</h3>
                      <p className="mt-1 text-xs text-muted">Posted by {opportunity.organization?.name || opportunity.organizer.fullName}</p>
                      {opportunity.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{opportunity.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                        {(opportunity.location || opportunity.organization?.location) && <span>{opportunity.location || opportunity.organization?.location}</span>}
                        {eventDate && <span>Opportunity date: {eventDate}</span>}
                        {deadline && <span>Apply by: {deadline}</span>}
                        {published && <span>Published: {published}</span>}
                      </div>
                    </div>
                  </div>
                  <Link href={`/app/opportunities/${opportunity.id}`} className="btn-secondary shrink-0 px-4 py-2.5 text-xs">View details <ArrowRight size={14} /></Link>
                </article>
              );
            })}
          </div>
        ) : <div className="mt-8"><EmptyState>No opportunities published yet. Join the community and be among the first to discover new opportunities.</EmptyState></div>)}
      </section>

      <section id="events" className="bg-[#eef3ec] py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <SectionHeading eyebrow="Events" title="What's Happening in Rwanda's Music Scene?" description="Event listings will appear here when the platform supports public event publishing." />
            <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">The current platform does not yet include a public events feature, so there are no event listings to show.</p>
          </div>
          <Link href="/register" className={`${styles.primary} w-fit px-5 py-3 text-sm`}>Join the Community <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
          <SectionHeading eyebrow="Why join ?" title="Your Talent Deserves to Be Discovered." description="A community for building visibility, finding opportunities and growing professional relationships." />
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              ['Visibility', 'Build your professional identity and let the industry discover your work.'],
              ['Opportunities', 'Find performances, auditions, collaborations and recruitment opportunities.'],
              ['Connections', 'Meet musicians, organizers, churches, studios and other professionals.'],
              ['Growth', 'Develop your music career and professional relationships.'],
            ].map(([title, description]) => (
              <div key={title} className="flex gap-3">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#edf4eb] text-forest"><Check size={15} /></span>
                <div><h3 className="text-sm font-extrabold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 rounded-2xl border border-line bg-white px-5 py-7 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="eyebrow">How it works</p><h2 className="mt-2 text-2xl font-black tracking-tight">Four steps to a stronger network.</h2></div>
            <Link href="/register" className={`${styles.primary} px-5 py-3 text-sm`}>Get Started Today <ArrowRight size={16} /></Link>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['01', 'Join', 'Create an account as a musician or event organizer.'],
              ['02', 'Build your profile', 'Showcase your identity, skills, experience and organization.'],
              ['03', 'Discover', 'Explore musicians, groups, organizations and opportunities.'],
              ['04', 'Connect and grow', 'Communicate, apply, collaborate and develop relationships.'],
            ].map(([number, title, description]) => (
              <div key={number} className="border-t-2 border-[#b7d19e] pt-4">
                <p className="text-xs font-extrabold text-forest">{number}</p>
                <h3 className="mt-2 font-extrabold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-4 mb-10 overflow-hidden rounded-[1.5rem] bg-[#104832] px-5 py-10 text-white sm:mx-6 sm:rounded-[2rem] sm:px-8 sm:py-14 lg:mx-auto lg:max-w-7xl lg:px-14">
        <div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#c5e87a]">Connect · Collaborate · Grow</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">Your Music Journey Deserves a Bigger Network.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Become part of a connected music industry where talent meets opportunity and professionals grow together.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c5e87a] px-5 py-3 text-sm font-extrabold text-[#104832]">Join  <ArrowRight size={16} /></Link>
            <a href="#musicians" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white hover:bg-white/10">Explore the Community <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e2e8e0] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
          <div>
            <Brand />
            <p className="mt-3 text-sm text-muted">Connect · Collaborate · Grow</p>
            <p className="mt-5 text-xs font-bold text-[#3d574a]">Powered by DCINTELIX</p>
            <p className="mt-1 text-[10px] font-extrabold tracking-[0.14em] text-muted">INNOVATE · BUILD · GROW.</p>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink">Explore</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted">
              <a href="#musicians" className="hover:text-forest">Discover Musicians</a>
              <a href="#organizations" className="hover:text-forest">Organizations</a>
              <a href="#opportunities" className="hover:text-forest">Opportunities</a>
              <a href="#events" className="hover:text-forest">Events</a>
              <Link href="/app/community" className="hover:text-forest">Community</Link>
            </div>
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink">Platform</h2>
            <div className="mt-3 grid gap-2 text-sm text-muted">
              <a href="#about" className="hover:text-forest">About Us</a>
              <Link href="/register" className="hover:text-forest">Join the Community</Link>
              <Link href="/login" className="hover:text-forest">Sign In</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#e9ede8] px-4 py-4 text-center text-xs text-muted">© {new Date().getFullYear()} </div>
      </footer>
    </main>
  );
}
