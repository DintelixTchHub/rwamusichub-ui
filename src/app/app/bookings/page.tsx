'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, MapPin, MessageCircle, X } from 'lucide-react';
import { Notice } from '@/components/notice';
import { UserAvatar } from '@/components/user-avatar';
import { api } from '@/lib/api';
import { User } from '@/lib/types';

type Booking = {
  id: string;
  requesterId: string;
  musicianId: string;
  eventTitle: string;
  description?: string | null;
  eventDate: string;
  location?: string | null;
  budget?: string | number | null;
  currency: string;
  responseMessage?: string | null;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Cancelled' | 'Completed';
  requester: User & { profile?: { stageName?: string | null } | null };
  musician: User & { profile?: { stageName?: string | null } | null };
};

const statusLabels: Record<Booking['status'], string> = {
  Pending: 'Waiting for a response',
  Accepted: 'Confirmed',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  Completed: 'Completed',
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [messagingId, setMessagingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, currentUser] = await Promise.all([
        api<Booking[]>('/bookings'),
        api<User>('/auth/me'),
      ]);
      setBookings(items);
      setUser(currentUser);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load booking requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function updateBooking(booking: Booking, status: 'Accepted' | 'Declined' | 'Cancelled' | 'Completed') {
    setBusyId(booking.id);
    setError('');
    try {
      const updated = await api<Booking>(`/bookings/${encodeURIComponent(booking.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, responseMessage: responseDrafts[booking.id] }),
      });
      setBookings((current) => current.map((item) => item.id === updated.id ? updated : item));
      setResponseDrafts((current) => ({ ...current, [booking.id]: '' }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this booking request.');
    } finally {
      setBusyId('');
    }
  }

  async function messagePerson(userId: string) {
    setMessagingId(userId);
    setError('');
    try {
      const conversation = await api<{ id: string }>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId }),
      });
      router.push(`/app/messages?conversationId=${encodeURIComponent(conversation.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open a conversation.');
    } finally {
      setMessagingId('');
    }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <p className="eyebrow">Manage your work</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Bookings</h1>
      <p className="mt-2 text-sm text-muted">Review incoming booking requests and keep track of the events you have requested.</p>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-6 p-6 text-sm text-muted">Loading your bookings…</div>}
      {!loading && bookings.length > 0 && <div className="mt-6 space-y-4">{bookings.map((booking) => {
        const isMusician = booking.musicianId === user?.id;
        const otherPerson = isMusician ? booking.requester : booking.musician;
        return (
          <article key={booking.id} className="card p-5 md:p-6">
            <div className="flex flex-wrap items-start gap-3">
              <UserAvatar src={otherPerson.avatarUrl} name={otherPerson.fullName} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-forest">{isMusician ? 'Booking request from' : 'Requested from'} {otherPerson.profile?.stageName || otherPerson.fullName}</p>
                <h2 className="mt-1 text-lg font-extrabold">{booking.eventTitle}</h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={13} />{new Date(booking.eventDate).toLocaleString()}</span>
                  {booking.location && <span className="inline-flex items-center gap-1"><MapPin size={13} />{booking.location}</span>}
                  {booking.budget != null && <span>{Number(booking.budget).toLocaleString()} {booking.currency}</span>}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#edf4eb] px-3 py-1.5 text-xs font-bold text-forest"><Clock3 size={13} />{statusLabels[booking.status]}</span>
            </div>
            {booking.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted">{booking.description}</p>}
            {booking.responseMessage && <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-muted"><span className="font-bold text-forest">Response: </span>{booking.responseMessage}</p>}
            {isMusician && booking.status === 'Pending' && <label className="mt-4 block text-xs font-bold">Your reply (optional)<textarea maxLength={2000} rows={2} className="field mt-2" value={responseDrafts[booking.id] ?? ''} onChange={(event) => setResponseDrafts((current) => ({ ...current, [booking.id]: event.target.value }))} placeholder="Add a note with your response." /></label>}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {isMusician && booking.status === 'Pending' && <>
                <button onClick={() => void updateBooking(booking, 'Accepted')} disabled={busyId === booking.id} className="btn-primary px-3 py-2 text-xs"><Check size={14} />Accept</button>
                <button onClick={() => void updateBooking(booking, 'Declined')} disabled={busyId === booking.id} className="btn-secondary px-3 py-2 text-xs"><X size={14} />Decline</button>
              </>}
              {isMusician && booking.status === 'Accepted' && <button onClick={() => void updateBooking(booking, 'Completed')} disabled={busyId === booking.id} className="btn-primary px-3 py-2 text-xs"><Check size={14} />Mark completed</button>}
              {(booking.requesterId === user?.id || isMusician) && ['Pending', 'Accepted'].includes(booking.status) && <button onClick={() => void updateBooking(booking, 'Cancelled')} disabled={busyId === booking.id} className="btn-secondary px-3 py-2 text-xs">Cancel request</button>}
              <button onClick={() => void messagePerson(otherPerson.id)} disabled={messagingId === otherPerson.id} className="btn-secondary px-3 py-2 text-xs"><MessageCircle size={14} />{messagingId === otherPerson.id ? 'Opening…' : 'Message'}</button>
            </div>
          </article>
        );
      })}</div>}
      {!loading && bookings.length === 0 && !error && <div className="card mt-6 p-8 text-center">
        <CalendarDays className="mx-auto text-muted" size={24} />
        <h2 className="mt-3 font-extrabold">No bookings yet</h2>
        <p className="mt-1 text-sm text-muted">Requests you send or receive will be easy to follow here.</p>
        <Link href="/app/discover" className="btn-primary mt-4">Find musicians</Link>
      </div>}
    </section>
  );
}
