'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChangeEvent, FormEvent } from 'react';
import { ArrowLeft, Check, Globe2, ImagePlus, LockKeyhole, MessageCircle, Pencil, Send, Users, X } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Modal } from '@/components/modal';
import { api, uploadMedia } from '@/lib/api';
import { Post, User } from '@/lib/types';

type Community = {
  id: string;
  name: string;
  description?: string | null;
  type: 'Public' | 'Private';
  isDefault: boolean;
  ownerId: string;
  owner: User;
  members: Array<{ userId: string; status: string; role: string; user: User }>;
  _count: { members: number; groups: number };
  rules: Array<{ id: string; title?: string | null; content: string }>;
};
type MembershipRequest = { id: string; userId: string; user: User };
type CommunityMember = { id: string; userId: string; role: string; user: User };
type Page<T> = { items: T[]; nextCursor: string | null };
type CommunityGroup = { id: string; ownerId: string; name: string; description?: string | null; members: Array<{ status: string }>; _count: { members: number } };
type UploadedMedia = { url?: string | null; mimeType?: string | null };

export default function CommunityDetailPage() {
  const params = useParams<{ communityId: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberCursor, setMemberCursor] = useState<string | null>(null);
  const [communityGroups, setCommunityGroups] = useState<CommunityGroup[]>([]);
  const [groupCursor, setGroupCursor] = useState<string | null>(null);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startingChatId, setStartingChatId] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postMedia, setPostMedia] = useState<UploadedMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'Public' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [details, currentUser] = await Promise.all([
        api<Community>(`/communities/${params.communityId}`),
        api<User>('/auth/me'),
      ]);
      setCommunity(details);
      setUser(currentUser);
      setForm({ name: details.name, description: details.description ?? '', type: details.type });
      const membership = details.members.find((member) => member.userId === currentUser.id);
      const canView = details.type === 'Public' || details.ownerId === currentUser.id || membership?.status === 'Active';
      if (canView) {
        const [postItems, memberPage, groupPage] = await Promise.all([
          api<Post[]>(`/posts/community/${params.communityId}`),
          api<Page<CommunityMember>>(`/communities/${params.communityId}/members`),
          api<Page<CommunityGroup>>(`/groups/community/${params.communityId}`),
        ]);
        setPosts(postItems);
        setPostCursor(postItems.length === 30 ? postItems[postItems.length - 1]?.id ?? null : null);
        setMembers(memberPage.items);
        setMemberCursor(memberPage.nextCursor);
        setCommunityGroups(groupPage.items);
        setGroupCursor(groupPage.nextCursor);
      } else {
        setPosts([]);
        setPostCursor(null);
        setMembers([]);
        setMemberCursor(null);
        setCommunityGroups([]);
        setGroupCursor(null);
      }
      if (details.ownerId === currentUser.id) {
        setRequests(await api<MembershipRequest[]>(`/communities/${params.communityId}/requests`));
      } else {
        setRequests([]);
      }
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this community.');
    }
  }
  useEffect(() => { void load(); }, [params.communityId]);

  async function loadMore(kind: 'posts' | 'members' | 'groups') {
    const cursor = kind === 'posts' ? postCursor : kind === 'members' ? memberCursor : groupCursor;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      if (kind === 'posts') {
        const page = await api<Post[]>(`/posts/community/${params.communityId}?beforeId=${encodeURIComponent(cursor)}`);
        setPosts((current) => [...current, ...page]);
        setPostCursor(page.length === 30 ? page[page.length - 1]?.id ?? null : null);
      } else if (kind === 'members') {
        const page = await api<Page<CommunityMember>>(`/communities/${params.communityId}/members?beforeId=${encodeURIComponent(cursor)}`);
        setMembers((current) => [...current, ...page.items]);
        setMemberCursor(page.nextCursor);
      } else {
        const page = await api<Page<CommunityGroup>>(`/groups/community/${params.communityId}?beforeId=${encodeURIComponent(cursor)}`);
        setCommunityGroups((current) => [...current, ...page.items]);
        setGroupCursor(page.nextCursor);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not load more ${kind}.`);
    } finally {
      setLoadingMore(false);
    }
  }

  async function joinGroup(groupId: string) {
    try {
      const membership = await api<{ status: string }>(`/groups/${groupId}/join`, { method: 'POST' });
      setCommunityGroups((current) => current.map((group) => group.id === groupId
        ? {
            ...group,
            members: [{ status: membership.status }],
            _count: { members: group._count.members + 1 },
          }
        : group));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not join this group.');
    }
  }

  async function startMemberChat(targetUserId: string) {
    setStartingChatId(targetUserId);
    try {
      const conversation = await api<{ id: string }>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      router.push(`/app/messages?conversationId=${encodeURIComponent(conversation.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start this chat.');
    } finally {
      setStartingChatId('');
    }
  }

  async function membershipAction(action: 'join' | 'leave') {
    setBusy(true);
    try {
      await api(`/communities/${params.communityId}/${action}`, { method: 'POST' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not ${action} community.`);
    } finally { setBusy(false); }
  }

  async function saveCommunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/communities/${params.communityId}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setEditing(false);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update community.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewRequest(requestId: string, decision: 'approve' | 'reject') {
    setBusy(true);
    try {
      await api(`/communities/${params.communityId}/requests/${requestId}/${decision}`, { method: 'POST' });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Could not ${decision} membership request.`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPostImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) {
      setError('Choose an image no larger than 15 MB.');
      return;
    }

    setUploadingMedia(true);
    try {
      const asset = await uploadMedia<UploadedMedia>(file, 'Post', 'Public');
      if (!asset.url) throw new Error('Upload completed, but no public media URL was returned.');
      setPostMedia((current) => [...current, { url: asset.url, mimeType: asset.mimeType ?? file.type }]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload the image.');
    } finally {
      setUploadingMedia(false);
    }
  }

  async function publishCommunityPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postContent.trim() && postMedia.length === 0) return;
    setPublishing(true);
    try {
      const post = await api<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          communityId: params.communityId,
          type: postMedia.length ? 'Image' : 'Text',
          content: postContent.trim() || undefined,
          mediaUrls: postMedia.map(({ url }) => url),
          mediaMimeTypes: postMedia.map(({ mimeType }) => mimeType),
        }),
      });
      setPosts((current) => [post, ...current]);
      setPostContent('');
      setPostMedia([]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not publish to this community.');
    } finally {
      setPublishing(false);
    }
  }

  const membership = community?.members.find((member) => member.userId === user?.id);
  const isOwner = community?.ownerId === user?.id;
  const canPost = isOwner || membership?.status === 'Active';

  return (
    <section className="mx-auto max-w-4xl">
      <Link href="/app/community" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-forest"><ArrowLeft size={16} /> All communities</Link>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {community && <div className="mt-5">
        <div className="card overflow-hidden">
          <div className="bg-forest px-6 py-9 text-white md:px-9">
            <div className="flex items-center gap-2 text-sm font-semibold text-lime">{community.type === 'Private' ? <LockKeyhole size={15} /> : <Globe2 size={15} />}{community.type} community</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{community.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{community.description || 'A space for music people to connect and collaborate.'}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/70"><span className="inline-flex items-center gap-1.5"><Users size={15} />{community._count.members} members</span><span>Created by {community.owner.fullName}</span></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 md:px-9">
            <div><p className="text-sm font-extrabold">{isOwner ? 'You own this community' : membership?.status === 'Active' ? 'You are a member' : membership?.status === 'Pending' ? 'Request pending' : 'Join the conversation'}</p><p className="mt-1 text-xs text-muted">{community.type === 'Private' ? 'Membership requests are reviewed by community admins.' : 'Join to connect with this community.'}</p></div>
            {isOwner && <button type="button" onClick={() => setEditing(true)} className="btn-secondary"><Pencil size={15} /> Edit community</button>}
            {!isOwner && <button disabled={busy || membership?.status === 'Pending'} onClick={() => void membershipAction(membership?.status === 'Active' ? 'leave' : 'join')} className={membership?.status === 'Active' ? 'btn-secondary' : 'btn-primary'}>{busy ? 'Please wait…' : membership?.status === 'Active' ? 'Leave community' : membership?.status === 'Pending' ? 'Request pending' : 'Join community'}</button>}
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_300px]">
          <section className="card p-5"><h2 className="font-extrabold">Community members</h2><div className="mt-4 space-y-3">{members.map((member) => <div key={member.id} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf4eb] text-sm font-bold text-forest">{member.user.fullName[0]}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{member.user.fullName}</p><p className="text-xs text-muted">@{member.user.username}</p></div>{community.isDefault && member.userId !== user?.id && <button type="button" disabled={Boolean(startingChatId)} onClick={() => void startMemberChat(member.userId)} className="btn-secondary px-2.5 py-2 text-xs" aria-label={`Message ${member.user.fullName}`}><MessageCircle size={14} />{startingChatId === member.userId ? 'Opening…' : 'Message'}</button>}</div>)}{memberCursor && <button onClick={() => void loadMore('members')} disabled={loadingMore} className="mt-2 text-xs font-bold text-forest">{loadingMore ? 'Loading…' : 'Load more members'}</button>}</div></section>
          <aside className="card p-5"><h2 className="font-extrabold">Community guidelines</h2>{community.rules.length ? <ul className="mt-4 space-y-3">{community.rules.map((rule) => <li key={rule.id}><p className="text-sm font-bold">{rule.title || 'Guideline'}</p><p className="mt-1 text-xs leading-5 text-muted">{rule.content}</p></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted">Be respectful, support fellow musicians and keep collaboration constructive.</p>}</aside>
        </div>
        {communityGroups.length > 0 && <section className="card mt-5 p-5">
          <h2 className="font-extrabold">Groups in this community</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {communityGroups.map((group) => {
              const isMember = group.members.some(({ status }) => status === 'Active');
              return <article key={group.id} className="rounded-xl border border-line p-4">
                <h3 className="font-bold">{group.name}</h3>
                <p className="mt-1 text-xs text-muted">{group._count.members} members</p>
                {group.description && <p className="mt-2 text-sm text-muted">{group.description}</p>}
                {isMember
                  ? <Link href={`/app/messages?groupId=${group.id}`} className="mt-3 inline-flex btn-primary px-3 py-2 text-xs">Open group chat</Link>
                  : <button onClick={() => void joinGroup(group.id)} className="mt-3 btn-secondary px-3 py-2 text-xs">Join group</button>}
              </article>;
            })}
          </div>
          {groupCursor && <button onClick={() => void loadMore('groups')} disabled={loadingMore} className="mt-4 text-xs font-bold text-forest">{loadingMore ? 'Loading…' : 'Load more groups'}</button>}
        </section>}
        <section className="mt-5 space-y-4">
          {canPost && <form onSubmit={publishCommunityPost} className="card p-4 md:p-5">
            <label htmlFor="community-post-content" className="mb-2 block text-sm font-extrabold">Share with {community.name}</label>
            <textarea id="community-post-content" rows={3} maxLength={10000} className="field resize-y" placeholder="Share an update, poster, or music project…" value={postContent} onChange={(event) => setPostContent(event.target.value)} />
            {postMedia.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{postMedia.map((media, index) => <img key={`${media.url}-${index}`} src={media.url ?? ''} alt="Image to attach" className="h-28 w-full rounded-lg object-cover" />)}</div>}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-muted"><ImagePlus size={16} />{uploadingMedia ? 'Uploading…' : 'Add poster or image'}<input type="file" accept="image/*" disabled={uploadingMedia} className="sr-only" onChange={(event) => void uploadPostImage(event)} /></label>
              <button disabled={publishing || uploadingMedia || (!postContent.trim() && postMedia.length === 0)} className="btn-primary px-4 py-2 text-sm"><Send size={15} />{publishing ? 'Publishing…' : 'Post'}</button>
            </div>
          </form>}
          {posts.map((post) => <article key={post.id} className="card p-5">
            <div className="flex items-center gap-3">
              {post.organization?.logoUrl ? <img src={post.organization.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-[#edf4eb] font-bold text-forest">{post.organization?.name?.[0] ?? post.author?.fullName?.[0] ?? 'M'}</span>}
              <div>{post.organization ? <Link href={`/app/organizations/${post.organization.id}`} className="text-sm font-bold hover:text-forest">{post.organization.name}</Link> : <p className="text-sm font-bold">{post.author?.fullName ?? 'Community member'}</p>}<p className="text-xs text-muted">{post.organization ? `${post.organization.type ?? 'Organization'} · ` : ''}{new Date(post.createdAt).toLocaleString()}</p></div>
            </div>
            {post.content && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{post.content}</p>}
            {post.media?.map((media) => media.mimeType?.startsWith('image/')
              ? <a key={media.id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl"><img src={media.mediaUrl} alt="Community post attachment" loading="lazy" className="max-h-[560px] w-full rounded-xl object-contain" /></a>
              : <a key={media.id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-forest">Open attached media ↗</a>)}
          </article>)}
          {posts.length === 0 && <div className="card p-6 text-center text-sm text-muted">No posts yet. Share the first update with this community.</div>}
          {postCursor && <button onClick={() => void loadMore('posts')} disabled={loadingMore} className="btn-secondary w-full justify-center">{loadingMore ? 'Loading…' : 'Load older posts'}</button>}
        </section>
        {isOwner && community.type === 'Private' && <section className="card mt-5 p-5">
          <h2 className="font-extrabold">Membership requests <span className="text-muted">({requests.length})</span></h2>
          {requests.length ? <div className="mt-4 divide-y divide-line">{requests.map((request) => <div key={request.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{request.user.fullName}</p><p className="text-xs text-muted">@{request.user.username}</p></div>
            <button type="button" disabled={busy} onClick={() => void reviewRequest(request.id, 'approve')} aria-label={`Approve ${request.user.fullName}`} className="btn-primary px-3 py-2 text-xs"><Check size={14} /> Approve</button>
            <button type="button" disabled={busy} onClick={() => void reviewRequest(request.id, 'reject')} aria-label={`Reject ${request.user.fullName}`} className="btn-secondary px-3 py-2 text-xs"><X size={14} /> Decline</button>
          </div>)}</div> : <p className="mt-2 text-sm text-muted">No membership requests right now.</p>}
        </section>}
      </div>}
      {editing && community && <Modal title="Edit community" onClose={() => setEditing(false)}>
        <form onSubmit={saveCommunity} className="space-y-4">
          {error && <Notice>{error}</Notice>}
          <label className="block text-xs font-bold">Name<input required maxLength={100} className="field mt-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="block text-xs font-bold">Description<textarea maxLength={2000} rows={4} className="field mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block text-xs font-bold">Access<select disabled={community.isDefault} className="field mt-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="Public">Public</option><option value="Private">Private</option></select>{community.isDefault && <span className="mt-1 block font-normal text-muted">The official community is always public.</span>}</label>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </Modal>}
    </section>
  );
}
