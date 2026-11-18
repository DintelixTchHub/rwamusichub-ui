'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Music2, Pencil, Plus, Trash2, UsersRound } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Modal } from '@/components/modal';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

type Group = { id: string; ownerId: string; name: string; type?: string | null; description?: string | null; owner?: { fullName: string }; community?: { id: string; name: string } | null; members?: Array<{ status: string }>; _count?: { members: number } };
type GroupMembership = { status: string };
type Organization = { id: string; name: string; type?: string | null; description?: string | null; website?: string | null };
type GroupMember = { id: string; userId: string; user: User };
type GroupMemberPage = { items: GroupMember[]; nextCursor: string | null };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [editingGroupId, setEditingGroupId] = useState('');
  const [busyGroupId, setBusyGroupId] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState('');
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [groupMemberCursors, setGroupMemberCursors] = useState<Record<string, string | null>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'Band' });
  const [organizationForm, setOrganizationForm] = useState({ name: '', type: '', description: '', website: '', email: '', phone: '' });
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [error, setError] = useState('');

  async function loadGroupsPage() {
    const [groupResult, organizationResult, userResult] = await Promise.allSettled([
      api<Group[]>('/groups'),
      api<Organization[]>('/organizations'),
      api<User>('/auth/me'),
    ]);

    const errors: string[] = [];
    if (groupResult.status === 'fulfilled') setGroups(groupResult.value);
    else errors.push(groupResult.reason instanceof Error ? groupResult.reason.message : 'Could not load music groups.');
    if (organizationResult.status === 'fulfilled') setOrganizations(organizationResult.value);
    else errors.push(organizationResult.reason instanceof Error ? organizationResult.reason.message : 'Could not load organizations.');
    if (userResult.status === 'fulfilled') setUser(userResult.value);
    else errors.push(userResult.reason instanceof Error ? userResult.reason.message : 'Could not load your account.');
    setError(errors.join(' '));
  }

  useEffect(() => { void loadGroupsPage(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api(editingGroupId ? `/groups/${editingGroupId}` : '/groups', {
        method: editingGroupId ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      setGroups(await api<Group[]>('/groups'));
      setOpen(false);
      setEditingGroupId('');
      setForm({ name: '', description: '', type: 'Band' });
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save group.');
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOrganization(true);
    setError('');
    try {
      const created = await api<Organization>('/organizations', {
        method: 'POST',
        body: JSON.stringify({
          ...organizationForm,
          type: organizationForm.type || undefined,
          description: organizationForm.description || undefined,
          website: organizationForm.website || undefined,
          email: organizationForm.email || undefined,
          phone: organizationForm.phone || undefined,
        }),
      });
      setOrganizations((current) => [created, ...current]);
      setOrganizationForm({ name: '', type: '', description: '', website: '', email: '', phone: '' });
      setOrganizationOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create organization.');
    } finally {
      setSavingOrganization(false);
    }
  }

  function editGroup(group: Group) {
    setEditingGroupId(group.id);
    setForm({ name: group.name, description: group.description ?? '', type: group.type ?? 'Band' });
    setOpen(true);
  }

  async function deleteGroup(group: Group) {
    setBusyGroupId(group.id);
    try {
      await api(`/groups/${group.id}`, { method: 'DELETE' });
      setGroups((current) => current.filter((entry) => entry.id !== group.id));
      setGroupToDelete(null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete group.');
    } finally {
      setBusyGroupId('');
    }
  }

  async function toggleMembership(group: Group) {
    if (busyGroupId) return;
    setBusyGroupId(group.id);
    setError('');
    try {
      const active = group.members?.some((member) => member.status === 'Active') ?? false;
      const membership = await api<GroupMembership>(`/groups/${group.id}/${active ? 'leave' : 'join'}`, { method: 'POST' });
      setGroups((current) => current.map((item) => item.id === group.id
        ? {
            ...item,
            members: [{ status: membership.status }],
            _count: { members: Math.max(0, (item._count?.members ?? 0) + (active ? -1 : 1)) },
          }
        : item));
      setGroupMembers((current) => {
        const updated = { ...current };
        delete updated[group.id];
        return updated;
      });
      setExpandedGroupId((current) => current === group.id ? '' : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update group membership.');
    } finally {
      setBusyGroupId('');
    }
  }

  async function toggleMembers(group: Group) {
    if (expandedGroupId === group.id) {
      setExpandedGroupId('');
      return;
    }
    setExpandedGroupId(group.id);
    if (groupMembers[group.id]) return;

    try {
      const page = await api<GroupMemberPage>(`/groups/${group.id}/members`);
      setGroupMembers((current) => ({ ...current, [group.id]: page.items }));
      setGroupMemberCursors((current) => ({ ...current, [group.id]: page.nextCursor }));
    } catch (reason) {
      setExpandedGroupId('');
      setError(reason instanceof Error ? reason.message : 'Could not load group members.');
    }
  }

  async function loadMoreMembers(groupId: string) {
    const beforeId = groupMemberCursors[groupId];
    if (!beforeId || loadingMembers) return;
    setLoadingMembers(true);
    try {
      const page = await api<GroupMemberPage>(`/groups/${groupId}/members?beforeId=${encodeURIComponent(beforeId)}`);
      setGroupMembers((current) => ({ ...current, [groupId]: [...(current[groupId] ?? []), ...page.items] }));
      setGroupMemberCursors((current) => ({ ...current, [groupId]: page.nextCursor }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load more group members.');
    } finally {
      setLoadingMembers(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Make more together</p><h1 className="mt-2 text-3xl font-black tracking-tight">Groups & organizations</h1><p className="mt-2 text-sm text-muted">Discover bands, studios and music organizations.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { setOpen(true); setEditingGroupId(''); setForm({ name: '', description: '', type: 'Band' }); }} className="btn-primary"><Plus size={17} /> Create a group</button><button onClick={() => setOrganizationOpen(true)} className="btn-secondary"><Building2 size={17} /> Create organization</button></div></div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {organizationOpen && <Modal title="Create an organization" onClose={() => setOrganizationOpen(false)}>
        <form onSubmit={createOrganization} className="grid gap-4 sm:grid-cols-2">
          {error && <div className="sm:col-span-2"><Notice>{error}</Notice></div>}
          <label className="text-xs font-bold sm:col-span-2">Name<input required maxLength={120} className="field mt-2" value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} /></label>
          <label className="text-xs font-bold">Type<input maxLength={80} className="field mt-2" placeholder="Studio, label, venue…" value={organizationForm.type} onChange={(event) => setOrganizationForm({ ...organizationForm, type: event.target.value })} /></label>
          <label className="text-xs font-bold">Website<input type="url" className="field mt-2" value={organizationForm.website} onChange={(event) => setOrganizationForm({ ...organizationForm, website: event.target.value })} /></label>
          <label className="text-xs font-bold">Email<input type="email" className="field mt-2" value={organizationForm.email} onChange={(event) => setOrganizationForm({ ...organizationForm, email: event.target.value })} /></label>
          <label className="text-xs font-bold">Phone<input type="tel" className="field mt-2" value={organizationForm.phone} onChange={(event) => setOrganizationForm({ ...organizationForm, phone: event.target.value })} /></label>
          <label className="text-xs font-bold sm:col-span-2">About<textarea maxLength={2000} rows={3} className="field mt-2" value={organizationForm.description} onChange={(event) => setOrganizationForm({ ...organizationForm, description: event.target.value })} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setOrganizationOpen(false)} className="btn-secondary">Cancel</button><button disabled={savingOrganization} className="btn-primary">{savingOrganization ? 'Creating…' : 'Create organization'}</button></div>
        </form>
      </Modal>}
      {open && <Modal title={editingGroupId ? 'Edit group' : 'Create a group'} onClose={() => setOpen(false)}>
        <form onSubmit={create} className="grid gap-4">
          {error && <Notice>{error}</Notice>}
          <label className="text-xs font-bold">Name<input required className="field mt-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-xs font-bold">Type<input className="field mt-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></label>
          <label className="text-xs font-bold">About<input className="field mt-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <p className="text-xs text-muted">Every group is part of the public  community.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button className="btn-primary">{editingGroupId ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>}
      {groupToDelete && <Modal title="Delete group?" onClose={() => setGroupToDelete(null)}>
        <p className="text-sm leading-6 text-muted">Delete <strong className="text-ink">{groupToDelete.name}</strong>? This cannot be undone.</p>
        {error && <div className="mt-4"><Notice>{error}</Notice></div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setGroupToDelete(null)} className="btn-secondary">Cancel</button>
          <button type="button" onClick={() => void deleteGroup(groupToDelete)} disabled={busyGroupId === groupToDelete.id} className="btn-primary bg-red-700 hover:bg-red-800">{busyGroupId === groupToDelete.id ? 'Deleting…' : 'Delete group'}</button>
        </div>
      </Modal>}
      <div className="mt-8"><h2 className="text-lg font-extrabold">Music groups</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groups.map((group) => {
        const isOwner = group.ownerId === user?.id;
        const membershipStatus = group.members?.[0]?.status;
        const isMember = membershipStatus === 'Active';
        return <article key={group.id} className="card p-5"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><Music2 /></span><div className="flex gap-1">{!isOwner && <button type="button" onClick={() => void toggleMembership(group)} disabled={Boolean(busyGroupId) || membershipStatus === 'Banned'} className="btn-secondary px-3 py-2 text-xs">{busyGroupId === group.id ? 'Saving…' : isMember ? 'Leave group' : membershipStatus === 'Banned' ? 'Unavailable' : 'Join group'}</button>}{isOwner && <div className="flex gap-1"><button onClick={() => editGroup(group)} aria-label={`Edit ${group.name}`} className="rounded-lg p-2 text-muted hover:bg-canvas"><Pencil size={16} /></button><button onClick={() => setGroupToDelete(group)} disabled={Boolean(busyGroupId)} aria-label={`Delete ${group.name}`} className="rounded-lg p-2 text-red-700 hover:bg-canvas"><Trash2 size={16} /></button></div>}</div></div><h3 className="mt-4 font-extrabold">{group.name}</h3><p className="mt-1 text-xs font-bold text-forest">{group.type ?? 'Music group'}{isMember ? ' · Member' : ''}</p>{group.community && <p className="mt-1 text-xs text-muted">In <Link className="font-bold text-forest hover:underline" href={`/app/community/${group.community.id}`}>{group.community.name}</Link></p>}<p className="mt-2 text-sm leading-6 text-muted">{group.description || 'A place to create and grow together.'}</p>{isMember && <Link href={`/app/messages?groupId=${group.id}`} className="mt-4 inline-flex btn-primary px-3 py-2 text-xs">Open group chat</Link>}<button onClick={() => void toggleMembers(group)} className="mt-4 block text-xs font-bold text-forest">{expandedGroupId === group.id ? 'Hide members' : `View members${group._count ? ` (${group._count.members})` : ''}`}</button>{expandedGroupId === group.id && <div className="mt-3 border-t border-line pt-3">{groupMembers[group.id] ? groupMembers[group.id].length ? <>{groupMembers[group.id].map((member) => <p key={member.id} className="py-1 text-xs text-muted">{member.user.fullName} <span className="text-muted/70">@{member.user.username}</span></p>)}{groupMemberCursors[group.id] && <button onClick={() => void loadMoreMembers(group.id)} disabled={loadingMembers} className="mt-2 text-xs font-bold text-forest">{loadingMembers ? 'Loading…' : 'Load more members'}</button>}</> : <p className="text-xs text-muted">No one has joined this group yet.</p> : <p className="text-xs text-muted">Loading members…</p>}</div>}</article>;
      })}</div>{groups.length === 0 && !error && <p className="mt-3 text-sm text-muted">There aren’t any music groups to explore yet. Start one and invite your collaborators.</p>}</div>
      <div className="mt-9"><h2 className="text-lg font-extrabold">Organizations</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{organizations.map((organization) => <article key={organization.id} className="card p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f3f5e9] text-forest"><UsersRound /></span><h3 className="mt-4 font-extrabold">{organization.name}</h3><p className="mt-1 text-xs font-bold text-muted">{organization.type ?? 'Music organization'}</p><p className="mt-2 text-sm text-muted">{organization.description || 'Supporting Rwanda’s music community.'}</p>{organization.website && <a href={organization.website} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-bold text-forest">Visit website ↗</a>}</article>)}</div>{organizations.length === 0 && !error && <p className="mt-3 text-sm text-muted">There aren’t any organizations to explore just yet.</p>}</div>
    </section>
  );
}
