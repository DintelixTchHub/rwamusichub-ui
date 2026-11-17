'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe2, LockKeyhole, Plus, Users } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Modal } from '@/components/modal';
import { api } from '@/lib/api';

type Community = {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  type: 'Public' | 'Private';
  members?: Array<{ userId: string; status: string }>;
  _count?: { members: number; groups: number };
};
type CommunityMembership = { status: string };

export default function CommunityPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userId, setUserId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'Public' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyCommunityId, setBusyCommunityId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [communityResult, userResult] = await Promise.allSettled([
      api<Community[]>('/communities'),
      api<{ id: string }>('/auth/me'),
    ]);
    const errors: string[] = [];
    if (communityResult.status === 'fulfilled') setCommunities(communityResult.value);
    else errors.push(communityResult.reason instanceof Error ? communityResult.reason.message : 'Could not load communities.');
    if (userResult.status === 'fulfilled') setUserId(userResult.value.id);
    else errors.push(userResult.reason instanceof Error ? userResult.reason.message : 'Could not load your account.');
    setError(errors.join(' '));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/communities', { method: 'POST', body: JSON.stringify({ ...form, name: form.name.trim(), description: form.description.trim() || undefined }) });
      setForm({ name: '', description: '', type: 'Public' });
      setFormOpen(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create community.');
    } finally {
      setBusy(false);
    }
  }

  async function join(community: Community) {
    const active = community.members?.some((member) => member.userId === userId && member.status === 'Active') ?? false;
    setBusyCommunityId(community.id);
    setError('');
    try {
      const membership = await api<CommunityMembership>(`/communities/${community.id}/${active ? 'leave' : 'join'}`, { method: 'POST' });
      setCommunities((current) => current.map((item) => {
        if (item.id !== community.id) return item;
        const remaining = (item.members ?? []).filter((entry) => entry.userId !== userId);
        return {
          ...item,
          members: active ? remaining : [...remaining, { userId, status: membership.status }],
          _count: {
            members: Math.max(0, (item._count?.members ?? 0) + (membership.status === 'Active' ? active ? -1 : 1 : 0)),
            groups: item._count?.groups ?? 0,
          },
        };
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not ${active ? 'leave' : 'join'} community.`);
    } finally {
      setBusyCommunityId('');
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Find your people</p><h1 className="mt-2 text-3xl font-black tracking-tight">Music communities</h1><p className="mt-2 text-sm text-muted">Spaces to share knowledge, build connections and make music together.</p></div>
        <button onClick={() => setFormOpen(true)} className="btn-primary"><Plus size={17} /> Start a community</button>
      </div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {formOpen && <Modal title="Start a community" onClose={() => setFormOpen(false)}>
        <form onSubmit={create} className="space-y-4">
          {error && <Notice>{error}</Notice>}
          <label className="block text-xs font-bold">Name<input required maxLength={100} className="field mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="block text-xs font-bold">Description<textarea maxLength={2000} rows={4} className="field mt-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label className="block text-xs font-bold">Access<select className="field mt-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="Public">Public</option><option value="Private">Private</option></select></label>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create community'}</button></div>
        </form>
      </Modal>}
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {communities.map((community) => (
          <article key={community.id} className="card p-5">
            <div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><Users size={20} /></span><span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold text-muted">{community.type === 'Private' ? <LockKeyhole size={12} /> : <Globe2 size={12} />}{community.type}</span></div>
            <h2 className="mt-5 text-lg font-extrabold"><Link href={`/app/community/${community.id}`} className="hover:text-forest">{community.name}</Link></h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{community.description || 'Connect and collaborate with people who share your passion for music.'}</p>
            <div className="mt-5 flex items-center justify-between gap-2 border-t border-line pt-4"><span className="text-xs text-muted">{community._count?.members ?? 0} members</span>{community.ownerId === userId ? <span className="text-xs font-bold text-forest">Your community</span> : (() => {
              const membership = community.members?.find((member) => member.userId === userId);
              const label = busyCommunityId === community.id ? 'Please wait…' : membership?.status === 'Pending' ? 'Request pending' : membership?.status === 'Active' ? 'Leave' : 'Join community';
              return <button type="button" disabled={Boolean(busyCommunityId) || membership?.status === 'Pending'} onClick={() => void join(community)} className="btn-secondary px-3 py-2 text-xs">{label}</button>;
            })()}</div>
          </article>
        ))}
      </div>
      {loading && <div className="card mt-5 p-6 text-sm text-muted">Finding communities…</div>}
      {!loading && communities.length === 0 && !error && <div className="card mt-5 p-8 text-center text-sm text-muted">No communities yet. Start one and bring your people together.</div>}
    </section>
  );
}
