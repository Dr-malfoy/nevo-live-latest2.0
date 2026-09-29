import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PiCaretLeftBold as ArrowLeft,
  PiWaveformBold as AudioLines,
  PiGiftFill as GiftIcon,
  PiMicrophoneFill as Mic,
  PiDotsThreeBold as MoreHorizontal,
  PiPauseFill as Pause,
  PiPhoneFill as Phone,
  PiPlayFill as Play,
  PiPlusBold as Plus,
  PiPaperPlaneRightFill as Send,
  PiSmileyFill as Smile,
  PiVideoCameraFill as Video,
  PiXBold as X,
  PiCheckBold as Check,
  PiChecksBold as Checks,
  PiClockBold as Clock,
  PiWarningCircleFill as AlertCircle,
  PiPencilSimpleFill as Pencil,
  PiTrashFill as Trash,
  PiCopyFill as Copy,
  PiFlagFill as Flag,
  PiBroomFill as Broom,
  PiUserFill as UserIcon,
} from 'react-icons/pi';
import { chatApi, callApi, giftsApi, uploadApi, reportApi } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { GiftPanel } from '../components/stream';
import { Modal } from '../components/ui';
import { CallScreen } from '../components/call/CallScreen';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { Gift } from '../types';
import type { ChatStreak } from '../api/chat.api';

interface CallState {
  incoming?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    initiator: { nickname: string; avatar?: string } | null;
  };
  outgoing?: {
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    token: string;
    callee: { nickname: string; avatar?: string } | null;
  };
}

const QUICK_REPLIES = [
  { label: 'Hi', emoji: '👋' },
  { label: 'Love', emoji: '💗' },
  { label: 'For you', emoji: '🎁' },
  { label: 'Starlink', emoji: '⭐' },
];

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Inappropriate or adult content',
  'Fraud or scam',
  'Impersonation or fake account',
  'Hate speech or abusive language',
  'Other violation',
];

const dayKey = (iso?: string) => (iso ? new Date(iso).toDateString() : '');

const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit' });
};

const clockTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

/** Voice bubble */
const VoiceBubble = ({ url, duration, mine }: { url: string; duration?: number; mine: boolean }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    audio.onended = () => {
      setPlaying(false);
      setProgress(0);
    };
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[150px]">
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          mine ? 'bg-white/25 text-white' : 'bg-surface-sunken text-ink'
        }`}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${mine ? 'bg-white/30' : 'bg-line-strong'}`}>
        <div
          className={`h-full transition-[width] duration-200 ${mine ? 'bg-white' : 'bg-primary-500'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <span className={`text-[11px] tabular-nums font-semibold ${mine ? 'text-white/90' : 'text-ink-muted'}`}>
        {duration ? `${duration}"` : ''}
      </span>
    </div>
  );
};

export const ChatThread = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [streak, setStreak] = useState<ChatStreak | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [call, setCall] = useState<CallState | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  // Context / Action state
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'user' | 'chat' | 'message'; id: string }>({
    type: 'user',
    id: '',
  });
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callRef = useRef<CallState | null>(null);
  callRef.current = call;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    recording,
    duration,
    error: voiceError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();
  const recordingRef = useRef(false);

  const loadChat = () => {
    if (!chatId) return;
    chatApi
      .getMessages(chatId, { limit: 100 })
      .then(({ data }) => {
        if (data.success) {
          const list = data.data || [];
          setMessages(list);
          if (socket) {
            socket.emit('chat:delivered', { chatId });
          }
        }
      })
      .finally(() => setLoading(false));
  };

  // Resolve the other participant by fetching chat details
  useEffect(() => {
    if (!chatId) return;
    chatApi
      .getChat(chatId)
      .then(({ data }) => {
        if (data.success && data.data?.other) {
          setOther(data.data.other);
        }
      })
      .catch(() => {
        chatApi.getChats({ limit: 50 }).then(({ data }) => {
          if (data.success) {
            const found = (data.data || []).find((x: any) => x._id === chatId);
            if (found?.other) setOther(found.other);
          }
        });
      });
  }, [chatId]);

  // Streak tag
  useEffect(() => {
    if (!chatId) return;
    optional(chatApi.getStreak(chatId))
      .then((res) => setStreak(res?.data || null))
      .catch(() => {});
  }, [chatId]);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  // Mark read on open
  useEffect(() => {
    if (!chatId) return;
    chatApi.markRead(chatId).catch(() => {});
    if (socket) {
      socket.emit('chat:read', { chatId });
    }
  }, [chatId, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherIdRef = useRef<string | undefined>(undefined);
  otherIdRef.current = other?._id;

  // Real-time socket events
  useEffect(() => {
    if (!socket || !chatId) return;

    const handler = (payload: any) => {
      if (payload?.chatId !== chatId) return;
      const msg = payload.message;
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));

      if (msg.senderId !== user?._id) {
        chatApi.markRead(chatId).catch(() => {});
        socket.emit('chat:read', { chatId });
        socket.emit('chat:delivered', { chatId });
      }
    };
    socket.on('chat:message', handler);

    // Read / Seen
    const onChatRead = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?._id
              ? { ...m, read: true, status: 'seen', readAt: payload.readAt || new Date().toISOString() }
              : m
          )
        );
      }
    };
    socket.on('chat:read', onChatRead);
    socket.on('chat:seen', onChatRead);

    // Delivered
    const onChatDelivered = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?._id && !m.read
              ? { ...m, delivered: true, status: 'delivered', deliveredAt: payload.deliveredAt || new Date().toISOString() }
              : m
          )
        );
      }
    };
    socket.on('chat:delivered', onChatDelivered);

    // Message edited
    const onMessageUpdated = (payload: any) => {
      if (payload?.chatId === chatId && payload?.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === payload.message._id ? payload.message : m))
        );
      }
    };
    socket.on('chat:message_updated', onMessageUpdated);

    // Message deleted
    const onMessageDeleted = (payload: any) => {
      if (payload?.chatId === chatId && payload?.messageId) {
        setMessages((prev) => prev.filter((m) => m._id !== payload.messageId));
      }
    };
    socket.on('chat:message_deleted', onMessageDeleted);

    // Chat cleared
    const onChatCleared = (payload: any) => {
      if (payload?.chatId === chatId) {
        setMessages([]);
      }
    };
    socket.on('chat:cleared', onChatCleared);

    const onCallInvite = (payload: any) => {
      if (payload?.initiatorId === otherIdRef.current) {
        setCall({
          incoming: {
            callId: payload.callId,
            channel: payload.channel,
            type: payload.type,
            initiatorId: payload.initiatorId,
            token: payload.token,
            initiator: other ? { nickname: other.nickname, avatar: other.avatar } : null,
          },
        });
      }
    };
    socket.on('call:invite', onCallInvite);

    const onCallAccept = (payload: any) => {
      if (payload?.callId && callRef.current?.outgoing?.callId === payload.callId) setCallAccepted(true);
    };
    socket.on('call:accept', onCallAccept);

    return () => {
      socket.off('chat:message', handler);
      socket.off('chat:read', onChatRead);
      socket.off('chat:seen', onChatRead);
      socket.off('chat:delivered', onChatDelivered);
      socket.off('chat:message_updated', onMessageUpdated);
      socket.off('chat:message_deleted', onMessageDeleted);
      socket.off('chat:cleared', onChatCleared);
      socket.off('call:invite', onCallInvite);
      socket.off('call:accept', onCallAccept);
    };
  }, [socket, chatId, user, other]);

  /* ── Message Sending & Editing ────────────────────────────────── */

  const sendText = async (text: string) => {
    if (!text.trim() || !chatId) return;
    const trimmed = text.trim();

    // If we're editing an existing message
    if (editingMessage) {
      const msgId = editingMessage._id;
      setEditingMessage(null);
      setInput('');
      try {
        const { data } = await chatApi.editMessage(chatId, msgId, trimmed);
        if (data.success && data.data) {
          setMessages((prev) => prev.map((m) => (m._id === msgId ? data.data : m)));
          showToast('Message edited', 'success');
          return;
        }
        throw new Error(data.error || 'Failed to edit message');
      } catch (err: any) {
        showToast(err?.response?.data?.error || err?.message || 'Could not edit message', 'error');
      }
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      senderId: user?._id,
      message: trimmed,
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false,
      status: 'sending',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const { data } = await chatApi.sendMessage(chatId, trimmed);
      if (data.success && data.data) {
        setMessages((prev) => prev.map((m) => (m._id === tempId ? data.data : m)));
        return;
      }
      throw new Error(data.error || 'send failed');
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, failed: true, status: 'failed' } : m))
      );
      showToast('Message could not be sent', 'error');
    } finally {
      setSending(false);
    }
  };

  const retrySend = async (msg: any) => {
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
    await sendText(msg.message);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendText(text);
  };

  /* ── Long Press Handlers ───────────────────────────────────────── */

  const handlePointerDownMessage = (msg: any) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(msg);
    }, 450);
  };

  const handlePointerUpMessage = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCopyMessage = () => {
    if (!selectedMessage?.message) return;
    navigator.clipboard.writeText(selectedMessage.message);
    showToast('Copied to clipboard', 'success');
    setSelectedMessage(null);
  };

  const handleStartEditMessage = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setInput(selectedMessage.message || '');
    setSelectedMessage(null);
    inputRef.current?.focus();
  };

  const handleDeleteSingleMessage = async () => {
    if (!selectedMessage || !chatId) return;
    const msgId = selectedMessage._id;
    setSelectedMessage(null);

    setMessages((prev) => prev.filter((m) => m._id !== msgId));
    try {
      await chatApi.deleteMessage(chatId, msgId);
      showToast('Message deleted', 'success');
    } catch (err: any) {
      loadChat();
      showToast(err?.response?.data?.error || 'Could not delete message', 'error');
    }
  };

  const handleClearWholeConversation = async () => {
    if (!chatId) return;
    setShowClearConfirm(false);
    setShowOptionsMenu(false);
    setMessages([]);
    try {
      await chatApi.clearChat(chatId);
      showToast('Chat history cleared', 'success');
    } catch (err: any) {
      loadChat();
      showToast(err?.response?.data?.error || 'Could not clear chat', 'error');
    }
  };

  const handleDeleteConversation = async () => {
    if (!chatId) return;
    setShowDeleteChatConfirm(false);
    setShowOptionsMenu(false);
    try {
      await chatApi.deleteChat(chatId);
      showToast('Conversation removed', 'success');
      navigate('/messages');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not delete conversation', 'error');
    }
  };

  const handleOpenReport = (type: 'user' | 'chat' | 'message', id: string) => {
    setSelectedMessage(null);
    setShowOptionsMenu(false);
    setReportTarget({ type, id });
    setSelectedReason(REPORT_REASONS[0]);
    setReportDetails('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportTarget.id) return;
    setSubmittingReport(true);
    try {
      await reportApi.createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: selectedReason,
        details: reportDetails.trim(),
      });
      setShowReportModal(false);
      showToast('Report submitted. Our safety team will review it.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  /* ── Calls & Gifts ──────────────────────────────────────────────── */

  const startCall = async (type: 'audio' | 'video') => {
    if (!other?._id) return;
    setCallAccepted(false);
    try {
      const { data } = await callApi.create([other._id], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: other.nickname, avatar: other.avatar },
          },
        });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not start the call', 'error');
    }
  };

  const handleSendGift = async (gift: Gift, quantity: number) => {
    if (!other?._id || !chatId) return;
    try {
      const { data } = await giftsApi.send(other._id, gift._id, quantity);
      if (data.success) {
        if (data.data?.senderCoins != null) {
          updateUser({
            coins: data.data.senderCoins,
            diamonds: data.data.senderDiamonds ?? user?.diamonds,
          });
        } else if (data.data?.senderBalance != null) {
          updateUser({ coins: data.data.senderBalance });
        }
      }

      const { data: msg } = await chatApi.sendMessage(chatId, `Sent ${gift.name} x${quantity}`, {
        kind: 'gift',
        giftId: gift._id,
        giftName: gift.name,
        giftIcon: gift.icon,
        giftCount: quantity,
        giftPrice: gift.priceDiamonds,
      });
      if (msg.success) setMessages((prev) => [...prev, msg.data]);
      const costCoins = (gift.priceDiamonds || 0) * quantity;
      showToast(`Sent ${quantity}x ${gift.name}! (-${costCoins.toLocaleString()} Coins)`, 'success');
      setShowGift(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send gift', 'error');
      throw err;
    }
  };

  const handleVoiceStart = async () => {
    recordingRef.current = true;
    await startRecording();
  };

  const handleVoiceStop = async () => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    const result = await stopRecording();
    if (!result || !chatId) return;
    try {
      const url = await uploadApi.upload(result.blob, 'voice-messages');
      const { data } = await chatApi.sendMessage(chatId, 'Voice message', {
        kind: 'voice',
        voiceUrl: url,
        voiceDuration: result.duration,
      });
      if (data.success) setMessages((prev) => [...prev, data.data]);
    } catch {
      showToast('Failed to send voice message', 'error');
    }
  };

  // Group messages by day
  const withSeparators = useMemo(() => {
    const out: { type: 'day'; label: string; key: string }[] | any[] = [];
    let lastDay = '';
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      if (key !== lastDay) {
        out.push({ type: 'day', label: dayLabel(m.createdAt), key: `day-${key}` });
        lastDay = key;
      }
      out.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-surface-soft">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-line shadow-xs">
        <div className="flex items-center gap-2.5 px-3 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div
            role="button"
            onClick={() => other?._id && navigate(`/user/${other._id}`)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
          >
            <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="sm" online={other?.online} />

            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-bold text-ink truncate leading-tight group-hover:text-primary-600 transition-colors">
                {other?.nickname || 'User'}
              </h1>
              {streak && streak.current < streak.target ? (
                <span className="inline-flex items-center gap-1 mt-0.5 h-[17px] px-1.5 rounded bg-surface-sunken text-[10px] font-semibold text-ink-muted">
                  ⭐ Activating {streak.current}/{streak.target}
                </span>
              ) : (
                <p className="text-[11px] text-ink-muted leading-tight">
                  {other?.uid ? `ID: ${other.uid}` : other?.online ? 'Online' : ''}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => startCall('audio')}
            aria-label="Audio call"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken transition-colors"
          >
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => startCall('video')}
            aria-label="Video call"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken transition-colors"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => setShowOptionsMenu(true)}
            aria-label="More options"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── Messages List ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto">
        {loading ? (
          <p className="text-center text-sm text-ink-muted py-10">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="lg" className="mx-auto mb-3" />
            <p className="text-base font-bold text-ink mb-1">
              Say hi to {other?.nickname || 'your friend'} 👋
            </p>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              Messages and calls are secure. Long press any message to edit, delete, copy, or report.
            </p>
          </div>
        ) : (
          withSeparators.map((item: any, index: number) => {
            if (item.type === 'day') {
              return (
                <div key={item.key} className="flex justify-center my-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-200/70 text-[11px] font-semibold text-ink-muted shadow-2xs">
                    {item.label}
                  </span>
                </div>
              );
            }

            const mine = item.senderId === user?._id;
            const isLastSent =
              mine &&
              index ===
                withSeparators.map((m: any) => m.senderId === user?._id).lastIndexOf(true);

            const isSeen = item.read || item.status === 'seen';
            const isDelivered = (item.delivered || item.status === 'delivered') && !isSeen;
            const isSending = item.status === 'sending';
            const isFailed = item.failed || item.status === 'failed';

            return (
              <div key={item._id || index} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <Avatar src={other?.avatar} nickname={other?.nickname || '?'} size="xs" className="mt-auto mb-1 ring-1 ring-black/5" />
                )}

                <div className="max-w-[76%] flex flex-col group">
                  {/* Long press message bubble */}
                  <div
                    onPointerDown={() => handlePointerDownMessage(item)}
                    onPointerUp={handlePointerUpMessage}
                    onPointerLeave={handlePointerUpMessage}
                    onTouchStart={() => handlePointerDownMessage(item)}
                    onTouchEnd={handlePointerUpMessage}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedMessage(item);
                    }}
                    className={`relative px-3.5 py-2.5 text-sm rounded-2xl shadow-xs transition-all cursor-pointer select-none active:scale-[0.98] ${
                      mine
                        ? 'bg-gradient-to-tr from-primary-600 to-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-ink rounded-bl-xs border border-slate-100'
                    } ${isFailed ? 'opacity-70 ring-1 ring-red-400' : ''}`}
                  >
                    {item.kind === 'voice' ? (
                      <VoiceBubble url={item.voiceUrl} duration={item.voiceDuration} mine={mine} />
                    ) : item.kind === 'gift' ? (
                      <div className="flex items-center gap-2.5">
                        {item.giftIcon ? (
                          <img src={item.giftIcon} alt="" className="w-9 h-9 object-contain shrink-0" />
                        ) : (
                          <GiftIcon className="w-6 h-6 text-pink-300" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-sm leading-tight">{item.giftName || 'Gift'}</p>
                          <p className={`text-[11px] leading-tight ${mine ? 'text-white/80' : 'text-pink-500'}`}>
                            {item.message || `x${item.giftCount || 1}`}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{item.message}</p>
                    )}
                  </div>

                  {/* Timestamp, Edited Badge & Status tick */}
                  <div className={`flex items-center gap-1.5 mt-1 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-ink-faint tabular-nums">
                      {clockTime(item.createdAt)}
                    </span>

                    {item.edited && (
                      <span className="text-[9px] font-medium text-ink-faint italic">
                        (edited)
                      </span>
                    )}

                    {mine && (
                      <div className="flex items-center gap-0.5">
                        {isFailed ? (
                          <button
                            onClick={() => retrySend(item)}
                            className="flex items-center gap-0.5 text-[10px] text-red-500 font-bold hover:underline"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Not sent</span>
                          </button>
                        ) : isSending ? (
                          <Clock className="w-3 h-3 text-ink-muted animate-spin" title="Sending..." />
                        ) : isSeen ? (
                          <Checks className="w-3.5 h-3.5 text-[#0284c7]" title="Seen" />
                        ) : isDelivered ? (
                          <Checks className="w-3.5 h-3.5 text-ink-muted" title="Delivered" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-ink-muted" title="Sent" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last message receipt indicator */}
                  {mine && isLastSent && !isFailed && !isSending && (
                    <div className="flex items-center justify-end gap-1 mt-0.5 pr-1 text-[10px] font-semibold text-ink-muted">
                      {isSeen ? (
                        <span className="text-primary-600 flex items-center gap-1">
                          <span>Seen</span>
                          {item.readAt && (
                            <span className="text-[9px] text-ink-faint font-normal">
                              {clockTime(item.readAt)}
                            </span>
                          )}
                        </span>
                      ) : isDelivered ? (
                        <span className="text-ink-muted">Delivered</span>
                      ) : (
                        <span className="text-ink-faint">Sent</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {streak && !streak.litUp && streak.current > 0 && (
          <div className="flex justify-center py-2">
            <span className="px-3 py-1.5 rounded-full bg-line text-[11px] text-ink-muted">
              Chat {streak.target} days straight to light up your Starlink{' '}
              <span className="text-accent-500 font-semibold">⭐</span>
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Recording banner */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2.5 flex items-center justify-between bg-role-host/10 border-t border-role-host/20"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-role-host animate-pulse" />
              <span className="text-sm text-role-host font-medium">Recording… {duration}s</span>
            </div>
            <button
              onClick={() => {
                recordingRef.current = false;
                cancelRecording();
              }}
              className="flex items-center gap-1 text-xs text-role-host font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {voiceError && <p className="px-4 pb-1 text-xs text-role-host">{voiceError}</p>}

      {/* ── Editing Message Banner ─────────────────────────────────── */}
      {editingMessage && (
        <div className="flex items-center justify-between px-4 py-2 bg-primary-50 border-t border-primary-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <Pencil className="w-4 h-4 text-primary-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary-700">Editing message</p>
              <p className="text-xs text-ink-muted truncate">{editingMessage.message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInput('');
            }}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Quick replies ──────────────────────────────────────────── */}
      {!editingMessage && (
        <div className="flex gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar bg-surface-soft">
          {QUICK_REPLIES.map(({ label, emoji }) => (
            <button
              key={label}
              onClick={() => sendText(label)}
              disabled={sending}
              className="shrink-0 h-9 px-3.5 rounded-full bg-white border border-line text-sm text-ink
                flex items-center gap-1.5 active:bg-surface-sunken disabled:opacity-50"
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
          <button
            onClick={() => setShowGift(true)}
            className="shrink-0 h-9 px-3.5 rounded-full bg-primary-50 border border-primary-200 text-sm font-medium text-primary-600 flex items-center gap-1.5"
          >
            <GiftIcon className="w-4 h-4" />
            Gift
          </button>
        </div>
      )}

      {/* ── Input bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-white border-t border-line safe-bottom">
        {!editingMessage && (
          <button
            onPointerDown={handleVoiceStart}
            onPointerUp={handleVoiceStop}
            onPointerLeave={() => {
              if (recordingRef.current) handleVoiceStop();
            }}
            aria-label="Hold to record a voice message"
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
              recording ? 'bg-role-host border-role-host text-white' : 'border-ink text-ink'
            }`}
          >
            <AudioLines className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 flex items-center gap-1.5 h-11 pl-4 pr-1.5 rounded-full bg-surface-sunken">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={editingMessage ? 'Edit your message…' : 'Say something'}
            className="flex-1 min-w-0 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none text-sm"
          />
          <button aria-label="Emoji" className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted">
            <Smile className="w-5 h-5" />
          </button>
          {!editingMessage && (
            <button
              onClick={() => setShowGift(true)}
              aria-label="More"
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-muted"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            aria-label="Send"
            className="w-10 h-10 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
          >
            <Send className="w-[18px] h-[18px]" />
          </button>
        ) : (
          <button
            onClick={() => setShowGift(true)}
            aria-label="Send a gift"
            className="w-10 h-10 rounded-full bg-surface-sunken text-ink flex items-center justify-center shrink-0"
          >
            <Mic className="w-[18px] h-[18px] hidden" />
            <GiftIcon className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* ── Message Long-Press Context Modal ───────────────────────── */}
      <Modal
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        title="Message Options"
      >
        <div className="space-y-3 pt-1">
          {/* Message snippet */}
          <div className="p-3 rounded-xl bg-slate-100 text-xs text-ink max-h-24 overflow-y-auto italic">
            "{selectedMessage?.message}"
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Copy */}
            {selectedMessage?.message && (
              <button
                onClick={handleCopyMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
              >
                <Copy className="w-5 h-5 text-ink-muted" />
                <span>Copy text</span>
              </button>
            )}

            {/* Edit (only own text messages) */}
            {selectedMessage?.senderId === user?._id && selectedMessage?.kind === 'text' && (
              <button
                onClick={handleStartEditMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-primary-600 transition-colors"
              >
                <Pencil className="w-5 h-5 text-primary-600" />
                <span>Edit message</span>
              </button>
            )}

            {/* Delete (only own messages) */}
            {selectedMessage?.senderId === user?._id && (
              <button
                onClick={handleDeleteSingleMessage}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
              >
                <Trash className="w-5 h-5 text-red-600" />
                <span>Delete message</span>
              </button>
            )}

            {/* Report Message */}
            {selectedMessage?.senderId !== user?._id && (
              <button
                onClick={() => handleOpenReport('message', selectedMessage._id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 text-sm font-semibold text-amber-600 transition-colors"
              >
                <Flag className="w-5 h-5 text-amber-600" />
                <span>Report message</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Conversation Options Dropdown / Modal ──────────────────── */}
      <Modal
        isOpen={showOptionsMenu}
        onClose={() => setShowOptionsMenu(false)}
        title="Conversation Options"
      >
        <div className="space-y-2 pt-1">
          {other?._id && (
            <button
              onClick={() => {
                setShowOptionsMenu(false);
                navigate(`/user/${other._id}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
            >
              <UserIcon className="w-5 h-5 text-ink-muted" />
              <span>View Profile</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowOptionsMenu(false);
              setShowClearConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200 text-sm font-semibold text-ink transition-colors"
          >
            <Broom className="w-5 h-5 text-ink-muted" />
            <span>Clear Chat History</span>
          </button>

          <button
            onClick={() => {
              setShowOptionsMenu(false);
              setShowDeleteChatConfirm(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-sm font-semibold text-red-600 transition-colors"
          >
            <Trash className="w-5 h-5 text-red-600" />
            <span>Remove Whole Conversation</span>
          </button>

          <button
            onClick={() => handleOpenReport('user', other?._id || chatId || '')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 text-sm font-semibold text-amber-600 transition-colors"
          >
            <Flag className="w-5 h-5 text-amber-600" />
            <span>Send Report</span>
          </button>
        </div>
      </Modal>

      {/* ── Clear Chat History Confirm Modal ───────────────────────── */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Chat History?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to clear all messages in this conversation? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleClearWholeConversation}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 shadow-sm"
            >
              Clear Messages
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Remove Whole Conversation Confirm Modal ─────────────────── */}
      <Modal
        isOpen={showDeleteChatConfirm}
        onClose={() => setShowDeleteChatConfirm(false)}
        title="Delete Conversation?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete this conversation? It will be removed from your message list.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteChatConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConversation}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white active:bg-red-700 shadow-sm"
            >
              Delete Conversation
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Send Report Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Send Report"
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">
              Reason for reporting
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    selectedReason === reason
                      ? 'bg-primary-50 text-primary-700 border border-primary-300 font-bold'
                      : 'bg-slate-100 text-ink hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Please provide more details to help us investigate…"
              rows={3}
              className="w-full p-3 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-primary-500 focus:bg-white resize-none text-ink"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={submittingReport}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white active:scale-95 shadow-sm transition-all disabled:opacity-50"
            >
              {submittingReport ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Send Gift Modal */}
      <Modal isOpen={showGift} onClose={() => setShowGift(false)} title="Send a gift">
        {other?._id && <GiftPanel receiverId={other._id} onSend={handleSendGift} />}
      </Modal>

      {/* Call Screen */}
      {call && (
        <CallScreen
          incoming={call.incoming}
          outgoing={call.outgoing}
          accepted={callAccepted}
          onClose={(outcome?: 'ended' | 'rejected') => {
            setCall(null);
            setCallAccepted(false);
            if (outcome === 'rejected') showToast('Call declined', 'info');
          }}
        />
      )}
    </div>
  );
};
