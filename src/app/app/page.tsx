'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Building2, CalendarDays, ClipboardList, Flag, Heart, ImagePlus, MapPin, MessageCircle, Music2, Send, UserSearch } from 'lucide-react';
import { api, uploadMedia } from '@/lib/api';
import { Opportunity, Post, User } from '@/lib/types';
import { Notice } from '@/components/notice';
import { Modal } from '@/components/modal';

type Comment = { id: string; content: string; createdAt: string; author?: User };
type CommunitySummary = { id: string; name: string; type: 'Public' | 'Private'; members?: Array<{ userId: string; status: string }> };
type GroupSummary = { id: string; name: string; type?: string | null; members?: Array<{ status: string }> };
type OrganizationSummary = { id: string; name: string; type?: string | null; description?: string | null; logoUrl?: string | null; location?: string | null; pendingApplicationsCount?: number; _count?: { opportunities: number } };
type ProfileSummary = { stageName?: string | null; headline?: string | null; biography?: string | null; city?: string | null; country?: string | null; user?: { professions?: unknown[]; instruments?: unknown[]; genres?: unknown[]; portfolioItems?: unknown[] } };
type MediaAsset = { url?: string | null; mimeType?: string | null };
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'video/mp4', 'application/pdf'];

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [managedOrganizations, setManagedOrganizations] = useState<OrganizationSummary[]>([]);
  const [publicOrganizations, setPublicOrganizations] = useState<OrganizationSummary[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [dashboardMode, setDashboardMode] = useState<'Musician' | 'EventOrganizer'>('Musician');
  const [organizationPostId, setOrganizationPostId] = useState('');
  const [discoveriesLoading, setDiscoveriesLoading] = useState(true);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [composerType, setComposerType] = useState<'Text' | 'Poll'>('Text');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaMimeTypes, setMediaMimeTypes] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [reportingPostId, setReportingPostId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  async function loadFeed() {
    setLoading(true);
    setError('');
    const [feedResult, userResult] = await Promise.allSettled([
      api<Post[]>('/posts/feed'),
      api<User>('/auth/me'),
    ]);
    if (feedResult.status === 'fulfilled') {
      setPosts(feedResult.value);
      setHasMorePosts(feedResult.value.length === 30);
    } else {
      setError(feedResult.reason instanceof Error ? feedResult.reason.message : 'Could not load your home feed.');
    }
    if (userResult.status === 'fulfilled') {
      setUser(userResult.value);
      setDashboardMode(userResult.value.accountType === 'EventOrganizer' ? 'EventOrganizer' : 'Musician');
      window.localStorage.setItem('rmh.user', JSON.stringify(userResult.value));
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadFeed();
    void Promise.allSettled([
      api<CommunitySummary[]>('/communities'),
      api<GroupSummary[]>('/groups'),
      api<OrganizationSummary[]>('/organizations/managed'),
      api<OrganizationSummary[]>('/organizations'),
      api<Opportunity[]>('/opportunities'),
      api<ProfileSummary | null>('/profiles/me'),
    ]).then(([communityResult, groupResult, managedResult, organizationResult, opportunityResult, profileResult]) => {
      if (communityResult.status === 'fulfilled') setCommunities(communityResult.value);
      else setError(communityResult.reason instanceof Error ? communityResult.reason.message : 'Could not load communities.');
      if (groupResult.status === 'fulfilled') setGroups(groupResult.value);
      else setError(groupResult.reason instanceof Error ? groupResult.reason.message : 'Could not load music groups.');
      if (managedResult.status === 'fulfilled') setManagedOrganizations(managedResult.value);
      else setError(managedResult.reason instanceof Error ? managedResult.reason.message : 'Could not load your organizations.');
      if (organizationResult.status === 'fulfilled') setPublicOrganizations(organizationResult.value);
      else setError(organizationResult.reason instanceof Error ? organizationResult.reason.message : 'Could not discover organizations.');
      if (opportunityResult.status === 'fulfilled') setOpportunities(opportunityResult.value);
      else setError(opportunityResult.reason instanceof Error ? opportunityResult.reason.message : 'Could not load opportunities.');
      if (profileResult.status === 'fulfilled') setProfileSummary(profileResult.value);
      else if (!(profileResult.reason instanceof Error && profileResult.reason.message.includes('404'))) setError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load your professional profile.');
      setDiscoveriesLoading(false);
    });
  }, []);

  async function loadMorePosts() {
    const beforeId = posts[posts.length - 1]?.id;
    if (!beforeId || loadingMorePosts) return;

    setLoadingMorePosts(true);
    try {
      const older = await api<Post[]>(`/posts/feed?beforeId=${encodeURIComponent(beforeId)}`);
      setPosts((current) => [...current, ...older]);
      setHasMorePosts(older.length === 30);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load more posts.');
    } finally {
      setLoadingMorePosts(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (composerType === 'Text' && !content.trim() && mediaUrls.length === 0) return;
    setPublishing(true);
    setError('');
    try {
      if (composerType === 'Poll' && (pollOptions.filter((option) => option.trim()).length < 2 || !pollQuestion.trim())) {
        setError('Polls need a question and at least two options.');
        return;
      }
      const post = await api<Post>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim() || undefined,
          type: composerType,
          organizationId: organizationPostId || undefined,
          mediaUrls,
          mediaMimeTypes,
          ...(composerType === 'Poll' ? { pollQuestion: pollQuestion.trim(), pollOptions: pollOptions.map((option) => option.trim()).filter(Boolean) } : {}),
        }),
      });
      setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
      setContent('');
      setPollQuestion('');
      setPollOptions(['', '']);
      setMediaUrls([]);
      setMediaMimeTypes([]);
      setComposerType('Text');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your post could not be published.');
    } finally {
      setPublishing(false);
    }
  }

  async function uploadPostMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_MIME_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setError('Choose a supported image, MP3, MP4, or PDF file no larger than 15 MB.');
      return;
    }

    setUploadingMedia(true);
    try {
      const asset = await uploadMedia<MediaAsset>(file, 'Post', 'Public');
      const mediaUrl = asset.url;
      if (!mediaUrl) throw new Error('Upload completed, but no public media URL was returned. Configure R2_PUBLIC_BASE_URL on the backend.');
      setMediaUrls((current) => [...current, mediaUrl]);
      setMediaMimeTypes((current) => [...current, asset.mimeType ?? file.type]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not upload post media.');
    } finally { setUploadingMedia(false); }
  }

  async function toggleReaction(post: Post) {
    if (!user) return;
    const reacted = post.reactions?.some((reaction) => reaction.userId === user.id) ?? false;
    try {
      await api(`/posts/${post.id}/reactions`, {
        method: reacted ? 'DELETE' : 'POST',
        ...(reacted ? {} : { body: JSON.stringify({ type: 'Like' }) }),
      });
      setPosts((current) => current.map((item) => item.id !== post.id ? item : {
        ...item,
        reactions: reacted
          ? (item.reactions ?? []).filter((reaction) => reaction.userId !== user.id)
          : [...(item.reactions ?? []), { id: `local-${post.id}`, userId: user.id, type: 'Like' }],
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update your reaction.');
    }
  }

  async function toggleComments(postId: string) {
    const open = !expandedComments[postId];
    setExpandedComments((current) => ({ ...current, [postId]: open }));
    if (open && !comments[postId]) {
      try {
        const items = await api<Comment[]>(`/posts/${postId}/comments`);
        setComments((current) => ({ ...current, [postId]: items }));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not load comments.');
      }
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    try {
      const comment = await api<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setComments((current) => ({ ...current, [postId]: [comment, ...(current[postId] ?? [])] }));
      setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...(post.comments ?? []), { id: comment.id }] } : post));
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add comment.');
    }
  }

  async function reportPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportingPostId || !reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await api(`/posts/${reportingPostId}/report`, { method: 'POST', body: JSON.stringify({ reason: reportReason.trim() }) });
      setReportingPostId('');
      setReportReason('');
      setError('');
    } catch (errorReason) {
      setError(errorReason instanceof Error ? errorReason.message : 'Could not submit report.');
    } finally {
      setSubmittingReport(false);
    }
  }

  async function votePoll(postId: string, optionId: string) {
    try {
      await api(`/posts/${postId}/poll/votes`, { method: 'POST', body: JSON.stringify({ optionId }) });
      const updatedPost = await api<Post>(`/posts/${postId}`);
      setPosts((current) => current.map((post) => post.id === postId ? updatedPost : post));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record your poll vote.');
    }
  }

  const organizerMode = dashboardMode === 'EventOrganizer' &&
    (user?.accountType === 'EventOrganizer' || managedOrganizations.length > 0);
  const profileFields = [
    Boolean(profileSummary?.stageName || profileSummary?.headline),
    Boolean(profileSummary?.biography),
    Boolean(profileSummary?.city || profileSummary?.country),
    Boolean(profileSummary?.user?.professions?.length || profileSummary?.user?.instruments?.length),
    Boolean(profileSummary?.user?.genres?.length),
    Boolean(profileSummary?.user?.portfolioItems?.length),
  ];
  const profilePercent = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100);
  const missingProfileItems = [
    !profileFields[0] ? 'Add an artist name or professional headline' : '',
    !profileFields[1] ? 'Tell people about your work' : '',
    !profileFields[2] ? 'Add your location' : '',
    !profileFields[3] ? 'Choose a profession or instrument' : '',
    !profileFields[4] ? 'Add a music genre' : '',
    !profileFields[5] ? 'Showcase a portfolio item' : '',
  ].filter(Boolean);
  const pendingApplications = managedOrganizations.reduce((count, organization) => count + (organization.pendingApplicationsCount ?? 0), 0);
  const selectedOrganization = managedOrganizations.find(({ id }) => id === organizationPostId);

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{organizerMode ? 'Your music business workspace' : 'Your community, in rhythm'}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">{organizerMode ? 'Welcome back' : 'Good to have you here'}{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}.</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{organizerMode ? 'Discover talented musicians, connect with professionals and organize your next event.' : 'Connect with music professionals. Discover opportunities. Grow your music career.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(user?.accountType === 'EventOrganizer' || managedOrganizations.length > 0) && profileSummary && <div className="flex rounded-xl border border-line bg-white p-1">
              <button type="button" onClick={() => setDashboardMode('EventOrganizer')} className={`rounded-lg px-3 py-2 text-xs font-bold ${organizerMode ? 'bg-forest text-white' : 'text-muted'}`}>Organizer</button>
              <button type="button" onClick={() => setDashboardMode('Musician')} className={`rounded-lg px-3 py-2 text-xs font-bold ${!organizerMode ? 'bg-forest text-white' : 'text-muted'}`}>Musician</button>
            </div>}
            <Link href={organizerMode ? '/app/discover' : '/app/opportunities'} className="btn-secondary text-sm">{organizerMode ? 'Explore musicians' : 'Explore opportunities'} <ArrowRight size={16} /></Link>
          </div>
        </div>
        {error && <div className="mt-6"><Notice>{error}</Notice></div>}
        <form onSubmit={publish} className="card mt-7 p-4 md:p-5">
          {managedOrganizations.length > 0 && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-muted">{selectedOrganization ? `Posting to the shared feed as ${selectedOrganization.name}` : 'Posting to the shared community feed'}</p>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted">
              Post as
              <select aria-label="Choose post identity" className="field max-w-[220px] py-2" value={organizationPostId} onChange={(event) => setOrganizationPostId(event.target.value)}>
                <option value="">Your personal account</option>
                {managedOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
          </div>}
          <div className="mb-3 flex gap-2">
            <button type="button" onClick={() => setComposerType('Text')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${composerType === 'Text' ? 'bg-forest text-white' : 'bg-canvas text-muted'}`}>Post</button>
            <button type="button" onClick={() => setComposerType('Poll')} className={`rounded-full px-3 py-1.5 text-xs font-bold ${composerType === 'Poll' ? 'bg-forest text-white' : 'bg-canvas text-muted'}`}>Poll</button>
          </div>
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lime font-black text-forest">{user?.fullName?.[0] ?? 'M'}</div>
            <textarea aria-label="Write a post" rows={2} className="field resize-none border-0 bg-canvas focus:bg-white" placeholder="Share a sound, a thought, or what you're working on…" value={content} onChange={(event) => setContent(event.target.value)} />
          </div>
          {composerType === 'Poll' && <div className="mt-3 space-y-2 rounded-xl bg-canvas p-3">
            <input className="field bg-white" placeholder="Ask a question…" value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} />
            {pollOptions.map((option, index) => <div key={index} className="flex gap-2"><input className="field bg-white" placeholder={`Option ${index + 1}`} value={option} onChange={(event) => setPollOptions((current) => current.map((value, i) => i === index ? event.target.value : value))} />{pollOptions.length > 2 && <button type="button" aria-label="Remove poll option" onClick={() => setPollOptions((current) => current.filter((_, i) => i !== index))} className="px-2 text-muted">×</button>}</div>)}
            {pollOptions.length < 6 && <button type="button" onClick={() => setPollOptions((current) => [...current, ''])} className="text-xs font-bold text-forest">+ Add option</button>}
          </div>}
          {mediaUrls.length > 0 && <p className="mt-2 text-xs font-semibold text-forest">{mediaUrls.length} media file(s) attached</p>}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-muted"><ImagePlus size={16} />{uploadingMedia ? 'Uploading…' : 'Add media'}<input type="file" accept={ALLOWED_MIME_TYPES.join(',')} disabled={uploadingMedia} className="sr-only" onChange={(event) => void uploadPostMedia(event)} /></label>
            <button disabled={publishing || uploadingMedia || (!content.trim() && composerType === 'Text' && mediaUrls.length === 0) || (composerType === 'Poll' && !pollQuestion.trim())} className="btn-primary px-4 py-2 text-sm"><Send size={15} /> {publishing ? 'Publishing…' : 'Publish'}</button>
          </div>
        </form>
        <div className="mt-7 flex items-center justify-between"><h2 className="text-lg font-extrabold">Community feed</h2><span className="text-xs font-semibold text-muted">Latest updates</span></div>
        <div className="mt-4 space-y-4">
          {loading && <div className="card p-6 text-sm text-muted">Finding the latest from your community…</div>}
          {!loading && posts.length === 0 && !error && <div className="card p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><Music2 /></div><h3 className="mt-4 font-extrabold">The stage is yours</h3><p className="mt-1 text-sm text-muted">Start the conversation with your first post.</p></div>}
          {posts.map((post) => (
            <article key={post.id} className="card p-5 md:p-6">
              <div className="flex items-center gap-3">
                {post.organization?.logoUrl ? <img src={post.organization.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-[#e6efe7] font-bold text-forest">{post.organization?.name?.[0] ?? post.author?.fullName?.[0] ?? 'M'}</div>}
                <div className="min-w-0">
                  {post.organization ? <Link href={`/app/organizations/${post.organization.id}`} className="truncate text-sm font-extrabold hover:text-forest">{post.organization.name}</Link> : <p className="truncate text-sm font-extrabold">{post.author?.fullName ?? 'Music maker'}</p>}
                  <p className="text-xs text-muted">{post.organization ? `${post.organization.type ?? 'Organization'} · ` : post.author?.username ? `@${post.author.username} · ` : ''}{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
                {post.community && <span className="ml-auto rounded-full bg-canvas px-3 py-1 text-xs font-bold text-muted">{post.community.name}</span>}
              </div>
              {post.content && <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#334139]">{post.content}</p>}
              {post.media?.map((media) => media.mimeType?.startsWith('image/')
                ? <a key={media.id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-xl"><img src={media.mediaUrl} alt="Post attachment" loading="lazy" className="max-h-[560px] w-full rounded-xl object-contain" /></a>
                : <a key={media.id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-forest">Open attached media ↗</a>)}
              {post.poll && <div className="mt-4 rounded-xl bg-canvas p-4"><h3 className="text-sm font-extrabold">{post.poll.question}</h3><div className="mt-3 space-y-2">{post.poll.options.map((option) => {
                const totalVotes = post.poll?.options.reduce((sum, entry) => sum + entry.votes.length, 0) ?? 0;
                const percent = totalVotes ? Math.round((option.votes.length / totalVotes) * 100) : 0;
                const hasVoted = option.votes.some((vote) => vote.userId === user?.id);
                return <button key={option.id} onClick={() => void votePoll(post.id, option.id)} className="relative w-full overflow-hidden rounded-lg border border-line bg-white px-3 py-2 text-left text-xs font-semibold">
                  <span className="absolute inset-y-0 left-0 bg-[#edf4eb]" style={{ width: `${percent}%` }} />
                  <span className="relative flex justify-between gap-2"><span>{option.text}{hasVoted ? ' ✓' : ''}</span><span>{percent}% · {option.votes.length}</span></span>
                </button>;
              })}</div><p className="mt-2 text-[10px] text-muted">{post.poll.options.reduce((sum, option) => sum + option.votes.length, 0)} votes · Select an option to vote or change your vote.</p></div>}
              <div className="mt-5 flex items-center gap-5 border-t border-line pt-4 text-xs font-semibold text-muted">
                <button onClick={() => void toggleReaction(post)} className={`inline-flex items-center gap-1.5 ${post.reactions?.some((reaction) => reaction.userId === user?.id) ? 'text-rose-600' : 'hover:text-forest'}`}><Heart size={16} /> {post.reactions?.length ?? 0}</button>
                <button onClick={() => void toggleComments(post.id)} className="inline-flex items-center gap-1.5 hover:text-forest"><MessageCircle size={16} /> {post.comments?.length ?? 0} comments</button>
                <button onClick={() => { setReportingPostId(post.id); setReportReason(''); }} className="ml-auto inline-flex items-center gap-1.5 hover:text-rose-600"><Flag size={14} /> Report</button>
              </div>
              {expandedComments[post.id] && <div className="mt-4 border-t border-line pt-4">
                <form onSubmit={(event) => void addComment(event, post.id)} className="flex gap-2"><input className="field min-w-0 flex-1 py-2 text-sm" aria-label="Write a comment" placeholder="Add a comment…" value={commentDrafts[post.id] ?? ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} /><button disabled={!commentDrafts[post.id]?.trim()} className="btn-primary px-3 py-2 text-xs">Comment</button></form>
                <div className="mt-3 space-y-3">{(comments[post.id] ?? []).map((comment) => <div key={comment.id} className="rounded-xl bg-canvas p-3"><p className="text-xs font-bold">{comment.author?.fullName ?? 'Music maker'} <span className="ml-1 font-normal text-muted">{new Date(comment.createdAt).toLocaleDateString()}</span></p><p className="mt-1 whitespace-pre-wrap text-sm text-[#334139]">{comment.content}</p></div>)}</div>
              </div>}
            </article>
          ))}
          {hasMorePosts && <button onClick={() => void loadMorePosts()} disabled={loadingMorePosts} className="btn-secondary w-full py-3">{loadingMorePosts ? 'Loading…' : 'Load older posts'}</button>}
        </div>
      </section>
      <aside className="space-y-5">
        {organizerMode ? <>
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2"><h3 className="font-extrabold">Your organization</h3><Link href="/app/organizations" className="text-xs font-bold text-forest">Directory</Link></div>
            {managedOrganizations.length ? <div className="mt-4 space-y-3">{managedOrganizations.slice(0, 3).map((organization) => <div key={organization.id} className="flex items-center gap-3">
              {organization.logoUrl ? <img src={organization.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb] text-forest"><Building2 size={18} /></span>}
              <div className="min-w-0 flex-1"><Link href={`/app/organizations/${organization.id}`} className="block truncate text-sm font-bold hover:text-forest">{organization.name}</Link><p className="text-xs text-muted">{organization.type || 'Music organization'}</p></div>
              <Link href={`/app/organizations/${organization.id}`} aria-label={`Manage ${organization.name}`} className="text-xs font-bold text-forest">Manage</Link>
            </div>)}</div> : <div className="mt-3"><p className="text-sm text-muted">Complete organizer setup by creating an organization you manage.</p><Link href="/app/organizations" className="btn-primary mt-3 w-full justify-center">Create organization</Link></div>}
            {managedOrganizations.length > 0 && <Link href="/app/organizations" className="btn-secondary mt-4 w-full justify-center">View organizations</Link>}
          </div>
          <div className="card overflow-hidden">
            <div className="bg-forest p-5 text-white"><p className="eyebrow !text-lime">Reach the right people</p><h2 className="mt-2 text-xl font-black">Publish your next opportunity.</h2><p className="mt-2 text-sm leading-6 text-white/70">Post a gig, audition or call for performers from an organization you manage.</p><Link href="/app/opportunities?create=1" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-lime">Publish opportunity <ArrowRight size={15} /></Link></div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb] text-forest"><ClipboardList size={18} /></span><div><h3 className="font-extrabold">Applications</h3><p className="text-xs text-muted">{pendingApplications} pending across your organizations</p></div></div>
            <Link href="/app/opportunities" className="btn-secondary mt-4 w-full justify-center">Review opportunities & applications</Link>
          </div>
          <div className="card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4eb] text-forest"><UserSearch size={18} /></span><div><h3 className="font-extrabold">Discover talent</h3><p className="text-xs text-muted">Find musicians by name, skill or location.</p></div></div><Link href="/app/discover" className="btn-secondary mt-4 w-full justify-center">Explore musicians</Link></div>
        </> : <>
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="font-extrabold">Discover opportunities</h3><Link href="/app/opportunities" className="text-xs font-bold text-forest">See all</Link></div>
            {opportunities.slice(0, 3).map((opportunity) => <Link key={opportunity.id} href={`/app/opportunities/${opportunity.id}`} className="mt-4 block border-b border-line pb-3 last:border-0 last:pb-0">
              <p className="line-clamp-2 text-sm font-bold hover:text-forest">{opportunity.title}</p>
              <p className="mt-1 text-xs text-muted">{opportunity.organization?.name ?? opportunity.organizer?.fullName ?? 'Music opportunity'}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">{opportunity.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{opportunity.location}</span>}{opportunity.deadline && <span className="inline-flex items-center gap-1"><CalendarDays size={11} />Due {new Date(opportunity.deadline).toLocaleDateString()}</span>}</div>
            </Link>)}
            {!opportunities.length && <p className="mt-3 text-xs text-muted">{discoveriesLoading ? 'Loading opportunities…' : 'No open opportunities yet.'}</p>}
            <Link href="/app/opportunities" className="btn-secondary mt-4 w-full justify-center">Explore all opportunities</Link>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="font-extrabold">Discover organizations</h3><Link href="/app/organizations" className="text-xs font-bold text-forest">See all</Link></div>
            {publicOrganizations.slice(0, 3).map((organization) => <Link key={organization.id} href={`/app/organizations/${organization.id}`} className="mt-4 flex items-center gap-3">
              {organization.logoUrl ? <img src={organization.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf4eb] text-forest"><Building2 size={16} /></span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{organization.name}</span><span className="block truncate text-xs text-muted">{organization.type || 'Music organization'}{organization.location ? ` · ${organization.location}` : ''}</span></span>
            </Link>)}
            {!publicOrganizations.length && <p className="mt-3 text-xs text-muted">{discoveriesLoading ? 'Loading organizations…' : 'No published organizations yet.'}</p>}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between"><h3 className="font-extrabold">Build your presence</h3><span className="text-sm font-black text-forest">{profilePercent}%</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-forest transition-all" style={{ width: `${profilePercent}%` }} /></div>
            <p className="mt-2 text-sm leading-6 text-muted">{profileSummary ? `${missingProfileItems.length} steps left to make your profile stand out.` : 'Create a musician profile so people can find and work with you.'}</p>
            {missingProfileItems.slice(0, 3).map((item) => <p key={item} className="mt-2 text-xs text-muted">• {item}</p>)}
            <Link href="/app/profile" className="btn-secondary mt-4 w-full justify-center">{profileSummary ? 'Improve profile' : 'Create musician profile'}</Link>
          </div>
        </>}
        <div className="card p-5">
          <div className="flex items-center justify-between"><h3 className="font-extrabold">Communities</h3><Link href="/app/community" className="text-xs font-bold text-forest">Explore</Link></div>
          {communities.length ? <div className="mt-3 space-y-3">{communities.slice(0, 4).map((community) => {
            const membership = community.members?.find((member) => member.userId === user?.id);
            return <Link key={community.id} href={`/app/community/${community.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-forest"><span className="min-w-0 truncate font-semibold">{community.name}</span><span className="shrink-0 text-[10px] text-muted">{membership?.status === 'Pending' ? 'Pending' : membership?.status === 'Active' ? 'Joined' : community.type}</span></Link>;
          })}</div> : <p className="mt-2 text-xs text-muted">{discoveriesLoading ? 'Loading communities…' : 'No communities available yet.'}</p>}
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><h3 className="font-extrabold">Music groups</h3><Link href="/app/groups" className="text-xs font-bold text-forest">Explore</Link></div>
          {groups.length ? <div className="mt-3 space-y-3">{groups.slice(0, 4).map((group) => <Link key={group.id} href="/app/groups" className="flex items-center justify-between gap-2 text-sm hover:text-forest"><span className="min-w-0 truncate font-semibold">{group.name}</span><span className="shrink-0 text-[10px] text-muted">{group.members?.some((member) => member.status === 'Active') ? 'Joined' : group.type ?? 'Group'}</span></Link>)}</div> : <p className="mt-2 text-xs text-muted">{discoveriesLoading ? 'Loading music groups…' : 'No music groups available yet.'}</p>}
        </div>
      </aside>
      {reportingPostId && <Modal title="Report post" onClose={() => setReportingPostId('')}>
        <form onSubmit={reportPost} className="space-y-4">
          <p className="text-sm leading-6 text-muted">Tell us why this post should be reviewed.</p>
          {error && <Notice>{error}</Notice>}
          <label className="block text-xs font-bold">Reason<textarea required maxLength={2000} rows={4} className="field mt-2" value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Describe the issue…" /></label>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setReportingPostId('')} className="btn-secondary">Cancel</button>
            <button disabled={submittingReport || !reportReason.trim()} className="btn-primary">{submittingReport ? 'Submitting…' : 'Submit report'}</button>
          </div>
        </form>
      </Modal>}
    </div>
  );
}
