'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, MessageCircle } from 'lucide-react';
import { Notice } from '@/components/notice';
import { UserAvatar } from '@/components/user-avatar';
import { api } from '@/lib/api';
import { Opportunity, User } from '@/lib/types';

type Application = {
  id: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
  coverLetter?: string | null;
  reviewMessage?: string | null;
  appliedAt: string;
  opportunity: Opportunity & {
    organizer?: User;
    organization?: { id: string; name: string } | null;
  };
};

const statusMessage: Record<Application['status'], string> = {
  Pending: 'Your application is with the organizer.',
  Accepted: 'The organizer would like to move forward with you.',
  Rejected: 'The organizer has finished reviewing this application.',
  Withdrawn: 'You withdrew this application.',
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagingId, setMessagingId] = useState('');

  useEffect(() => {
    api<Application[]>('/opportunities/applications/me')
      .then(setApplications)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load your applications.'))
      .finally(() => setLoading(false));
  }, []);

  async function messageOrganizer(organizerId: string) {
    setMessagingId(organizerId);
    setError('');
    try {
      const conversation = await api<{ id: string }>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: organizerId }),
      });
      router.push(`/app/messages?conversationId=${encodeURIComponent(conversation.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open a conversation with the organizer.');
    } finally {
      setMessagingId('');
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <p className="eyebrow">Keep track of your next step</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">My applications</h1>
      <p className="mt-2 text-sm text-muted">See where each opportunity application stands and read updates from organizers.</p>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-6 p-6 text-sm text-muted">Loading your applications…</div>}
      {!loading && applications.length > 0 && <div className="mt-6 space-y-4">{applications.map((application) => (
        <article key={application.id} className="card p-5 md:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <UserAvatar src={application.opportunity.organizer?.avatarUrl} name={application.opportunity.organizer?.fullName ?? application.opportunity.organization?.name} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">{application.opportunity.organization?.name ?? application.opportunity.organizer?.fullName ?? 'Opportunity organizer'}</p>
              <h2 className="mt-1 text-lg font-extrabold">{application.opportunity.title}</h2>
              <p className="mt-1 text-xs text-muted">Applied {new Date(application.appliedAt).toLocaleDateString()}</p>
            </div>
            <span className="rounded-full bg-[#edf4eb] px-3 py-1 text-xs font-bold text-forest">{application.status}</span>
          </div>
          <p className="mt-4 text-sm text-muted">{statusMessage[application.status]}</p>
          {application.reviewMessage && <div className="mt-3 rounded-xl bg-canvas p-4"><p className="text-xs font-bold text-forest">Organizer update</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6">{application.reviewMessage}</p></div>}
          {application.coverLetter && <p className="mt-3 line-clamp-3 text-sm text-muted">{application.coverLetter}</p>}
          <div className="mt-4 flex flex-wrap gap-2"><Link href={`/app/opportunities/${application.opportunity.id}`} className="btn-secondary inline-flex px-3 py-2 text-xs"><BriefcaseBusiness size={14} />View application <ArrowUpRight size={14} /></Link>{application.opportunity.organizer && <button onClick={() => { const organizerId = application.opportunity.organizer?.id; if (organizerId) void messageOrganizer(organizerId); }} disabled={messagingId === application.opportunity.organizer?.id} className="btn-secondary inline-flex px-3 py-2 text-xs"><MessageCircle size={14} />{messagingId === application.opportunity.organizer?.id ? 'Opening…' : 'Message organizer'}</button>}</div>
        </article>
      ))}</div>}
      {!loading && applications.length === 0 && !error && <div className="card mt-6 p-8 text-center">
        <BriefcaseBusiness className="mx-auto text-muted" size={24} />
        <h2 className="mt-3 font-extrabold">No applications to track yet</h2>
        <p className="mt-1 text-sm text-muted">When you apply to an opportunity, its progress will show up here.</p>
        <Link href="/app/opportunities" className="btn-primary mt-4">Explore opportunities</Link>
      </div>}
    </section>
  );
}
