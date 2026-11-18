'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, ExternalLink, MessageCircle } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

type NotificationDetail = {
  id: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
};

export default function NotificationDetailPage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const [notification, setNotification] = useState<NotificationDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<NotificationDetail>(`/notifications/${encodeURIComponent(notificationId)}`)
      .then(async (item) => {
        if (!active) return;
        setNotification(item);
        if (!item.isRead) {
          await api(`/notifications/${encodeURIComponent(item.id)}/read`, { method: 'PATCH' });
          window.dispatchEvent(new Event('rmh:notifications-changed'));
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not open this notification.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [notificationId]);

  return (
    <section className="mx-auto max-w-3xl">
      <Link href="/app/notifications" className="inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={16} /> All notifications</Link>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      {loading && <div className="card mt-5 p-6 text-sm text-muted">Opening notification…</div>}
      {notification && <article className="card mt-5 p-6 md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4eb] text-forest">{notification.type === 'NewMessage' ? <MessageCircle size={22} /> : <Bell size={22} />}</span>
        <p className="eyebrow mt-5">{notification.type.replace(/([a-z])([A-Z])/g, '$1 $2')}</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">Notification details</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#334139]">{notification.content}</p>
        <p className="mt-4 text-xs text-muted">{new Date(notification.createdAt).toLocaleString()}</p>
        {notification.actionUrl && <Link href={notification.actionUrl} className="btn-primary mt-6 inline-flex"><ExternalLink size={16} /> Open related item</Link>}
      </article>}
    </section>
  );
}
