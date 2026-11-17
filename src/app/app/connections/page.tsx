'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, UserRoundCheck, UserRoundPlus, UsersRound } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

type Connection = {
  id: string;
  createdAt: string;
  following?: User & { profile?: { stageName?: string | null; headline?: string | null; city?: string | null } | null };
  follower?: User & { profile?: { stageName?: string | null; headline?: string | null; city?: string | null } | null };
};

type Tab = 'following' | 'followers';

export default function ConnectionsPage() {
  const [following, setFollowing] = useState<Connection[]>([]);
  const [followers, setFollowers] = useState<Connection[]>([]);
  const [tab, setTab] = useState<Tab>('following');
  const [busyUserId, setBusyUserId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [followingList, followerList] = await Promise.all([
        api<Connection[]>('/users/me/following'),
        api<Connection[]>('/users/me/followers'),
      ]);
      setFollowing(followingList);
      setFollowers(followerList);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load connections.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleFollow(userId: string) {
    const alreadyFollowing = following.some(({ following: person }) => person?.id === userId);
    setBusyUserId(userId);
    try {
      await api(`/users/${userId}/follow`, { method: alreadyFollowing ? 'DELETE' : 'POST' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update connection.');
    } finally {
      setBusyUserId('');
    }
  }

  async function message(userId: string) {
    try {
      const conversation = await api<{ id: string }>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId }),
      });
      window.location.href = `/app/messages?conversationId=${encodeURIComponent(conversation.id)}`;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start a conversation.');
    }
  }

  const connections = tab === 'following' ? following : followers;

  return (
    <section>
      <p className="eyebrow">Build your music network</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Connections</h1>
      <p className="mt-2 text-sm text-muted">Keep up with musicians and see who follows your work.</p>
      <div className="mt-6 flex gap-2">
        <button onClick={() => setTab('following')} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'following' ? 'bg-forest text-white' : 'bg-white text-muted'}`}>Following · {following.length}</button>
        <button onClick={() => setTab('followers')} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'followers' ? 'bg-forest text-white' : 'bg-white text-muted'}`}>Followers · {followers.length}</button>
      </div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {connections.map((connection) => {
          const person = tab === 'following' ? connection.following : connection.follower;
          if (!person) return null;
          const isFollowing = following.some(({ following: followed }) => followed?.id === person.id);
          return <article key={connection.id} className="card flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime font-extrabold text-forest">{person.fullName[0] ?? 'M'}</span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-extrabold">{person.profile?.stageName || person.fullName}</h2>
              <p className="truncate text-xs text-muted">@{person.username}{person.profile?.city ? ` · ${person.profile.city}` : ''}</p>
              {person.profile?.headline && <p className="mt-1 truncate text-xs text-muted">{person.profile.headline}</p>}
            </div>
            <button onClick={() => void toggleFollow(person.id)} disabled={busyUserId === person.id} aria-label={isFollowing ? 'Unfollow musician' : 'Follow musician'} title={isFollowing ? 'Unfollow' : 'Follow'} className="rounded-lg p-2 text-forest hover:bg-canvas">
              {isFollowing ? <UserRoundCheck size={17} /> : <UserRoundPlus size={17} />}
            </button>
            <button onClick={() => void message(person.id)} aria-label="Message musician" title="Message" className="rounded-lg p-2 text-forest hover:bg-canvas"><MessageCircle size={17} /></button>
          </article>;
        })}
      </div>
      {connections.length === 0 && !error && <div className="card mt-5 p-10 text-center"><UsersRound className="mx-auto text-muted" /><h2 className="mt-3 font-extrabold">{tab === 'following' ? 'Start following musicians' : 'Your audience is growing'}</h2><p className="mt-1 text-sm text-muted">{tab === 'following' ? 'Follow artists from Discover to see them here.' : 'When musicians follow you, they will appear here.'}</p><a href="/app/discover" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-forest">Discover musicians <ArrowUpRight size={15} /></a></div>}
    </section>
  );
}
