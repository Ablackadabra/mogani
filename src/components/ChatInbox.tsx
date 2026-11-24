import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FileAudio,
  History,
  ImagePlus,
  MessageSquare,
  Mic,
  Search,
  Send,
  ShieldCheck,
  Square,
  Trash2,
  UserPlus,
  Volume2,
  X,
  ZoomIn,
} from 'lucide-react';
import { ChatContact, ChatMessage, Conversation, Language, PublicUser } from '../types';
import { getCopy } from '../i18n';
import { compressImageFile, formatRwf } from '../utils/image';
import {
  adminDeleteConversation,
  adminDeleteMessage,
  fetchChatContacts,
  fetchConversations,
  fetchMessages,
  openConversation,
  sendChatMessage,
  updateProfile,
  uploadChatAudioFile,
} from '../api';

interface ChatInboxProps {
  lang: Language;
  user: PublicUser | null;
  initialConversationId?: string | null;
  embedded?: boolean;
  onOpenAuth: () => void;
  onUserUpdated?: (user: PublicUser) => void;
}

export function ChatInbox({
  lang,
  user,
  initialConversationId,
  embedded = false,
  onOpenAuth,
  onUserUpdated,
}: ChatInboxProps) {
  const t = getCopy(lang);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatTopic, setNewChatTopic] = useState('');

  const [text, setText] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Voice / Audio recording & upload state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [audioDurationSec, setAudioDurationSec] = useState<number | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedId(initialConversationId);
    }
  }, [initialConversationId]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    Promise.all([fetchConversations(), fetchChatContacts()])
      .then(([convRes, contactRes]) => {
        if (!active) return;
        setConversations(convRes.conversations);
        setContacts(contactRes.contacts);
        if (!selectedId && convRes.conversations.length > 0) {
          setSelectedId(convRes.conversations[0].id);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Poll conversation list every 5s so new incoming chats appear automatically
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      fetchConversations()
        .then((res) => setConversations(res.conversations))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !selectedId) return;
    let active = true;
    const load = () => {
      fetchMessages(selectedId)
        .then((res) => {
          if (!active) return;
          setMessages(res.messages);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user?.id, selectedId]);

  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length, selectedId]);

  if (!user) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-5">
        <MessageSquare className="w-8 h-8 text-[#7C4D25] mx-auto" />
        <h1 className="font-display text-3xl font-medium text-[#1C1917]">{t.messagesTitle}</h1>
        <p className="text-base text-[#57534E]">{t.signInToChat}</p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer"
        >
          {t.signIn}
        </button>
      </section>
    );
  }

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      conv.buyerName.toLowerCase().includes(q) ||
      conv.sellerName.toLowerCase().includes(q) ||
      conv.workshopName.toLowerCase().includes(q) ||
      conv.productTitle.toLowerCase().includes(q) ||
      conv.lastMessage.toLowerCase().includes(q)
    );
  });

  const activeConversation = conversations.find((c) => c.id === selectedId) || null;
  const isAdmin = user.role === 'admin';
  const canSendChat = isAdmin || user.permissions?.canSendChat !== false;

  async function handleAdminDeleteConversation(convId: string) {
    if (!isAdmin) return;
    setDeletingId(convId);
    setError('');
    try {
      await adminDeleteConversation(convId);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== convId);
        if (selectedId === convId) {
          setSelectedId(remaining[0]?.id || null);
          setMessages([]);
        }
        return remaining;
      });
      setConfirmDeleteConvId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete conversation.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAdminDeleteMessage(msgId: string) {
    if (!isAdmin) return;
    setDeletingId(msgId);
    setError('');
    try {
      const res = await adminDeleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (res.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === res.conversation!.id ? res.conversation! : c))
        );
      }
      setConfirmDeleteMsgId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete message.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStartChat(contact: ChatContact) {
    setStartingChat(true);
    setError('');
    try {
      const customTopic = newChatTopic.trim();
      const defaultTopic =
        contact.role === 'admin'
          ? lang === 'rw'
            ? 'Ubufasha & Ibibazo kuri JOKEVE'
            : 'JOKEVE Support & Direct Chat'
          : lang === 'rw'
          ? `Ikiganiro na ${contact.name}`
          : `Direct Chat · ${contact.name}`;

      const res = await openConversation({
        targetUserId: contact.id,
        sellerId: contact.id,
        sellerName: contact.name,
        workshopName: contact.workshopName || contact.name,
        productTitle: customTopic || defaultTopic,
        productImageUrl: contact.avatarUrl,
        forceNew: true,
      });
      setConversations((prev) => [
        res.conversation,
        ...prev.filter((c) => c.id !== res.conversation.id),
      ]);
      setSelectedId(res.conversation.id);
      setMessages(res.messages);
      setNewChatTopic('');
      setNewChatOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open conversation.');
    } finally {
      setStartingChat(false);
    }
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageFile(file, 960);
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach image.');
    }
    e.target.value = '';
  }

  async function handleAvatarUpdate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setError('');
    try {
      const compressed = await compressImageFile(file, 360);
      const res = await updateProfile({ avatarUrl: compressed });
      onUserUpdated?.(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile photo.');
    }
  }

  function clearDraftAudio() {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl('');
    setAudioDurationSec(undefined);
  }

  async function handleStartRecording() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(
        lang === 'rw'
          ? 'Microphone ntiboneka kuri iyi browser — koresha "Shyiramo Ijwi" utore file ya audio.'
          : 'Live microphone recording is unavailable here — use Upload Audio to attach a clip.'
      );
      return;
    }

    clearDraftAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const candidateTypes = ['audio/webm', 'audio/ogg', 'audio/mp4'];
      const chosenType = candidateTypes.find((mt) => MediaRecorder.isTypeSupported(mt));
      const recorder = chosenType
        ? new MediaRecorder(stream, { mimeType: chosenType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recordSecondsRef.current = 0;
      setRecordSeconds(0);

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        stream.getTracks().forEach((tr) => tr.stop());
        mediaStreamRef.current = null;
        setIsRecording(false);

        const mime = (recorder.mimeType || chosenType || 'audio/webm').split(';')[0].trim();
        const blob = new Blob(audioChunksRef.current, { type: mime });
        if (blob.size > 128) {
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioPreviewUrl(url);
          setAudioDurationSec(Math.max(1, recordSecondsRef.current));
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      setError(
        lang === 'rw'
          ? 'Emerera browser gukoresha microphone cyangwa ushyiremo file y’ijwi (Audio).'
          : 'Microphone access denied. Allow mic permission or use Upload Audio instead.'
      );
    }
  }

  function handleStopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  function handleCancelRecording() {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tr) => tr.stop());
      mediaStreamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordSeconds(0);
  }

  function handleAudioFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError(lang === 'rw' ? 'Ijwi rigomba kuba munsi ya 10 MB.' : 'Audio file must be under 10 MB.');
      return;
    }
    clearDraftAudio();
    const url = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioPreviewUrl(url);
    const probe = new Audio(url);
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setAudioDurationSec(Math.max(1, Math.round(probe.duration)));
      }
    };
    e.target.value = '';
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const trimmed = text.trim();
    const parsedOffer = offerPrice.trim() ? Number(offerPrice.replace(/[^\d]/g, '')) : undefined;
    if (!trimmed && !parsedOffer && !imageUrl && !audioBlob) return;

    setSending(true);
    setError('');
    try {
      let uploadedAudioUrl: string | undefined = undefined;
      if (audioBlob) {
        const up = await uploadChatAudioFile(audioBlob);
        uploadedAudioUrl = up.audioUrl;
      }

      const res = await sendChatMessage(selectedId, {
        text:
          trimmed ||
          (uploadedAudioUrl
            ? lang === 'rw'
              ? 'Nohereje ubutumwa bw’ijwi'
              : 'Voice message'
            : imageUrl
            ? lang === 'rw'
              ? 'Nohereje ifoto'
              : 'Shared a photo'
            : `Offer: ${formatRwf(parsedOffer || 0)}`),
        imageUrl: imageUrl || undefined,
        audioUrl: uploadedAudioUrl,
        audioDurationSec: uploadedAudioUrl ? audioDurationSec : undefined,
        offerPriceRwf: parsedOffer && parsedOffer >= 1000 ? parsedOffer : undefined,
      });
      setMessages((prev) => [...prev, res.message]);
      setConversations((prev) =>
        [res.conversation, ...prev.filter((c) => c.id !== res.conversation.id)]
      );
      setText('');
      setOfferPrice('');
      setImageUrl('');
      clearDraftAudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  function formatMsgTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatHistoryDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDayDivider(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    if (d.toDateString() === today.toDateString()) {
      return lang === 'rw' ? 'Uyu munsi' : 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return lang === 'rw' ? 'Ejo hashize' : 'Yesterday';
    }
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatSecs(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getPartnerHeadline(conv: Conversation): string {
    if (user?.role === 'admin') {
      return `${conv.buyerName} ↔ ${conv.workshopName}`;
    }
    return conv.buyerId === user?.id ? `${conv.sellerName} · ${conv.workshopName}` : conv.buyerName;
  }

  const wrapperClass = embedded
    ? 'space-y-4'
    : 'max-w-7xl mx-auto px-6 py-10 space-y-6';

  return (
    <section className={wrapperClass}>
      {/* Dedicated Chat Page Header (Identical for all users & Admin) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#7C4D25]">
            <MessageSquare className="w-4 h-4" />
            <span>
              {lang === 'rw'
                ? 'Uruganiriro Rwihariye (Amafoto, Amajwi & Amateka y’Ibiganiro)'
                : 'Dedicated Uruganiriro Messaging (Photos, Voice Notes & Full History)'}
            </span>
          </div>
          <h1 className="font-display text-3xl font-medium text-[#1C1917]">{t.messagesTitle}</h1>
          <p className="text-xs sm:text-sm text-[#57534E]">
            {lang === 'rw'
              ? 'Ohereza amafoto, fata ubutumwa bw’ijwi (voice notes), reba ibiganiro byabanje cyangwa utangire ikiganiro gishya.'
              : 'Share furniture photos, record or upload voice messages, browse past conversation history, or start a new chat.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user.id !== 'admin-root' && (
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1C1917] bg-white border border-[#D6D3D1] rounded-md hover:bg-[#F2EFE9] cursor-pointer whitespace-nowrap">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <Camera className="w-3.5 h-3.5 text-[#7C4D25]" />
              )}
              <span>{lang === 'rw' ? 'Ifoto Yawe (Avatar)' : 'Your Chat Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpdate}
                className="sr-only"
              />
            </label>
          )}

          <button
            type="button"
            onClick={() => setNewChatOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer whitespace-nowrap"
          >
            {newChatOpen ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>
              {newChatOpen
                ? lang === 'rw'
                  ? 'Funga'
                  : 'Close'
                : lang === 'rw'
                ? 'Kora Ikiganiro Gishya'
                : 'New Conversation'}
            </span>
          </button>
        </div>
      </div>

      {/* Start New Conversation Panel */}
      {newChatOpen && (
        <div className="p-4 sm:p-5 bg-white border border-[#D6D3D1] rounded-lg space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#1C1917]">
                {lang === 'rw'
                  ? 'Tangira Ikiganiro Gishya (New Chat)'
                  : 'Start a Brand-New Conversation'}
              </h2>
              <p className="text-xs text-[#57534E]">
                {lang === 'rw'
                  ? 'Andika umutwe w’ikiganiro ushaka maze uhitemo uwo muganira (Admin, Umufundi cyangwa Umukiriya).'
                  : 'Optionally enter a subject below and select Admin, a workshop seller, or a buyer.'}
              </p>
            </div>
            <span className="text-xs text-[#78716C] tabular-nums shrink-0">
              {contacts.length} contacts
            </span>
          </div>

          <input
            type="text"
            value={newChatTopic}
            onChange={(e) => setNewChatTopic(e.target.value)}
            placeholder={
              lang === 'rw'
                ? 'Umutwe w’ikiganiro gishya (urugero: Kubaza ibiciro bya Salon cyangwa Gusana Intebe)...'
                : 'Optional subject (e.g. Custom dining table quote or repair question)...'
            }
            className="w-full px-3.5 py-2 text-xs sm:text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
          />

          {contacts.length === 0 ? (
            <p className="text-xs text-[#57534E]">No additional contacts available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={startingChat}
                  onClick={() => handleStartChat(c)}
                  className="p-3 rounded-lg border border-[#E7E5E4] bg-[#FAF9F6] hover:border-[#7C4D25] hover:bg-white text-left flex items-center gap-3 transition-colors cursor-pointer"
                >
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#D6D3D1] shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1C1917] text-[#E5B748] flex items-center justify-center text-xs font-semibold shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#1C1917] truncate flex items-center gap-1">
                      <span>{c.name}</span>
                      {c.role === 'admin' && (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#7C4D25] shrink-0" />
                      )}
                    </p>
                    <p className="text-[11px] text-[#57534E] truncate capitalize">
                      {c.role}
                      {c.workshopName ? ` · ${c.workshopName}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-[#57534E] bg-white border border-[#E7E5E4] rounded-xl">
          Loading conversations...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E7E5E4] rounded-xl overflow-hidden shadow-xs min-h-[640px]">
          {/* Left History Sidebar */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#E7E5E4] flex flex-col bg-[#FAF9F6]/60">
            <div className="px-4 py-3 border-b border-[#E7E5E4] bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                <History className="w-3.5 h-3.5 text-[#7C4D25]" />
                <span>
                  {lang === 'rw' ? 'Amateka y’Ibiganiro' : 'Conversation History'}
                </span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[#78716C]">
                {conversations.length}
              </span>
            </div>

            <div className="p-3.5 border-b border-[#E7E5E4] bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'rw' ? 'Shakisha mu biganiro byabanje...' : 'Search past conversations...'
                  }
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] focus:outline-none focus:border-[#7C4D25]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#EEEAE2] overflow-y-auto max-h-[540px] flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <MessageSquare className="w-6 h-6 text-[#7C4D25] mx-auto" />
                  <p className="text-xs text-[#57534E] leading-relaxed">{t.messagesEmpty}</p>
                  <button
                    type="button"
                    onClick={() => setNewChatOpen(true)}
                    className="px-3.5 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer"
                  >
                    {lang === 'rw' ? 'Tangira Ikiganiro' : 'Start a Chat'}
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const active = conv.id === selectedId;
                  const confirmingDelete = confirmDeleteConvId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      className={`p-4 flex items-start gap-3 transition-colors ${
                        active
                          ? 'bg-white ring-1 ring-inset ring-[#7C4D25]/40'
                          : 'hover:bg-white/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className="flex-1 min-w-0 flex items-start gap-3 text-left cursor-pointer"
                      >
                        <img
                          src={conv.productImageUrl}
                          alt={conv.productTitle}
                          className="w-12 h-12 rounded-md object-cover shrink-0 bg-[#F2EFE9] border border-[#E7E5E4]"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#1C1917] truncate">
                              {getPartnerHeadline(conv)}
                            </p>
                            <span className="text-[10px] font-mono tabular-nums text-[#78716C] shrink-0">
                              {formatHistoryDate(conv.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[#7C4D25] truncate">{conv.productTitle}</p>
                          <p className="text-xs text-[#57534E] truncate">{conv.lastMessage}</p>
                        </div>
                      </button>

                      {isAdmin && (
                        <div className="shrink-0 flex items-center gap-1 pt-0.5">
                          {confirmingDelete ? (
                            <>
                              <button
                                type="button"
                                disabled={deletingId === conv.id}
                                onClick={() => handleAdminDeleteConversation(conv.id)}
                                className="px-2 py-1 text-[10px] font-semibold bg-[#B91C1C] text-white rounded hover:bg-[#991B1B] cursor-pointer"
                              >
                                {lang === 'rw' ? 'Emeza' : 'Delete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteConvId(null)}
                                className="px-1.5 py-1 text-[10px] font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                              >
                                {lang === 'rw' ? 'Oya' : 'No'}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              aria-label={lang === 'rw' ? 'Siba ikiganiro' : 'Delete conversation'}
                              onClick={() => setConfirmDeleteConvId(conv.id)}
                              className="p-1.5 rounded text-[#78716C] hover:text-[#B91C1C] hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Active Conversation Stream */}
          <div className="lg:col-span-8 flex flex-col justify-between bg-white">
            {activeConversation ? (
              <>
                {/* Thread Header */}
                <div className="px-5 py-4 border-b border-[#E7E5E4] flex items-center justify-between gap-4 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={activeConversation.productImageUrl}
                      alt={activeConversation.productTitle}
                      className="w-10 h-10 rounded-md object-cover border border-[#E7E5E4] shrink-0"
                    />
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#1C1917] truncate">
                        {getPartnerHeadline(activeConversation)}
                      </h2>
                      <p className="text-xs text-[#57534E] truncate">
                        {activeConversation.productTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {activeConversation.negotiatedPriceRwf && (
                      <div className="text-right">
                        <span className="block text-[11px] text-[#78716C]">
                          {lang === 'rw' ? 'Igiciro Cyavuganyweho' : 'Negotiated Price'}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#7C4D25] tabular-nums">
                          {formatRwf(activeConversation.negotiatedPriceRwf)}
                        </span>
                      </div>
                    )}
                    {isAdmin && (
                      confirmDeleteConvId === activeConversation.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === activeConversation.id}
                            onClick={() => handleAdminDeleteConversation(activeConversation.id)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-[#B91C1C] text-white rounded-md hover:bg-[#991B1B] cursor-pointer whitespace-nowrap"
                          >
                            {lang === 'rw' ? 'Emeza Gusiba' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteConvId(null)}
                            className="px-2 py-1.5 text-xs text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                          >
                            {lang === 'rw' ? 'Oya' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteConvId(activeConversation.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] border border-red-200 rounded-md hover:bg-red-50 cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'rw' ? 'Siba Ikiganiro' : 'Delete Chat'}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Message History Canvas */}
                <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-[#F7F4EE] max-h-[440px]">
                  {messages.length === 0 ? (
                    <div className="py-16 text-center space-y-2 text-xs text-[#78716C]">
                      <p>
                        {lang === 'rw'
                          ? 'Tangira ikiganiro: andika ubutumwa, ohereza ifoto cyangwa ufate ubutumwa bw’ijwi (Voice Note).'
                          : 'Send a message, share a photo, record a voice note, or propose an offer below.'}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const mine = msg.senderId === user.id;
                      const roleTag =
                        msg.senderRole === 'admin'
                          ? 'Admin'
                          : msg.senderRole === 'seller'
                          ? 'Seller'
                          : 'Buyer';
                      const prevDay =
                        idx > 0 ? new Date(messages[idx - 1].createdAt).toDateString() : '';
                      const curDay = new Date(msg.createdAt).toDateString();
                      const showDayHeader = idx === 0 || prevDay !== curDay;

                      return (
                        <div key={msg.id} className="space-y-3">
                          {showDayHeader && (
                            <div className="flex items-center justify-center">
                              <span className="text-[11px] font-medium text-[#78716C] px-2">
                                {formatDayDivider(msg.createdAt)}
                              </span>
                            </div>
                          )}

                          <div
                            className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            {msg.senderAvatarUrl ? (
                              <img
                                src={msg.senderAvatarUrl}
                                alt={msg.senderName}
                                className="w-9 h-9 rounded-full object-cover border border-[#D6D3D1] shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                  mine
                                    ? 'bg-[#7C4D25] text-white'
                                    : msg.senderRole === 'admin'
                                    ? 'bg-[#1C1917] text-[#E5B748]'
                                    : 'bg-[#E7E5E4] text-[#1C1917]'
                                }`}
                              >
                                {msg.senderName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div
                              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm space-y-2 shadow-2xs ${
                                mine
                                  ? 'bg-[#1C1917] text-white rounded-br-xs'
                                  : 'bg-white border border-[#E7E5E4] text-[#1C1917] rounded-bl-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[11px] opacity-75">
                                <span className="font-medium">
                                  {msg.senderName} · {roleTag}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono tabular-nums">
                                    {formatMsgTime(msg.createdAt)}
                                  </span>
                                  {isAdmin && (
                                    confirmDeleteMsgId === msg.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={deletingId === msg.id}
                                          onClick={() => handleAdminDeleteMessage(msg.id)}
                                          className="px-1.5 py-0.5 rounded bg-[#B91C1C] text-white text-[10px] font-semibold cursor-pointer"
                                        >
                                          {lang === 'rw' ? 'Siba' : 'Del'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteMsgId(null)}
                                          className="text-[10px] underline cursor-pointer"
                                        >
                                          {lang === 'rw' ? 'Oya' : 'No'}
                                        </button>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        aria-label={lang === 'rw' ? 'Siba ubutumwa' : 'Delete message'}
                                        onClick={() => setConfirmDeleteMsgId(msg.id)}
                                        className="opacity-70 hover:opacity-100 hover:text-[#EF4444] cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>

                              {msg.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => setLightboxImage(msg.imageUrl!)}
                                  className="group relative block rounded-lg overflow-hidden border border-black/10 cursor-pointer"
                                >
                                  <img
                                    src={msg.imageUrl}
                                    alt="Shared attachment"
                                    className="max-h-60 w-auto object-cover"
                                  />
                                  <span className="absolute bottom-2 right-2 p-1.5 rounded bg-black/65 text-white opacity-80 group-hover:opacity-100">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </span>
                                </button>
                              )}

                              {msg.audioUrl && (
                                <div className="p-2 rounded-lg bg-black/10 space-y-1.5 min-w-[220px]">
                                  <div className="flex items-center justify-between gap-2 text-[11px] opacity-85">
                                    <span className="inline-flex items-center gap-1 font-medium">
                                      <Volume2 className="w-3.5 h-3.5" />
                                      <span>{lang === 'rw' ? 'Ubutumwa bw’Ijwi' : 'Voice Note'}</span>
                                    </span>
                                    {msg.audioDurationSec && (
                                      <span className="font-mono tabular-nums">
                                        {formatSecs(msg.audioDurationSec)}
                                      </span>
                                    )}
                                  </div>
                                  <audio controls src={msg.audioUrl} className="w-full h-8" />
                                </div>
                              )}

                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                              {msg.offerPriceRwf && (
                                <div className="pt-2 border-t border-current/15 flex items-center justify-between gap-3 text-xs font-mono tabular-nums">
                                  <span className="opacity-75">
                                    {lang === 'rw' ? 'Igiciro:' : 'Price Offer:'}
                                  </span>
                                  <span className="font-semibold">
                                    {formatRwf(msg.offerPriceRwf)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Bottom Message, Photo & Voice Composer */}
                <div className="bg-white border-t border-[#E7E5E4] p-4 space-y-3">
                  {!canSendChat && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                      {lang === 'rw'
                        ? 'Uburenganzira bwawe bwo kohereza ubutumwa mu Ruganiriro bwahagaritswe na Administrator.'
                        : 'Your Uruganiriro messaging permission has been restricted by the administrator.'}
                    </div>
                  )}
                  {error && <p className="text-xs text-[#B91C1C]">{error}</p>}

                  {imageUrl && (
                    <div className="flex items-center gap-3 p-2.5 bg-[#FAF9F6] border border-[#D6D3D1] rounded-lg">
                      <img
                        src={imageUrl}
                        alt="Attached preview"
                        className="w-14 h-14 rounded-md object-cover border border-[#E7E5E4]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1C1917]">
                          {lang === 'rw' ? 'Ifoto yiteguye koherezwa' : 'Photo ready to send'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-2.5 py-1 text-xs font-medium text-[#B91C1C] hover:underline cursor-pointer"
                      >
                        {lang === 'rw' ? 'Kura' : 'Remove'}
                      </button>
                    </div>
                  )}

                  {isRecording && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                      <div className="flex items-center gap-2.5 text-xs font-medium text-[#B91C1C]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
                        <span>
                          {lang === 'rw' ? 'Uri gufata ijwi...' : 'Recording voice note...'}
                        </span>
                        <span className="font-mono tabular-nums font-semibold">
                          {formatSecs(recordSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelRecording}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#57534E] bg-white border border-[#D6D3D1] rounded hover:text-[#B91C1C] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{lang === 'rw' ? 'Siba' : 'Cancel'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#B91C1C] rounded hover:bg-[#991B1B] cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-white" />
                          <span>{lang === 'rw' ? 'Hagarika' : 'Stop'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!isRecording && audioPreviewUrl && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 bg-[#FAF9F6] border border-[#D6D3D1] rounded-lg">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#1C1917] shrink-0">
                        <Volume2 className="w-4 h-4 text-[#7C4D25]" />
                        <span>
                          {lang === 'rw' ? 'Ijwi ryiteguye' : 'Voice Note'}
                          {audioDurationSec ? ` (${formatSecs(audioDurationSec)})` : ''}
                        </span>
                      </div>
                      <audio controls src={audioPreviewUrl} className="flex-1 h-8" />
                      <button
                        type="button"
                        onClick={clearDraftAudio}
                        className="px-2.5 py-1 text-xs font-medium text-[#B91C1C] hover:underline cursor-pointer shrink-0"
                      >
                        {lang === 'rw' ? 'Kura' : 'Remove'}
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md shrink-0 whitespace-nowrap ${!canSendChat ? 'opacity-50 pointer-events-none' : 'hover:bg-[#E7E3DA] cursor-pointer'}`}>
                        <ImagePlus className="w-4 h-4 text-[#7C4D25]" />
                        <span>{lang === 'rw' ? 'Ifoto' : 'Photo'}</span>
                        <input
                          type="file"
                          disabled={!canSendChat}
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImagePick}
                          className="sr-only"
                        />
                      </label>

                      {!isRecording ? (
                        <button
                          type="button"
                          disabled={!canSendChat}
                          onClick={handleStartRecording}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-[#F2EFE9] border border-[#D6D3D1] rounded-md hover:bg-[#E7E3DA] disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <Mic className="w-4 h-4 text-[#7C4D25]" />
                          <span>{lang === 'rw' ? 'Fata Ijwi (Voice)' : 'Record Voice'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#B91C1C] rounded-md hover:bg-[#991B1B] cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>{lang === 'rw' ? 'Hagarika Ijwi' : 'Stop Voice'}</span>
                        </button>
                      )}

                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1C1917] bg-[#FAF9F6] border border-[#D6D3D1] rounded-md shrink-0 whitespace-nowrap ${!canSendChat ? 'opacity-50 pointer-events-none' : 'hover:bg-[#F2EFE9] cursor-pointer'}`}>
                        <FileAudio className="w-4 h-4 text-[#7C4D25]" />
                        <span>{lang === 'rw' ? 'Shyiramo Audio' : 'Upload Audio'}</span>
                        <input
                          type="file"
                          disabled={!canSendChat}
                          accept="audio/webm,audio/ogg,audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a"
                          onChange={handleAudioFilePick}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        disabled={!canSendChat}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t.chatPlaceholder}
                        className="flex-1 px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] disabled:opacity-50 focus:outline-none focus:border-[#7C4D25]"
                      />
                      <input
                        type="number"
                        disabled={!canSendChat}
                        min={1000}
                        step={1000}
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        placeholder={t.offerPlaceholder}
                        className="sm:w-36 px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#D6D3D1] rounded-md text-[#1C1917] disabled:opacity-50 focus:outline-none focus:border-[#7C4D25]"
                      />
                      <button
                        type="submit"
                        disabled={!canSendChat || sending || isRecording}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>{sending ? '...' : t.sendBtn}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-3 text-[#57534E]">
                <MessageSquare className="w-8 h-8 text-[#7C4D25]" />
                <p className="text-sm font-medium text-[#1C1917]">
                  {lang === 'rw'
                    ? 'Hitamo ikiganiro mu mateka ibumoso cyangwa utangire ikiganiro gishya'
                    : 'Select a conversation from history on the left or start a new one'}
                </p>
                <button
                  type="button"
                  onClick={() => setNewChatOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#7C4D25] rounded-md hover:bg-[#633D1D] cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{lang === 'rw' ? 'Kora Ikiganiro Gishya' : 'New Conversation'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-Size Photo Lightbox inside Chat */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6"
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white hover:text-[#E5B748] cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Full view"
              className="max-h-[85vh] w-auto rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
