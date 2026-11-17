'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react';
import { Notice } from '@/components/notice';
import { Modal } from '@/components/modal';
import { api } from '@/lib/api';
import { Opportunity, User } from '@/lib/types';

type OpportunityForm = {
  title: string;
  description: string;
  location: string;
  eventDate: string;
  deadline: string;
  budget: string;
  status: string;
};

type Application = {
  id: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
  coverLetter?: string | null;
  appliedAt: string;
  applicant?: User & {
    profile?: { stageName?: string | null; headline?: string | null } | null;
  };
};

type ManagedOrganization = { id: string };

function toDateInput(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function OpportunityDetailPage() {
  const params = useParams<{ opportunityId: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [form, setForm] = useState<OpportunityForm>({
    title: '',
    description: '',
    location: '',
    eventDate: '',
    deadline: '',
    budget: '',
    status: 'Open',
  });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Opportunity>(`/opportunities/${params.opportunityId}`),
      api<User>('/auth/me'),
      api<Application | null>(`/opportunities/${params.opportunityId}/applications/me`),
    ]).then(async ([item, user, myApplication]) => {
      if (!active) return;
      setOpportunity(item);
      setCurrentUser(user);
      setApplication(myApplication);
      setForm({
        title: item.title,
        description: item.description ?? '',
        location: item.location ?? '',
        eventDate: toDateInput(item.eventDate),
        deadline: toDateInput(item.deadline),
        budget: item.budget == null ? '' : String(item.budget),
        status: item.status ?? 'Open',
      });
      const managedOrganizations = item.organizationId
        ? await api<ManagedOrganization[]>('/organizations/managed')
        : [];
      const manager = item.organizerId === user.id || managedOrganizations.some(({ id }) => id === item.organizationId);
      setCanManage(manager);
      if (manager) {
        const applicantList = await api<Application[]>(`/opportunities/${params.opportunityId}/applications`);
        if (active) setApplications(applicantList);
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load this opportunity.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [params.opportunityId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opportunity) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<Opportunity>(`/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          eventDate: form.eventDate || undefined,
          deadline: form.deadline || undefined,
          budget: form.budget ? Number(form.budget) : undefined,
        }),
      });
      setOpportunity(updated);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this opportunity.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!opportunity) return;
    setBusy(true);
    setError('');
    try {
      await api(`/opportunities/${opportunity.id}`, { method: 'DELETE' });
      router.push('/app/opportunities');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this opportunity.');
      setBusy(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!opportunity) return;
    setBusy(true);
    setError('');
    try {
      const created = await api<Application>(`/opportunities/${opportunity.id}/applications`, {
        method: 'POST',
        body: JSON.stringify({ coverLetter }),
      });
      setApplication(created);
      setCoverLetter('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your application.');
    } finally {
      setBusy(false);
    }
  }

  async function withdrawApplication() {
    if (!opportunity) return;
    setBusy(true);
    setError('');
    try {
      const withdrawn = await api<Application>(`/opportunities/${opportunity.id}/applications/me`, { method: 'DELETE' });
      setApplication(withdrawn);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not withdraw your application.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewApplication(item: Application, status: 'Accepted' | 'Rejected') {
    if (!opportunity) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<Application>(`/opportunities/${opportunity.id}/applications/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setApplications((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not review this application.');
    } finally {
      setBusy(false);
    }
  }

  const isOrganizer = canManage || opportunity?.organizerId === currentUser?.id;

  return (
    <section className="mx-auto max-w-4xl">
      <Link href="/app/opportunities" className="inline-flex items-center gap-2 text-sm font-bold text-forest">
        <ArrowLeft size={16} /> All opportunities
      </Link>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-5 p-6 text-sm text-muted">Loading opportunity…</div>}
      {!loading && opportunity && <>
        <article className="card mt-5 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{opportunity.status ?? 'Open'} opportunity</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{opportunity.title}</h1>
              <p className="mt-2 text-sm text-muted">Posted by {opportunity.organizer?.fullName ?? 'Music organizer'}</p>
            </div>
            {isOrganizer && <div className="flex gap-2">
              <button onClick={() => setEditing((current) => !current)} className="btn-secondary px-3 py-2 text-sm">
                <Pencil size={15} /> {editing ? 'Cancel edit' : 'Edit'}
              </button>
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="btn-secondary px-3 py-2 text-sm text-red-700">
                <Trash2 size={15} /> Delete
              </button>
            </div>}
          </div>

          {!editing && <>
            <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold text-muted">
              {opportunity.location && <span className="inline-flex items-center gap-2"><MapPin size={16} />{opportunity.location}</span>}
              {opportunity.eventDate && <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{new Date(opportunity.eventDate).toLocaleDateString()}</span>}
              {opportunity.deadline && <span>Apply by {new Date(opportunity.deadline).toLocaleDateString()}</span>}
              <span className="text-forest">{opportunity.budget ? `${Number(opportunity.budget).toLocaleString()} ${opportunity.currency ?? 'RWF'}` : 'Open budget'}</span>
            </div>
            <p className="mt-7 whitespace-pre-wrap text-sm leading-7 text-[#334139]">{opportunity.description || 'No additional details have been provided.'}</p>
            {isOrganizer ? <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-lg font-extrabold">Applications ({applications.length})</h2>
              <div className="mt-4 space-y-3">
                {applications.map((item) => <article key={item.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="font-bold">{item.applicant?.profile?.stageName || item.applicant?.fullName || 'Applicant'}</h3><p className="mt-1 text-xs text-muted">{item.applicant?.profile?.headline || `@${item.applicant?.username ?? ''}`} · Applied {new Date(item.appliedAt).toLocaleDateString()}</p></div>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-bold">{item.status}</span>
                  </div>
                  {item.coverLetter && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{item.coverLetter}</p>}
                  {item.status === 'Pending' && <div className="mt-3 flex gap-2"><button onClick={() => void reviewApplication(item, 'Accepted')} disabled={busy} className="btn-primary px-3 py-2 text-xs">Accept</button><button onClick={() => void reviewApplication(item, 'Rejected')} disabled={busy} className="btn-secondary px-3 py-2 text-xs">Decline</button></div>}
                </article>)}
                {applications.length === 0 && <p className="text-sm text-muted">No applications have been submitted yet.</p>}
              </div>
            </div> : <div className="mt-8 border-t border-line pt-6">
              {application && application.status !== 'Withdrawn' ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4">
                <div><p className="text-sm font-bold">Your application: {application.status}</p><p className="mt-1 text-xs text-muted">Submitted {new Date(application.appliedAt).toLocaleDateString()}</p></div>
                {application.status === 'Pending' && <button onClick={() => void withdrawApplication()} disabled={busy} className="btn-secondary px-3 py-2 text-xs">{busy ? 'Please wait…' : 'Withdraw application'}</button>}
              </div> : opportunity.status === 'Open' && <form onSubmit={submitApplication} className="space-y-3">
                <h2 className="text-lg font-extrabold">{application?.status === 'Withdrawn' ? 'Reapply to this opportunity' : 'Apply for this opportunity'}</h2>
                <label className="block text-xs font-bold">Cover letter (optional)<textarea maxLength={5000} rows={4} className="field mt-2" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Introduce yourself and explain why you are a good fit." /></label>
                <button disabled={busy} className="btn-primary">{busy ? 'Submitting…' : 'Submit application'}</button>
              </form>}
            </div>}
          </>}
        </article>
        {editing && isOrganizer && <Modal title="Edit opportunity" onClose={() => setEditing(false)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {error && <div className="sm:col-span-2"><Notice>{error}</Notice></div>}
            <label className="text-xs font-bold">Title<input required className="field mt-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label className="text-xs font-bold">Status<select className="field mt-2" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Open</option><option>Closed</option><option>Filled</option></select></label>
            <label className="text-xs font-bold">Location<input className="field mt-2" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label className="text-xs font-bold">Event date<input type="date" className="field mt-2" value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></label>
            <label className="text-xs font-bold">Application deadline<input type="date" className="field mt-2" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></label>
            <label className="text-xs font-bold">Budget ({opportunity.currency ?? 'RWF'})<input type="number" min="0" className="field mt-2" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></label>
            <label className="text-xs font-bold sm:col-span-2">Description<textarea rows={5} className="field mt-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>}
        {confirmDelete && <Modal title="Delete opportunity?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm leading-6 text-muted">Delete this opportunity? This cannot be undone.</p>
          {error && <div className="mt-4"><Notice>{error}</Notice></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={() => void remove()} disabled={busy} className="btn-primary bg-red-700 hover:bg-red-800">{busy ? 'Deleting…' : 'Delete opportunity'}</button>
          </div>
        </Modal>}
      </>}
    </section>
  );
}
