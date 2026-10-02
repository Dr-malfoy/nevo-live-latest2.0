import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PiGiftFill as Gift, PiHeartFill as Heart, PiStarFill as Star, PiUsersFill as Users, PiXBold as X, PiMicrophoneFill, PiMicrophoneSlashFill, PiSlidersFill } from 'react-icons/pi';
import { partyApi, type PartyRoomDetail, type RoomSeat } from '../api/party.api';
import { giftsApi } from '../api/gifts.api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { SeatBoard } from '../components/party/SeatBoard';
import { HostToolsSheet, PARTY_BOTTOM_ICONS } from '../components/party/HostToolsSheet';
import { PkTypesSheet } from '../components/party/PkTypesSheet';
import { useFloatingGifts, FloatingGifts } from '../components/party/FloatingGifts';
import { Loading } from '../components/ui';
import { MessageInput, GiftOverlay } from '../components/live';
import { GiftPanel } from '../components/stream';
import type { GiftBurst } from '../components/live/GiftOverlay';
import { compactNumber, initial } from '../lib/time';
import { useAgora } from '../hooks/useAgora';

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || '';

/**
 * Party room — requirements #17 and #18.
 *
 * Deliberately dark: it is a live room, the same way the video live room is.
 *
 * **#18 is satisfied structurally**, not by a setting: the host circle and every
 * seat render that user's own avatar (`ownerId.avatar`, `seats[i].userId.avatar`)
 * with a letter fallback. There is no fixed `[HM]` asset anywhere in this screen
 * or in `SeatBoard`.
 *
 * Seat actions are specified in BACKEND-GUIDE.md §4.9 and not built yet, so
 * tapping a seat reports that rather than appearing to work.
 */

type ChatFilter = 'all' | 'room' | 'chat';

interface RoomMessage {
  id: string;
  kind: 'join' | 'chat' | 'win';
  nickname: string;
  level?: number;
  text?: string;
  amount?: number;
}

export const PartyRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [room, setRoom] = useState<PartyRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [pkOpen, setPkOpen] = useState(false);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [giftBurst, setGiftBurst] = useState<GiftBurst | null>(null);
  const burstTimerRef = useRef<any>(null);
  const { items: floatingGiftItems, triggerGifts } = useFloatingGifts();

  const isHost = !!room && !!user && room.ownerId?._id === user._id;

  const joinRoom = useSocketStore((s) => s.joinRoom);
  const leaveRoom = useSocketStore((s) => s.leaveRoom);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    partyApi.getRoom(id)
      .then((res) => {
        if (!cancelled) {
          if (res?.data?.success && res.data.data) {
            setRoom(res.data.data);
            partyApi.joinRoom(id).catch(() => {});
          } else {
            showToast('Party room not found or has been closed', 'info');
            navigate('/party', { replace: true });
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          showToast('Party room has ended or does not exist', 'info');
          navigate('/party', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      partyApi.leaveRoom(id).catch(() => {});
    };
  }, [id, navigate, showToast]);

  const { joinChannel, toggleMic, micOn, error: agoraError, leaveChannel, remoteUsers } = useAgora();

  useEffect(() => {
    if (agoraError) {
      showToast(agoraError, 'error');
    }
  }, [agoraError, showToast]);

  useEffect(() => {
    if (room?.agoraChannel && room?.agoraToken) {
      joinChannel({
        appId: AGORA_APP_ID,
        channel: room.agoraChannel,
        token: room.agoraToken,
        role: isHost ? 'host' : 'audience',
        videoEnabled: false,
        initialMicOn: isHost ? true : false,
      }).catch(console.error);
    }
    return () => {
      leaveChannel();
    };
  }, [room?.agoraChannel, room?.agoraToken, isHost, joinChannel, leaveChannel]);

  // Use remoteUsers to reflect active voice speakers in UI if needed
  useEffect(() => {
    console.log('Active remote users in voice chat:', remoteUsers);
  }, [remoteUsers]);
  useEffect(() => {
    if (!socket || !id) return;

    joinRoom(`room:${id}`, { roomId: id });

    const push = (msg: RoomMessage) =>
      setMessages((prev) => [...prev.slice(-40), msg]);

    const onJoin = (p: any) => {
      push({ id: `${Date.now()}-j`, kind: 'join', nickname: p?.nickname || p?.user?.nickname || 'Someone', level: p?.level || p?.user?.level });
    };
    const onMessage = (p: any) => {
      if (p?.userId && user && p.userId === user._id) return;
      push({
        id: `${Date.now()}-${Math.random()}`,
        kind: 'chat',
        nickname: p?.nickname ?? 'Someone',
        level: p?.level || 1,
        text: p?.message,
      });
    };
    const onWin = (p: any) =>
      push({ id: `${Date.now()}-w`, kind: 'win', nickname: p?.nickname ?? 'Someone', amount: p?.amount });
    const onSeat = (p: any) => {
      if (p?.roomId !== id || !p?.seats) return;
      setRoom((prev) => (prev ? { ...prev, seats: p.seats } : prev));
    };
    const onMicChanged = (p: any) => {
      if (!p?.userId) return;
      setRoom((prev) => {
        if (!prev) return prev;
        const updatedSeats = prev.seats.map((s) => {
          const sUid = typeof s.userId === 'object' && s.userId !== null ? (s.userId as any)._id : s.userId;
          if (sUid === p.userId) {
            return { ...s, isMuted: !p.enabled };
          }
          return s;
        });
        return { ...prev, seats: updatedSeats };
      });
    };
    const onViewerCount = (p: any) => {
      if (typeof p?.count === 'number') {
        setRoom((prev) => (prev ? { ...prev, viewerCount: p.count } : prev));
      }
    };
    const onGift = (p: any) => {
      const giftName = p?.gift?.name || 'Gift';
      const count = p?.count || 1;
      push({ id: `${Date.now()}-g`, kind: 'chat', nickname: p?.senderName ?? 'Someone', text: `Sent ${count}x ${giftName}!` });
      if (p?.gift) {
        triggerGifts(p.gift.icon || p.gift.animation || '🎁', giftName, 4);
        setGiftBurst({
          id: `${Date.now()}`,
          gift: p.gift,
          count,
          nickname: p?.senderName || 'Someone',
        });
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
        burstTimerRef.current = setTimeout(() => setGiftBurst(null), 3000);
      }
    };

    const onClosed = (p: any) => {
      if (p?.roomId && String(p.roomId) === String(id)) {
        showToast(p?.message || 'Party closed by host', 'info');
        navigate('/party', { replace: true });
      }
    };

    socket.on('room:user-joined', onJoin);
    socket.on('room:join:highlight', onJoin);
    socket.on('room:message', onMessage);
    socket.on('room:chat-message', onMessage);
    socket.on('room:win', onWin);
    socket.on('room:seat:update', onSeat);
    socket.on('room:mic-changed', onMicChanged);
    socket.on('room:viewer-count', onViewerCount);
    socket.on('room:gift', onGift);
    socket.on('room:closed', onClosed);
    socket.on('room:ended', onClosed);

    return () => {
      leaveRoom(`room:${id}`);
      socket.off('room:user-joined', onJoin);
      socket.off('room:join:highlight', onJoin);
      socket.off('room:message', onMessage);
      socket.off('room:chat-message', onMessage);
      socket.off('room:win', onWin);
      socket.off('room:seat:update', onSeat);
      socket.off('room:mic-changed', onMicChanged);
      socket.off('room:viewer-count', onViewerCount);
      socket.off('room:gift', onGift);
      socket.off('room:closed', onClosed);
      socket.off('room:ended', onClosed);
    };
  }, [socket, id, joinRoom, leaveRoom]);

  const visibleMessages = useMemo(() => {
    if (filter === 'room') return messages.filter((m) => m.kind !== 'chat');
    if (filter === 'chat') return messages.filter((m) => m.kind === 'chat');
    return messages;
  }, [messages, filter]);

  const latestWin = useMemo(
    () => [...messages].reverse().find((m) => m.kind === 'win'),
    [messages]
  );

  const handleSeatPress = async (seat: RoomSeat) => {
    if (!id) return;
    if (seat.isLocked) {
      showToast('This seat is locked', 'info');
      return;
    }
    const occupant = seat.userId && typeof seat.userId === 'object' ? seat.userId : null;
    if (occupant) {
      if (occupant._id === user?._id) {
        const res = await optional(partyApi.stand(id, seat.index)).catch(() => null);
        if (!res?.success) showToast(res?.error || 'Failed to leave seat', 'error');
        return;
      }
      
      if (isHost) {
        if (window.confirm(`Kick ${occupant.nickname} from seat?`)) {
          const res = await optional(partyApi.kickSeat(id, seat.index)).catch(() => null);
          if (res?.success) showToast(`${occupant.nickname} kicked`, 'success');
          else showToast(res?.error || 'Failed to kick member', 'error');
          return;
        }
      }

      navigate(`/user/${occupant._id}`);
      return;
    }
    const res = await optional(partyApi.sit(id, seat.index)).catch(() => null);
    if (!res?.success) {
      showToast(res?.error || 'Failed to take seat', 'error');
      return;
    }
  };

  const handleTool = (key: string, label: string) => {
    setToolsOpen(false);
    if (key === 'pk') {
      setPkOpen(true);
      return;
    }
    if (key === 'store') {
      navigate('/store');
      return;
    }
    if (key === 'rewards') {
      navigate('/rewards');
      return;
    }
    if (key === 'rank') {
      navigate('/rankings?board=gift');
      return;
    }
    if (key === 'fan_club') {
      navigate('/fan-club');
      return;
    }
    if (key === 'gift' || key === 'gift_center') {
      setGiftPanelOpen(true);
      return;
    }
    showToast(`${label} is not connected yet`, 'info');
  };

  const handleCloseParty = async () => {
    if (!id) return;
    if (isHost) {
      if (window.confirm('Are you sure you want to close this party permanently?')) {
        try {
          await partyApi.closeRoom(id);
        } catch {
          await partyApi.leaveRoom(id).catch(() => {});
        }
        showToast('Party room closed permanently', 'success');
        navigate('/party', { replace: true });
      }
    } else {
      await partyApi.leaveRoom(id).catch(() => {});
      navigate('/party', { replace: true });
    }
  };

  const handleToggleMic = async () => {
    try {
      const nextState = !micOn;
      const isEnabled = await toggleMic(nextState);
      if (socket && id) {
        socket.emit('room:mic-toggle', { roomId: id, enabled: isEnabled });
      }
      if (user && room) {
        setRoom((prev) => {
          if (!prev) return prev;
          const updatedSeats = prev.seats.map((s) => {
            const sUid = typeof s.userId === 'object' && s.userId !== null ? (s.userId as any)._id : s.userId;
            if (sUid === user._id) {
              return { ...s, isMuted: !isEnabled };
            }
            return s;
          });
          return { ...prev, seats: updatedSeats };
        });
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle microphone', 'error');
    }
  };

  const handleSendMessage = (text: string) => {
    if (!id || !socket) return;
    socket.emit('room:message', { roomId: id, message: text });
    setMessages((prev) => [...prev.slice(-40), {
      id: `${Date.now()}-self`,
      kind: 'chat',
      nickname: user?.nickname ?? 'Me',
      text
    }]);
  };

  const handleSendGift = async (gift: any, quantity: number = 1) => {
    const receiverId = room?.ownerId?._id;
    if (!receiverId) {
      showToast('Party host unavailable', 'error');
      return;
    }
    if (user && receiverId === user._id) {
      showToast('You cannot send a gift to yourself', 'error');
      return;
    }

    try {
      const { data } = await giftsApi.send(receiverId, gift._id, quantity, 'party');
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
      if (socket && id) {
        socket.emit('room:gift', {
          roomId: id,
          giftId: gift._id,
          receiverId,
          count: quantity,
        });
      }
      setGiftPanelOpen(false);
      const costCoins = (gift.priceDiamonds || 0) * quantity;
      showToast(`Sent ${quantity}x ${gift.name}! (-${costCoins.toLocaleString()} Coins)`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send gift', 'error');
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A0E38]">
        <Loading className="pt-32" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#150B2E] flex flex-col relative overflow-hidden">
      {/* ── Header (#17.1) ─────────────────────────────────────── */}
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* #18 — the host's own picture, never a fixed logo */}
          <span className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
            {room?.ownerId?.avatar ? (
              <img src={room.ownerId.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {initial(room?.ownerId?.nickname)}
              </span>
            )}
          </span>

          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">
              {room?.ownerId?.nickname ?? room?.name ?? 'Party'}
            </p>
            <p className="text-[10px] text-white/60 flex items-center gap-1">
              <Heart className="w-3 h-3" /> 0
            </p>
          </div>

          <button
            onClick={() => setGiftPanelOpen(true)}
            className="ml-auto h-8 px-3 rounded-full bg-[#FF3B7F]/90 text-white text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Gift className="w-3.5 h-3.5" /> Gift
          </button>

          <span className="h-8 px-2.5 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1 shrink-0">
            <Users className="w-3.5 h-3.5" />
            {compactNumber(room?.viewerCount ?? 0)}
          </span>

          <button
            onClick={handleCloseParty}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Second line — hour progress + rule + id */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-[8%] rounded-full bg-gradient-to-r from-[#F5C518] to-[#FF8A2A]" />
          </div>
          <button className="h-6 px-2 rounded-full bg-white/10 text-white/80 text-[10px] font-semibold">
            Rule
          </button>
          <span className="text-[10px] text-white/50">ID {room?._id?.slice(-8) ?? '—'}</span>
        </div>
      </header>

      {/* ── Promo banner (#17.2) ───────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button className="h-8 px-3 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-[#F5C518]" /> Make A Wish
        </button>
        <div className="flex-1 h-8 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] flex items-center px-3">
          <p className="text-[11px] text-white font-semibold truncate">
            {room?.announcement || '#Share Your Glory Moments'}
          </p>
        </div>
      </div>

      {/* ── 16-seat board (#17.3) ──────────────────────────────── */}
      <div className="px-3">
        <SeatBoard
          host={room?.ownerId}
          seats={room?.seats ?? []}
          seatCount={room?.seatCount ?? 16}
          onSeatPress={handleSeatPress}
          onHostPress={() => room?.ownerId?._id && navigate(`/user/${room.ownerId._id}`)}
        />
      </div>

      {/* ── Win bar (#17.4) ────────────────────────────────────── */}
      {latestWin && (
        <div className="mx-3 mt-3 h-9 rounded-full bg-gradient-to-r from-[#F5C518] to-[#FF8A2A] flex items-center px-3 gap-2 overflow-hidden">
          <span className="text-sm">🎉</span>
          <p className="text-[12px] font-bold text-[#2A1655] truncate">
            {latestWin.nickname} won {compactNumber(latestWin.amount ?? 0)}
          </p>
        </div>
      )}

      {/* ── Warning (#17.5) ────────────────────────────────────── */}
      <p className="px-4 pt-3 text-[10px] text-[#5EE7F0]/80 leading-relaxed">
        Pornography, violence and other illegal content are strictly prohibited in this room.
      </p>

      {/* ── Chat filter + messages (#17.6, #17.7) ──────────────── */}
      <div className="flex-1 flex gap-2 px-3 pt-2 pb-2 min-h-[120px] items-end">
        <div className="flex flex-col gap-1 shrink-0 mb-1">
          {(['all', 'room', 'chat'] as ChatFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full py-2 px-1 flex items-center justify-center transition-all ${
                filter === key ? 'bg-[#5b5cff] shadow-md' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              <span className={`text-[10px] font-bold tracking-widest uppercase [writing-mode:vertical-lr] ${
                filter === key ? 'text-white' : 'text-white/60'
              }`}>
                {key}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar max-h-[30vh]">
          {visibleMessages.length === 0 ? (
            <p className="text-[11px] text-white/40 pt-2">Say hello to the room…</p>
          ) : (
            visibleMessages.map((msg) => (
              <p key={msg.id} className="text-[12px] leading-snug">
                {msg.kind === 'join' ? (
                  <span className="text-[#F5C518]">
                    {msg.level != null && (
                      <span className="mr-1 px-1 rounded bg-white/15 text-white text-[10px]">
                        Lv.{msg.level}
                      </span>
                    )}
                    {msg.nickname} joined
                  </span>
                ) : msg.kind === 'win' ? (
                  <span className="text-[#FFB020]">
                    🎉 {msg.nickname} won {compactNumber(msg.amount ?? 0)}
                  </span>
                ) : (
                  <span className="text-white/90">
                    <span className="text-[#9BB4FF] font-semibold">{msg.nickname}: </span>
                    {msg.text}
                  </span>
                )}
              </p>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom bar, Chat & icons (#17.8) ────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 safe-bottom border-t border-white/10">
        <MessageInput onSend={handleSendMessage} />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggleMic}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center ${micOn ? 'bg-white/10' : 'bg-red-500/80'}`}
            aria-label={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <PiMicrophoneFill className="w-[18px] h-[18px] text-white" /> : <PiMicrophoneSlashFill className="w-[18px] h-[18px] text-white" />}
          </button>
          
          <button
            onClick={() => setToolsOpen(true)}
            aria-label="Tools"
            className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <PiSlidersFill className="w-[18px] h-[18px] text-white" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-status-live" />
          </button>
        </div>
      </div>

      <HostToolsSheet
        isOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
        isHost={isHost}
        onAction={handleTool}
      />
      <PkTypesSheet isOpen={pkOpen} onClose={() => setPkOpen(false)} roomId={id} />

      {/* Gift Panel Overlay */}
      {giftPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGiftPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-t-sheet max-h-[80vh] flex flex-col animate-slide-up pb-safe">
             <div className="flex items-center justify-between px-4 h-14 shrink-0">
                <h3 className="text-base font-bold text-white">Send Gift</h3>
                <button onClick={() => setGiftPanelOpen(false)} aria-label="Close" className="text-white/60 p-1"><X className="w-5 h-5" /></button>
             </div>
             <div className="flex-1 overflow-y-auto">
               <GiftPanel receiverId={room?.ownerId?._id ?? ''} onSend={handleSendGift} />
             </div>
          </div>
        </div>
      )}

      {/* Floating gift / sticker animation items */}
      <FloatingGifts items={floatingGiftItems} />

      {/* Full screen gift animation overlay */}
      <GiftOverlay burst={giftBurst} />
    </div>
  );
};
