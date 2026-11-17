'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Bell, BriefcaseBusiness, Compass, Home, LogOut, Menu, MessageCircle,
  Bookmark, Music2, Search, Settings, UserRoundPlus, Users, X,
} from 'lucide-react';
import { Brand } from './brand';
import { api, clearSession, getAccessToken, SOCKET_URL } from '@/lib/api';
import { User } from '@/lib/types';

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/discover', label: 'Discover', icon: Compass },
  { href: '/app/connections', label: 'Connections', icon: UserRoundPlus },
  { href: '/app/community', label: 'Community', icon: Users },
  { href: '/app/organizations', label: 'Organizations', icon: Music2 },
  { href: '/app/opportunities', label: 'Opportunities', icon: BriefcaseBusiness },
  { href: '/app/saved', label: 'Saved', icon: Bookmark },
  { href: '/app/messages', label: 'Messages', icon: MessageCircle },
  { href: '/app/groups', label: 'Groups & orgs', icon: Music2 },
  { href: '/app/profile', label: 'My profile', icon: Settings },
];

const mobilePrimaryHrefs = ['/app', '/app/discover', '/app/community', '/app/messages'];
const mobilePrimaryItems = navItems.filter(({ href }) => mobilePrimaryHrefs.includes(href));
const mobileMoreItems = navItems.filter(({ href }) => !mobilePrimaryHrefs.includes(href));

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setAuthReady(false);
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setAuthError('');
    try {
      const saved = window.localStorage.getItem('rmh.user');
      if (saved) setUser(JSON.parse(saved));
    } catch {
      window.localStorage.removeItem('rmh.user');
    }
    let active = true;
    api<User>('/auth/me').then((currentUser) => {
      if (!active) return;
      setUser(currentUser);
      window.localStorage.setItem('rmh.user', JSON.stringify(currentUser));
      if (!currentUser.onboardingCompleted && pathname !== '/app/onboarding') {
        router.replace('/app/onboarding');
        return;
      } else if (currentUser.onboardingCompleted && pathname === '/app/onboarding') {
        router.replace('/app');
        return;
      }
      setAuthReady(true);
    }).catch((reason: unknown) => {
      console.error('Could not load the current account.', reason);
      if (active) {
        setAuthError(reason instanceof Error ? reason.message : 'Could not verify your account.');
        setAuthReady(true);
      }
    });
    return () => { active = false; };
  }, [pathname, router]);

  const refreshUnreadCount = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const result = await api<{ unreadCount: number }>('/notifications/unread-count');
      setUnreadCount(result.unreadCount);
    } catch (reason) {
      console.error('Could not refresh the unread notification count.', reason);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(1174, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.31);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      if (!window.AudioContext) return;
      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      if (context.state === 'suspended') {
        void context.resume().catch((reason: unknown) => {
          console.warn('Could not enable message notification sounds.', reason);
        });
      }
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('pointerdown', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    return () => {
      document.removeEventListener('pointerdown', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      if (context && context.state !== 'closed') {
        void context.close().catch((reason: unknown) => {
          console.warn('Could not close the message notification audio context.', reason);
        });
      }
    };
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [pathname, refreshUnreadCount]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    const onNotificationsChanged = () => void refreshUnreadCount();
    socket.on('connect', onNotificationsChanged);
    socket.on('notification:new', (notification: { type?: string }) => {
      if (notification.type === 'NewMessage') playNotificationSound();
      void refreshUnreadCount();
    });
    window.addEventListener('rmh:notifications-changed', onNotificationsChanged);

    return () => {
      window.removeEventListener('rmh:notifications-changed', onNotificationsChanged);
      socket.disconnect();
    };
  }, [playNotificationSound, refreshUnreadCount]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => {
      window.removeEventListener('keydown', handleSearchShortcut);
    };
  }, []);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [moreOpen]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const signOut = () => {
    clearSession();
    router.replace('/login');
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = globalSearch.trim();
    router.push(query ? `/app/discover?q=${encodeURIComponent(query)}` : '/app/discover');
  };

  const unreadBadge = unreadCount > 9 ? '9+' : unreadCount;
  const moreActive = mobileMoreItems.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-line bg-white px-3 py-4 sm:px-5 sm:py-6">
      <div className="flex items-center justify-between">
        <Brand href="/app" />
      </div>
      <div className="mt-6 sm:mt-10">
        <p className="eyebrow mb-3 px-2 sm:px-3">Workspace</p>
        <nav className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-xl px-2 py-2.5 text-[0.84rem] font-semibold transition sm:gap-3 sm:px-3 sm:py-3 sm:text-sm ${active ? 'bg-forest text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}
              >
                <Icon size={17} className="shrink-0" />
                {label}
                {href === '/app/messages' && unreadCount > 0 && <span aria-label={`${unreadCount} unread messages`} className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{unreadBadge}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto rounded-2xl bg-[#f3f7ed] p-3 sm:p-4">
        <p className="text-sm font-bold">Make your talent visible</p>
        <p className="mt-1 text-xs leading-5 text-muted">Complete your professional profile to get discovered for your next opportunity.</p>
        <Link className="mt-3 inline-block text-xs font-extrabold text-forest" href="/app/profile">Complete profile →</Link>
      </div>
    </aside>
  );

  return (
    !authReady || authError ? (
      <main className="grid min-h-screen place-items-center bg-canvas p-6">
        <section className="card w-full max-w-md p-6 text-center">
          {authError
            ? <><h1 className="text-lg font-extrabold">Could not verify your account</h1><p className="mt-2 text-sm text-muted">{authError}</p><button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5">Try again</button></>
            : <p className="text-sm font-semibold text-muted">Checking your account…</p>}
        </section>
      </main>
    ) : (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <div className="hidden w-[260px] shrink-0 lg:block">{sidebar}</div>
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-3 backdrop-blur md:h-[76px] md:px-8">
            <div className="flex items-center gap-3">
              <form onSubmit={submitSearch} className="hidden items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 md:flex">
                <Search size={17} className="text-muted" />
                <input ref={searchInputRef} aria-label="Search people and music skills" placeholder="Search people, skills..." className="w-64 bg-transparent text-sm outline-none placeholder:text-muted" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} />
                <button type="submit" className="sr-only">Search</button>
                <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px] text-muted">Ctrl K</kbd>
              </form>
              <span className="text-[0.82rem] font-bold md:hidden"></span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Link aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} href="/app/notifications" className="relative rounded-xl p-2.5 text-muted hover:bg-canvas">
                <Bell size={19} />
                {unreadCount > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">{unreadBadge}</span>}
              </Link>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold">{user?.fullName ?? 'Music maker'}</p>
                <p className="text-xs text-muted">@{user?.username ?? 'your-profile'}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-lime font-extrabold text-forest">
                {(user?.fullName ?? 'M').slice(0, 1).toUpperCase()}
              </div>
              <button onClick={signOut} title="Sign out" className="hidden rounded-xl p-2.5 text-muted hover:bg-canvas sm:block"><LogOut size={18} /></button>
            </div>
          </header>
          <div className="platform-content mx-auto w-full max-w-[1320px] px-3 py-5 pb-28 sm:px-4 md:px-8 md:py-9 md:pb-28 lg:pb-9">{children}</div>
        </main>
      </div>
      <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pt-2 backdrop-blur lg:hidden" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto grid max-w-[600px] grid-cols-5">
          {mobilePrimaryItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`relative flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${active ? 'text-forest' : 'text-muted'}`}>
                <span className={`grid h-7 w-12 place-items-center rounded-full ${active ? 'bg-[#edf4eb]' : ''}`}><Icon size={20} /></span>
                <span>{label === 'Discover' ? 'Explore' : label}</span>
                {href === '/app/messages' && unreadCount > 0 && <span aria-label={`${unreadCount} unread messages`} className="absolute right-1/4 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">{unreadBadge}</span>}
              </Link>
            );
          })}
          <button type="button" aria-expanded={moreOpen} aria-controls={moreOpen ? 'mobile-more-menu' : undefined} onClick={() => setMoreOpen((open) => !open)} className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${moreActive || moreOpen ? 'text-forest' : 'text-muted'}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${moreActive || moreOpen ? 'bg-[#edf4eb]' : ''}`}><Menu size={20} /></span>
            <span>More</span>
          </button>
        </div>
      </nav>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close more menu" className="absolute inset-0 bg-ink/35" onClick={() => setMoreOpen(false)} />
          <section id="mobile-more-menu" role="dialog" aria-modal="true" aria-label="More navigation" className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold">More</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more menu" className="rounded-full p-2 text-muted hover:bg-canvas"><X size={18} /></button>
            </div>
            <nav aria-label="More destinations" className="grid grid-cols-3 gap-2">
              {mobileMoreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link key={href} href={href} onClick={() => setMoreOpen(false)} aria-current={active ? 'page' : undefined} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl text-xs font-semibold ${active ? 'bg-[#edf4eb] text-forest' : 'bg-canvas text-muted'}`}>
                    <Icon size={21} />
                    <span className="text-center">{label}</span>
                  </Link>
                );
              })}
            </nav>
            <button type="button" onClick={signOut} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-ink hover:bg-canvas">
              <LogOut size={17} /> Sign out
            </button>
          </section>
        </div>
      )}
    </div>
    )
  );
}
