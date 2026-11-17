'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Check, CheckCheck, ImagePlus, MessageCircle, Mic, Plus, Search, Send, Smile, Square, UserRoundPlus, X } from 'lucide-react';
import { Notice } from '@/components/notice';
import { getAccessToken, SOCKET_URL, api, uploadMedia } from '@/lib/api';
import { Conversation, Message, User } from '@/lib/types';

const CHAT_EMOJIS = ['😀', '😂', '😍', '❤️', '👏', '🙏', '🔥', '🎵', '🎤', '🎉'];
const MAX_CHAT_MEDIA_BYTES = 15 * 1024 * 1024;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VOICE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];

type PrivateAttachment = { id: string };

function MessageContent({ message }: { message: Message }) {
  const [url, setUrl] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if ((message.type !== 'Image' && message.type !== 'Audio') || !message.content) return;
    if (/^https?:\/\//i.test(message.content)) {
      setUrl(message.content);
      return;
    }

    let active = true;
    api<{ url: string }>(`/messaging/conversations/${encodeURIComponent(message.conversationId)}/media/${encodeURIComponent(message.content)}`)
      .then(({ url: signedUrl }) => { if (active) setUrl(signedUrl); })
      .catch((reason: unknown) => { if (active) setLoadError(reason instanceof Error ? reason.message : 'Attachment could not be loaded.'); });
    return () => { active = false; };
  }, [message.content, message.conversationId, message.type]);

  if (message.type === 'Image') {
    return loadError
      ? <p className="text-xs text-red-700">{loadError}</p>
      : url
        ? <img src={url} alt="Chat attachment" className="max-h-80 max-w-full rounded-xl object-contain" />
        : <p className="text-xs text-muted">Loading photo…</p>;
  }
  if (message.type === 'Audio') {
    return loadError
      ? <p className="text-xs text-red-700">{loadError}</p>
      : url
        ? <audio controls preload="metadata" src={url} className="max-w-full" aria-label="Voice note" />
        : <p className="text-xs text-muted">Loading voice note…</p>;
  }
  return <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>;
}

function otherParticipant(conversation: Conversation, currentUserId?: string) {
  return conversation.members.find((member) => member.userId !== currentUserId)?.user;
}

type PersonSearchResult = {
  id: string;
  stageName?: string | null;
  headline?: string | null;
  city?: string | null;
  user: { id: string; fullName: string; username: string };
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [draft, setDraft] = useState('');
  const [typingUserId, setTypingUserId] = useState('');
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleResults, setPeopleResults] = useState<PersonSearchResult[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const [sendingAttachment, setSendingAttachment] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const preserveScrollRef = useRef(false);
  const selectedIdRef = useRef('');
  const currentUserIdRef = useRef('');
  const incomingTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = peopleSearch.trim();
    if (!newConversationOpen || query.length < 2) {
      setPeopleResults([]);
      setSearchingPeople(false);
      return;
    }

    let active = true;
    setSearchingPeople(true);
    const timer = window.setTimeout(() => {
      api<PersonSearchResult[]>(`/profiles?search=${encodeURIComponent(query)}`)
        .then((results) => {
          if (active) setPeopleResults(results.filter((person) => person.user.id !== currentUser?.id));
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : 'Could not search people.');
        })
        .finally(() => {
          if (active) setSearchingPeople(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [peopleSearch, newConversationOpen, currentUser?.id]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? '';
  }, [currentUser?.id]);

  useEffect(() => {
    let active = true;
    Promise.all([api<Conversation[]>('/messaging/conversations'), api<User>('/auth/me')])
      .then(async ([conversationList, user]) => {
        if (!active) return;
        setConversations(conversationList);
        setHasMoreConversations(conversationList.length === 50);
        setCurrentUser(user);
        const query = new URLSearchParams(window.location.search);
        const requestedConversationId = query.get('conversationId');
        const requestedConversation = conversationList.find(({ id }) => id === requestedConversationId);
        if (requestedConversation) setSelectedId(requestedConversation.id);
        else if (query.get('groupId')) {
          const groupConversation = await api<Conversation>(`/groups/${encodeURIComponent(query.get('groupId')!)}/conversation`, { method: 'POST' });
          if (!active) return;
          setConversations((current) => [groupConversation, ...current.filter(({ id }) => id !== groupConversation.id)]);
          setSelectedId(groupConversation.id);
        }
        else if (conversationList[0]) setSelectedId(conversationList[0].id);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load messages.'));

    const token = getAccessToken();
    if (!token) return () => { active = false; };

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setSocketReady(true));
    socket.on('disconnect', () => setSocketReady(false));
    socket.on('connect_error', () => setError('Real-time chat connection failed. Check that the backend Socket.IO gateway is running.'));
    socket.on('auth-error', (payload: { message?: string }) => setError(payload.message ?? 'Socket authentication failed.'));
    socket.on('message-error', (payload: { message?: string }) => setError(payload.message ?? 'Message could not be sent.'));
    socket.on('read-error', (payload: { message?: string }) => setError(payload.message ?? 'Could not synchronize read status.'));
    socket.on('typing', (payload: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (payload.conversationId !== selectedIdRef.current || payload.userId === currentUserIdRef.current) return;
      if (incomingTypingTimeoutRef.current) clearTimeout(incomingTypingTimeoutRef.current);
      setTypingUserId(payload.isTyping ? payload.userId : '');
      if (payload.isTyping) {
        incomingTypingTimeoutRef.current = setTimeout(() => setTypingUserId(''), 3000);
      }
    });
    socket.on('new-message', (message: Message) => {
      if (message.conversationId === selectedIdRef.current) {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        socket.emit('messages-delivered', { conversationId: message.conversationId, messageIds: [message.id] });
        socket.emit('mark-read', { conversationId: message.conversationId });
        setTypingUserId('');
      }
      setConversations((current) => {
        const found = current.some((conversation) => conversation.id === message.conversationId);
        if (!found) return current;
        return current.map((conversation) => conversation.id === message.conversationId ? { ...conversation, messages: [message] } : conversation);
      });
    });
    socket.on('messages-read', (receipt: { conversationId: string; userId: string; messageIds: string[]; updatedCount: number }) => {
      setMessages((current) => current.map((message) => message.conversationId === receipt.conversationId && receipt.messageIds.includes(message.id)
        ? { ...message, receipts: (message.receipts ?? []).map((item) => item.userId === receipt.userId ? { ...item, readAt: new Date().toISOString() } : item) }
        : message));
      if (receipt.userId === currentUserIdRef.current) {
        window.dispatchEvent(new Event('rmh:notifications-changed'));
      }
    });
    socket.on('messages-delivered', (receipt: { conversationId: string; userId: string; messageIds: string[] }) => {
      setMessages((current) => current.map((message) => message.conversationId === receipt.conversationId && receipt.messageIds.includes(message.id)
        ? { ...message, receipts: (message.receipts ?? []).map((item) => item.userId === receipt.userId ? { ...item, deliveredAt: new Date().toISOString() } : item) }
        : message));
    });

    return () => {
      active = false;
      if (incomingTypingTimeoutRef.current) clearTimeout(incomingTypingTimeoutRef.current);
      if (outgoingTypingTimeoutRef.current) clearTimeout(outgoingTypingTimeoutRef.current);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setTypingUserId('');
    api<Message[]>(`/messaging/conversations/${selectedId}/messages`)
      .then((items) => {
        if (!active) return;
        setMessages(items);
        setHasOlderMessages(items.length === 50);
        socketRef.current?.emit('join-room', { conversationId: selectedId });
        socketRef.current?.emit('mark-read', { conversationId: selectedId });
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load conversation.'));
    return () => {
      active = false;
      socketRef.current?.emit('leave-room', { conversationId: selectedId });
    };
  }, [selectedId, socketReady]);

  useEffect(() => {
    if (preserveScrollRef.current) {
      preserveScrollRef.current = false;
      return;
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const participant = selected?.type === 'Direct' ? otherParticipant(selected, currentUser?.id) : undefined;
  const filtered = conversations.filter((conversation) => {
    const person = conversation.type === 'Direct' ? otherParticipant(conversation, currentUser?.id) : undefined;
    const label = `${person?.fullName ?? ''} ${conversation.title ?? ''}`.toLowerCase();
    return label.includes(search.toLowerCase());
  });

  async function startConversation(targetUserId: string) {
    if (startingConversation) return;
    setStartingConversation(true);
    setError('');
    try {
      const conversation = await api<Conversation>('/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      setConversations((current) => [conversation, ...current.filter(({ id }) => id !== conversation.id)]);
      setSelectedId(conversation.id);
      setNewConversationOpen(false);
      setPeopleSearch('');
      setPeopleResults([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start conversation.');
    } finally {
      setStartingConversation(false);
    }
  }

  async function loadMoreConversations() {
    const beforeId = conversations[conversations.length - 1]?.id;
    if (!beforeId || loadingMoreConversations) return;

    setLoadingMoreConversations(true);
    try {
      const older = await api<Conversation[]>(`/messaging/conversations?beforeId=${encodeURIComponent(beforeId)}`);
      setConversations((current) => {
        const existingIds = new Set(current.map(({ id }) => id));
        return [...current, ...older.filter(({ id }) => !existingIds.has(id))];
      });
      setHasMoreConversations(older.length === 50);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load more conversations.');
    } finally {
      setLoadingMoreConversations(false);
    }
  }

  async function loadOlderMessages() {
    const beforeId = messages[0]?.id;
    const container = messagesContainerRef.current;
    if (!beforeId || !container || loadingOlderMessages) return;

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;
    setLoadingOlderMessages(true);
    try {
      const older = await api<Message[]>(
        `/messaging/conversations/${selectedId}/messages?beforeId=${encodeURIComponent(beforeId)}`,
      );
      preserveScrollRef.current = true;
      setMessages((current) => [...older, ...current]);
      setHasOlderMessages(older.length === 50);
      requestAnimationFrame(() => {
        const currentContainer = messagesContainerRef.current;
        if (currentContainer) {
          currentContainer.scrollTop = previousTop + currentContainer.scrollHeight - previousHeight;
        }
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load older messages.');
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !selectedId) return;
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('Chat is offline. Reconnect before sending a message.');
      return;
    }
    if (outgoingTypingTimeoutRef.current) clearTimeout(outgoingTypingTimeoutRef.current);
    socket.emit('stop-typing', { conversationId: selectedId });
    socket.emit('send-message', { conversationId: selectedId, type: 'Text', content: draft.trim() });
    setDraft('');
    setError('');
  }

  async function sendChatMedia(file: File, type: 'Image' | 'Audio') {
    if (!selectedId) return;
    if (!socketRef.current?.connected) {
      setError('Chat is offline. Reconnect before sending an attachment.');
      return;
    }
    if (!file.size || file.size > MAX_CHAT_MEDIA_BYTES) {
      setError('Attachments must be 15 MB or smaller.');
      return;
    }
    setSendingAttachment(true);
    setError('');
    try {
      const asset = await uploadMedia<PrivateAttachment>(file, type === 'Image' ? 'Post' : 'Audio', 'Private');
      if (!asset.id) throw new Error('The upload completed without an attachment id.');
      const socket = socketRef.current;
      if (!socket?.connected) throw new Error('Chat disconnected while the attachment was uploading. Please retry.');
      socket.emit('send-message', { conversationId: selectedId, type, content: asset.id });
      setEmojiPickerOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send this attachment.');
    } finally {
      setSendingAttachment(false);
    }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!IMAGE_MIME_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP photo.');
      return;
    }
    void sendChatMedia(file, 'Image');
  }

  async function startVoiceNote() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported by this browser.');
      return;
    }

    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = VOICE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceStreamRef.current = stream;
      voiceRecorderRef.current = recorder;
      voiceChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) voiceChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecordingVoice(false);
        setError('Voice recording failed. Check microphone permissions and try again.');
      };
      recorder.onstop = () => {
        if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
        stream.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        setRecordingVoice(false);
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(voiceChunksRef.current, { type });
        voiceChunksRef.current = [];
        if (blob.size) {
          void sendChatMedia(new File([blob], `voice-note-${Date.now()}.webm`, { type }), 'Audio');
        }
      };
      recorder.start(250);
      setRecordingVoice(true);
      voiceTimeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 120_000);
    } catch (reason) {
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
      voiceStreamRef.current = null;
      setError(reason instanceof Error ? reason.message : 'Could not access the microphone.');
    }
  }

  function stopVoiceNote() {
    const recorder = voiceRecorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  }

  function updateDraft(value: string) {
    setDraft(value);
    const socket = socketRef.current;
    if (!selectedId || !socket?.connected) return;

    socket.emit(value.trim() ? 'typing' : 'stop-typing', { conversationId: selectedId });
    if (outgoingTypingTimeoutRef.current) clearTimeout(outgoingTypingTimeoutRef.current);
    if (value.trim()) {
      outgoingTypingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { conversationId: selectedId });
      }, 1500);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="grid min-h-[min(760px,calc(100vh-150px))] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`border-r border-line ${selectedId ? 'hidden lg:block' : ''}`}>
          <div className="border-b border-line p-5"><div className="flex items-center justify-between"><div><p className="eyebrow">Stay connected</p><h1 className="mt-1 text-xl font-black">Messages</h1></div><div className="flex items-center gap-2"><button type="button" onClick={() => { setNewConversationOpen((open) => !open); setPeopleSearch(''); setPeopleResults([]); setError(''); }} aria-label={newConversationOpen ? 'Close new conversation search' : 'Start a new conversation'} className="rounded-lg p-2 text-forest hover:bg-[#edf4eb]">{newConversationOpen ? <X size={18} /> : <Plus size={18} />}</button><span className={`h-2.5 w-2.5 rounded-full ${socketReady ? 'bg-emerald-500' : 'bg-amber-400'}`} title={socketReady ? 'Connected' : 'Connecting'} /></div></div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-3"><Search size={16} className="text-muted" /><input className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search conversations" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            {newConversationOpen && <div className="mt-3 rounded-xl border border-line p-3">
              <label className="mb-2 flex items-center gap-2 text-xs font-bold"><UserRoundPlus size={15} className="text-forest" /> New conversation</label>
              <div className="flex items-center gap-2 rounded-lg bg-canvas px-3"><Search size={14} className="shrink-0 text-muted" /><input autoFocus className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search people by name or username" placeholder="Search by name or username" value={peopleSearch} onChange={(event) => setPeopleSearch(event.target.value)} /></div>
              {error && <div className="mt-2"><Notice>{error}</Notice></div>}
              <div className="mt-2 max-h-56 overflow-y-auto">
                {searchingPeople && <p className="p-3 text-xs text-muted">Searching people…</p>}
                {!searchingPeople && peopleSearch.trim().length < 2 && <p className="p-3 text-xs text-muted">Type at least two characters to find people.</p>}
                {!searchingPeople && peopleSearch.trim().length >= 2 && peopleResults.length === 0 && <p className="p-3 text-xs text-muted">No public profiles match that search.</p>}
                {peopleResults.map((person) => <button key={person.user.id} type="button" onClick={() => void startConversation(person.user.id)} disabled={startingConversation} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-canvas disabled:opacity-60">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-forest">{person.user.fullName[0] ?? 'M'}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{person.stageName || person.user.fullName}</span><span className="block truncate text-[11px] text-muted">@{person.user.username}{person.city ? ` · ${person.city}` : ''}</span></span>
                  <span className="text-[11px] font-bold text-forest">{startingConversation ? 'Starting…' : 'Message'}</span>
                </button>)}
              </div>
            </div>}
          </div>
          <div className="max-h-[570px] overflow-y-auto p-2">
            {filtered.map((conversation) => {
              const person = conversation.type === 'Direct' ? otherParticipant(conversation, currentUser?.id) : undefined;
              const lastMessage = conversation.messages[0];
              const preview = lastMessage?.type === 'Image'
                ? '📷 Photo'
                : lastMessage?.type === 'Audio'
                  ? '🎙 Voice note'
                  : lastMessage?.content ?? 'Start a conversation';
              return <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${selectedId === conversation.id ? 'bg-[#edf4eb]' : 'hover:bg-canvas'}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime font-extrabold text-forest">{person?.fullName?.[0] ?? conversation.title?.[0] ?? 'M'}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{person?.fullName ?? conversation.title ?? 'Conversation'}</span><span className="mt-1 block truncate text-xs text-muted">{preview}</span></span>
              </button>;
            })}
            {filtered.length === 0 && <p className="p-5 text-center text-xs text-muted">No conversations yet. Use + to find someone and start a chat.</p>}
            {hasMoreConversations && <button onClick={() => void loadMoreConversations()} disabled={loadingMoreConversations} className="w-full p-3 text-xs font-bold text-forest">{loadingMoreConversations ? 'Loading…' : 'Load more conversations'}</button>}
          </div>
        </aside>
        <div className={`flex min-w-0 flex-col ${!selectedId ? 'hidden lg:flex' : ''}`}>
          {error && <div className="px-4 pt-3"><Notice>{error}</Notice></div>}
          {selected ? <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-4 md:px-6"><button onClick={() => setSelectedId('')} className="mr-1 text-sm font-bold text-forest lg:hidden">‹ Back</button><span className="grid h-10 w-10 place-items-center rounded-full bg-[#edf4eb] font-bold text-forest">{participant?.fullName?.[0] ?? selected.title?.[0] ?? 'M'}</span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold">{participant?.fullName ?? selected.title ?? 'Conversation'}</h2><p className="text-xs text-muted">{typingUserId ? `${participant?.fullName ?? 'Someone'} is typing…` : socketReady ? 'Connected' : 'Reconnecting…'}</p></div></header>
            <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto bg-[#fbfcfa] p-4 md:p-6">
              {hasOlderMessages && <button onClick={() => void loadOlderMessages()} disabled={loadingOlderMessages} className="mx-auto block rounded-lg px-4 py-2 text-xs font-bold text-forest hover:bg-[#edf4eb]">{loadingOlderMessages ? 'Loading…' : 'Load older messages'}</button>}
              {messages.map((message) => {
                const own = message.senderId === currentUser?.id;
                const receipt = message.receipts?.[0];
                return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${own ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md border border-line bg-white text-ink'}`}><MessageContent message={message} /><div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? 'text-white/60' : 'text-muted'}`}><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{own && (receipt?.readAt ? <CheckCheck size={14} /> : receipt?.deliveredAt ? <CheckCheck size={14} /> : <Check size={13} />)}</div></div></div>;
              })}
              {messages.length === 0 && <div className="grid h-full place-items-center text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><MessageCircle /></span><p className="mt-3 text-sm font-bold">Say hello</p><p className="mt-1 text-xs text-muted">Start a conversation and make a connection.</p></div></div>}
              <div ref={scrollRef} />
            </div>
            <div className="border-t border-line p-3 md:p-4">
              {emojiPickerOpen && <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-canvas p-2">{CHAT_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => updateDraft(`${draft}${emoji}`)} aria-label={`Insert ${emoji}`} className="rounded-lg p-2 text-xl hover:bg-white">{emoji}</button>)}</div>}
              <form onSubmit={send} className="flex items-center gap-2 md:gap-3">
                <button type="button" aria-label="Choose emoji" onClick={() => setEmojiPickerOpen((open) => !open)} className="rounded-lg p-2 text-forest hover:bg-[#edf4eb]"><Smile size={19} /></button>
                <input ref={attachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choosePhoto} />
                <button type="button" aria-label="Send photo" disabled={sendingAttachment || recordingVoice} onClick={() => attachmentInputRef.current?.click()} className="rounded-lg p-2 text-forest hover:bg-[#edf4eb] disabled:opacity-50"><ImagePlus size={19} /></button>
                {recordingVoice
                  ? <button type="button" aria-label="Stop voice note recording" onClick={stopVoiceNote} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Square size={18} /></button>
                  : <button type="button" aria-label="Record voice note" disabled={sendingAttachment} onClick={() => void startVoiceNote()} className="rounded-lg p-2 text-forest hover:bg-[#edf4eb] disabled:opacity-50"><Mic size={19} /></button>}
                <input className="field min-w-0 flex-1 bg-canvas" placeholder={recordingVoice ? 'Recording voice note…' : sendingAttachment ? 'Sending attachment…' : 'Write a message…'} value={draft} disabled={recordingVoice || sendingAttachment} onChange={(e) => updateDraft(e.target.value)} />
                <button disabled={!draft.trim() || sendingAttachment || recordingVoice} className="btn-primary px-3 md:px-4"><Send size={16} /><span className="hidden sm:inline">Send</span></button>
              </form>
              <p className="mt-2 text-[10px] text-muted">{recordingVoice ? 'Recording… select stop to send your voice note.' : 'Photos and voice notes are private to this conversation.'}</p>
            </div>
          </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4eb] text-forest"><MessageCircle size={25} /></span><h2 className="mt-4 font-extrabold">Your next connection starts here</h2><p className="mt-1 max-w-sm text-sm text-muted">Choose a conversation or search for someone by name or username.</p></div></div>}
        </div>
      </div>
    </section>
  );
}
