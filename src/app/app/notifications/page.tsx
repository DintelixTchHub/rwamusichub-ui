'use client';

import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Bell, CheckCheck, MessageCircle } from 'lucide-react';
import { Notice } from '@/components/notice';
import { api, getAccessToken, SOCKET_URL } from '@/lib/api';
import { NotificationItem } from '@/lib/types';

type NotificationResponse = { unreadCount: number; items: NotificationItem[] };

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationResponse>({ unreadCount: 0, items: [] });
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<NotificationResponse>('/notifications');
      setData(result);
      setHasMore(result.items.length === 50);
      setError('');
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load notifications.'); }
  }, []);

  useEffect(() => {
    void load();
    const token = getAccessToken();
    if (!token) return;

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => void load());
    socket.on('notification:new', () => void load());
    socket.on('connect_error', () => setError('Live notification updates are unavailable. Refresh to check for new activity.'));
    return () => { socket.disconnect(); };
  }, [load]);

  async function loadMore() {
    const beforeId = data.items[data.items.length - 1]?.id;
    if (!beforeId || loadingMore) return;

    setLoadingMore(true);
    try {
      const older = await api<NotificationResponse>(`/notifications?beforeId=${encodeURIComponent(beforeId)}`);
      setData((current) => {
        const existingIds = new Set(current.items.map(({ id }) => id));
        return {
          unreadCount: older.unreadCount,
          items: [...current.items, ...older.items.filter(({ id }) => !existingIds.has(id))],
        };
      });
      setHasMore(older.items.length === 50);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setData((current) => ({ unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map((item) => item.id === id ? { ...item, isRead: true } : item) }));
      window.dispatchEvent(new Event('rmh:notifications-changed'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update notification.'); }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setData((current) => ({ unreadCount: 0, items: current.items.map((item) => ({ ...item, isRead: true })) }));
      window.dispatchEvent(new Event('rmh:notifications-changed'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update notifications.'); }
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Stay in the loop</p><h1 className="mt-2 text-3xl font-black tracking-tight">Notifications</h1><p className="mt-2 text-sm text-muted">{data.unreadCount} unread updates</p></div><button onClick={() => void markAllRead()} disabled={!data.unreadCount} className="btn-secondary"><CheckCheck size={16} /> Mark all as read</button></div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <div className="mt-6 space-y-3">{data.items.map((item) => <article key={item.id} className={`card flex items-start gap-4 p-4 md:p-5 ${item.isRead ? '' : 'border-l-4 border-lime'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf4eb] text-forest">{item.type === 'NewMessage' ? <MessageCircle size={19} /> : <Bell size={19} />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.content}</p><p className="mt-1 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p></div>{!item.isRead && <button onClick={() => void markRead(item.id)} className="text-xs font-bold text-forest">Mark read</button>}</article>)}</div>
      {hasMore && <button onClick={() => void loadMore()} disabled={loadingMore} className="btn-secondary mt-5 w-full py-3">{loadingMore ? 'Loading…' : 'Load older notifications'}</button>}
      {data.items.length === 0 && !error && <div className="card mt-5 p-10 text-center"><Bell className="mx-auto text-muted" /><h2 className="mt-3 font-extrabold">You&apos;re all caught up</h2><p className="mt-1 text-sm text-muted">New activity from your community will show up here.</p></div>}
    </section>
  );
}
