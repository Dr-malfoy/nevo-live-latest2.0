import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiChatCircleFill as MessageCircle,
  PiPlusBold as Plus,
  PiMagnifyingGlassBold as Search,
  PiVideoCameraFill as Video,
  PiCaretLeftBold as ChevronLeft,
  PiUsersThreeFill as UsersGroup,
  PiEnvelopeSimpleOpenFill as EnvelopeOpen,
  PiXBold as X,
  PiBellSlashFill as BellOff,
  PiBellFill as Bell,
  PiTrashFill as Trash,
  PiFlagFill as Flag,
  PiUserFill as UserIcon,
  PiPaperPlaneRightFill as SendIcon,
  PiUserCircleFill as UserCircleIcon,
} from 'react-icons/pi';
import { chatApi, callApi, usersApi, reportApi } from '../api';
import { optional } from '../api/pending';
import { useSocketStore, useAuthStore, useUIStore } from '../stores';
import { ActiveUserStrip, ChatListRow, OfficialRow, type ChatRow } from '../components/chat';
import { Avatar } from '../components/user';
import { LevelBadge } from '../components/user/LevelBadge';
import { flagEmoji } from '../lib/countries';
import { CallScreen, MemberPicker, CallInviteBanner, type IncomingGroupInvite } from '../components/call';
import { Modal, Loading } from '../components/ui';
import type { ActiveChatUser, OfficialChatKey, OfficialChatRow } from '../api/chat.api';

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Inappropriate or adult content',
  'Fraud or scam',
  'Impersonation or fake account',
  'Hate speech or abusive language',
  'Other violation',
];

type ChatFilterTab = 'all' | 'unread' | 'groups';

export const Chats = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [official, setOfficial] = useState<OfficialChatRow[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<ChatFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [call, setCall] = useState<{
    outgoing?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      token: string;
      callee?: { nickname: string; avatar?: string } | null;
    };
    incoming?: IncomingGroupInvite;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [invite, setInvite] = useState<IncomingGroupInvite | null>(null);

  // Global user search by ID / name
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setGlobalUsers([]);
      setIsSearchingGlobal(false);
      return;
    }

    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await usersApi.searchUsers(q);
        if (data.success) {
          const list = (data.data || []).filter((u: any) => u._id !== currentUser?._id);
          setGlobalUsers(list);
        } else {
          setGlobalUsers([]);
        }
      } catch {
        setGlobalUsers([]);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUser?._id]);

  // Long press actions & modal state
  const [selectedChatForActions, setSelectedChatForActions] = useState<ChatRow | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const callRef = useRef(call);
  callRef.current = call;
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    try {
      const [list, officialRows, active] = await Promise.all([
        chatApi.getChats({ limit: 50 }).then(({ data }) => (data.success ? data.data || [] : [])).catch(() => []),
        optional(chatApi.getOfficialRows()).then((r) => r?.data || []),
        optional(chatApi.getActiveUsers()).then((r) => r?.data || []),
      ]);

      setChats(list);
      setOfficial(officialRows);
      setActiveUsers(active || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh — new messages, read receipts, delivery receipts reorder the list
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(load, 350);
    };
    socket.on('chat:message', refresh);
    socket.on('chat:read', refresh);
    socket.on('chat:seen', refresh);
    socket.on('chat:delivered', refresh);

    return () => {
      socket.off('chat:message', refresh);
      socket.off('chat:read', refresh);
      socket.off('chat:seen', refresh);
      socket.off('chat:delivered', refresh);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [socket, load]);

  const loadActiveCalls = () => {
    callApi
      .getActive()
      .then(({ data }) => {
        if (data.success) setActiveCalls(data.data || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadActiveCalls();
    const t = setInterval(loadActiveCalls, 15000);
    return () => clearInterval(t);
  }, []);

  /* ── Group calls ────────────────────────────────────────────────── */

  const startGroupCall = async (users: { _id: string; nickname: string; avatar?: string }[]) => {
    setShowPicker(false);
    try {
      const { data } = await callApi.create(users.map((u) => u._id), 'video');
      if (data.success && data.data) {
        setCallAccepted(false);
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: users.length === 1 ? { nickname: users[0].nickname, avatar: users[0].avatar } : null,
          },
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not start the group call', 'error');
    }
  };

  const joinCall = async (callId: string) => {
    try {
      const { data } = await callApi.join(callId);
      if (data.success && data.data) {
        setCallAccepted(true);
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
          },
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not join the call', 'error');
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onInvite = (payload: any) => {
      if (!payload?.callId || !payload?.participantCount || payload.participantCount <= 2) return;
      if (currentUser && payload.initiatorId === currentUser._id) return;
      setInvite({
        callId: payload.callId,
        channel: payload.channel,
        type: payload.type,
        initiatorId: payload.initiatorId,
        token: payload.token,
        participantCount: payload.participantCount,
        maxParticipants: payload.maxParticipants,
      });
    };
    const onAccept = (payload: any) => {
      if (payload?.callId && callRef.current?.outgoing?.callId === payload.callId) setCallAccepted(true);
    };
    socket.on('call:invite', onInvite);
    socket.on('call:accept', onAccept);
    return () => {
      socket.off('call:invite', onInvite);
      socket.off('call:accept', onAccept);
    };
  }, [socket, currentUser]);

  const acceptInvite = async (inv: IncomingGroupInvite) => {
    setInvite(null);
    try {
      const { data } = await callApi.accept(inv.callId);
      if (data.success && data.data) {
        setCallAccepted(true);
        setCall({ incoming: { ...inv, initiator: inv.initiator || null } });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not accept the call', 'error');
    }
  };

  const declineInvite = async (inv: IncomingGroupInvite) => {
    setInvite(null);
    await callApi.end(inv.callId, 'rejected').catch(() => {});
  };

  /* ── Row actions ────────────────────────────────────────────────── */

  const handleMute = async (chatId: string, muted: boolean) => {
    setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted } : c)));
    showToast(muted ? 'Notifications muted for this chat' : 'Notifications unmuted', 'success');
    const result = await optional(chatApi.muteChat(chatId, muted)).catch(() => null);
    if (result === null) {
      setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted: !muted } : c)));
      showToast('Mute is not available yet', 'info');
    }
  };

  const handleDelete = async (chatId: string) => {
    const previous = chats;
    setChats((rows) => rows.filter((c) => c._id !== chatId));
    showToast('Conversation removed', 'success');
    const result = await optional(chatApi.deleteChat(chatId)).catch(() => null);
    if (result === null) {
      setChats(previous);
      showToast('Deleting a chat is not available yet', 'info');
    }
  };

  const handleOpenActions = (chat: ChatRow) => {
    setSelectedChatForActions(chat);
    setShowActionsModal(true);
  };

  const handleToggleMuteFromModal = async () => {
    if (!selectedChatForActions) return;
    const newMuted = !selectedChatForActions.muted;
    const chatId = selectedChatForActions._id;
    setShowActionsModal(false);
    await handleMute(chatId, newMuted);
    showToast(newMuted ? 'Notifications muted for this chat' : 'Notifications unmuted', 'success');
  };

  const handleOpenDeleteConfirm = () => {
    setShowActionsModal(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedChatForActions) return;
    const chatId = selectedChatForActions._id;
    setShowDeleteConfirm(false);
    await handleDelete(chatId);
    showToast('Chat deleted successfully', 'success');
    setSelectedChatForActions(null);
  };

  const handleOpenReportModal = () => {
    setShowActionsModal(false);
    setSelectedReason(REPORT_REASONS[0]);
    setReportDetails('');
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!selectedChatForActions) return;
    const other = selectedChatForActions.other;
    const targetId = other?._id || selectedChatForActions._id;
    setSubmittingReport(true);
    try {
      await reportApi.createReport({
        targetType: other?._id ? 'user' : 'chat',
        targetId,
        reason: selectedReason,
        details: reportDetails.trim() || undefined,
      });
      setShowReportModal(false);
      showToast('Report submitted. Our moderation team will review it.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to submit report', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleStartChatWithUser = async (targetUserId: string) => {
    try {
      const { data } = await chatApi.getOrCreateChat(targetUserId);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${targetUserId}`);
      }
    } catch {
      navigate(`/user/${targetUserId}`);
    }
  };

  const openOfficial = (key: OfficialChatKey) => {
    optional(chatApi.markOfficialRead(key)).catch(() => {});
    navigate(key === 'new_followers' ? '/notifications' : '/official-notifications');
  };

  // Filter calculations
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((sum, c) => sum + (c.unread || 0), 0);
  }, [chats]);

  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const clean = searchQuery.trim().toLowerCase().replace(/^(id\s*:\s*|#|@)/i, '');
        const nameMatch = c.other?.nickname?.toLowerCase().includes(clean);
        const uidMatch = c.other?.uid?.toLowerCase().includes(clean);
        const idMatch = c.other?._id?.toLowerCase().includes(clean);
        const msgMatch = c.lastMessage?.toLowerCase().includes(clean);
        if (!nameMatch && !uidMatch && !idMatch && !msgMatch) return false;
      }

      // Tab filter
      if (currentTab === 'unread') {
        return (c.unread || 0) > 0;
      }
      if (currentTab === 'groups') {
        return c.type === 'group';
      }
      return true;
    });
  }, [chats, currentTab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-line/70 shadow-xs">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-ink active:bg-surface-sunken transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-extrabold text-ink tracking-tight">Messages</h1>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[11px] font-black shadow-sm">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearching(!isSearching)}
              aria-label="Search"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isSearching ? 'bg-primary-50 text-primary-600' : 'text-ink active:bg-surface-sunken'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPicker(true)}
              aria-label="New chat or group"
              className="w-9 h-9 rounded-full bg-ink text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {isSearching && (
          <div className="px-4 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 px-3.5 h-10 rounded-xl bg-slate-100/90 border border-slate-200 focus-within:border-primary-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/10 transition-all">
              <Search className="w-4 h-4 text-ink-muted" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by ID, name, or message…"
                className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-ink-muted hover:text-ink">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          {/* ── Upper Section: Followers & Friends Strip with Green Online Ring ── */}
          {!searchQuery.trim() && <ActiveUserStrip users={activeUsers} />}

          {/* ── Filter Segment Bar (All, Unread, Groups) ─────────────── */}
          {!searchQuery.trim() && (
            <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md px-4 py-2.5 border-b border-line/60">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setCurrentTab('all')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                    currentTab === 'all'
                      ? 'bg-white text-ink shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      currentTab === 'all' ? 'bg-slate-100 text-ink' : 'bg-slate-200/60 text-ink-muted'
                    }`}
                  >
                    {chats.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentTab('unread')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                    currentTab === 'unread'
                      ? 'bg-white text-primary-600 shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <span>Unread</span>
                  {totalUnreadCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {totalUnreadCount}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200/60 text-ink-muted text-[10px]">
                      0
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setCurrentTab('groups')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200 ${
                    currentTab === 'groups'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <UsersGroup className="w-3.5 h-3.5" />
                  <span>Groups</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      currentTab === 'groups' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200/60 text-ink-muted'
                    }`}
                  >
                    {chats.filter((c) => c.type === 'group').length}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Active group calls banner */}
          {activeCalls.length > 0 && currentTab !== 'unread' && !searchQuery.trim() && (
            <div className="mt-2.5 mx-4 rounded-2xl bg-white border border-emerald-100 shadow-xs overflow-hidden">
              <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-600" /> Active calls
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                  {activeCalls.length} LIVE
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {activeCalls.map((c: any) => (
                  <button
                    key={c.callId}
                    onClick={() => joinCall(c.callId)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-emerald-50/50 active:bg-emerald-100/50 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-emerald-600" />
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-sm text-ink">
                        {c.type === 'video' ? 'Video' : 'Audio'} Group Call
                      </p>
                      <p className="text-xs text-ink-muted truncate">
                        {c.participants?.map((p: any) => p.nickname).slice(0, 3).join(', ') || 'Members'}
                        {c.participants?.length > 3 ? ` +${c.participants.length - 3}` : ''}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
                      Join
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Official channels (shown on 'all' tab) */}
          {official.length > 0 && currentTab === 'all' && !searchQuery.trim() && (
            <div className="mt-2.5 bg-white border-y border-line/60 divide-y divide-line/50">
              {official.map((row) => (
                <OfficialRow key={row.key} row={row} onClick={() => openOfficial(row.key)} />
              ))}
            </div>
          )}

          {/* ── Main Chat List / Search Results Section ─────────────── */}
          <div className="mt-2.5 pb-20">
            {/* When user is actively searching */}
            {searchQuery.trim() ? (
              <div className="space-y-4">
                {/* 1. Matching existing conversations */}
                {filteredChats.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-100/80 border-y border-line/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Conversations ({filteredChats.length})
                      </span>
                    </div>
                    <div className="bg-white border-b border-line/60 divide-y divide-line/40">
                      {filteredChats.map((chat) => (
                        <ChatListRow
                          key={chat._id}
                          chat={chat}
                          currentUserId={currentUser?._id}
                          onOpen={() => navigate(`/chat/${chat._id}`)}
                          onMute={(muted) => handleMute(chat._id, muted)}
                          onDelete={() => handleDelete(chat._id)}
                          onLongPress={handleOpenActions}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Global users found by ID / name */}
                {globalUsers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-100/80 border-y border-line/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                        Users Found by ID / Name ({globalUsers.length})
                      </span>
                    </div>
                    <div className="bg-white border-b border-line/60 divide-y divide-line/40">
                      {globalUsers.map((u) => (
                        <div
                          key={u._id}
                          className="flex items-center gap-3.5 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                          <div
                            role="button"
                            onClick={() => navigate(`/user/${u._id}`)}
                            className="cursor-pointer shrink-0"
                          >
                            <Avatar
                              src={u.avatar}
                              nickname={u.nickname || '?'}
                              size="md"
                              online={u.online}
                              className="ring-1 ring-black/5"
                            />
                          </div>

                          <div
                            role="button"
                            onClick={() => navigate(`/user/${u._id}`)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                              <span className="font-bold text-[15px] text-ink truncate hover:text-primary-600 transition-colors">
                                {u.nickname || 'User'}
                              </span>
                              {u.uid && (
                                <span className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-200 px-1.5 py-0.2 rounded-md shrink-0">
                                  ID: {u.uid}
                                </span>
                              )}
                              {u.country && (
                                <span className="shrink-0 text-sm leading-none">{flagEmoji(u.country)}</span>
                              )}
                              {typeof u.level === 'number' && u.level > 0 && <LevelBadge level={u.level} />}
                            </div>
                            <p className="text-xs text-ink-muted truncate">
                              {u.bio || (u.online ? 'Online now' : 'Active user')}
                            </p>
                          </div>

                          <button
                            onClick={() => handleStartChatWithUser(u._id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-600 text-white text-xs font-bold shadow-xs hover:bg-primary-700 active:scale-95 transition-all shrink-0"
                          >
                            <SendIcon className="w-3.5 h-3.5" />
                            <span>Message</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty search results */}
                {filteredChats.length === 0 && globalUsers.length === 0 && !isSearchingGlobal && (
                  <div className="text-center pt-16 px-8 animate-in fade-in duration-300">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-card flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-ink mb-1">
                      No user found for “{searchQuery}”
                    </p>
                    <p className="text-xs text-ink-muted max-w-xs mx-auto mb-4">
                      Try searching with an exact User ID (e.g. ID: 168001), username, or nickname.
                    </p>
                  </div>
                )}

                {/* Searching indicator */}
                {isSearchingGlobal && (
                  <div className="text-center py-6 text-xs text-ink-muted animate-pulse">
                    Searching for user ID...
                  </div>
                )}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center pt-16 px-8 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-card flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                  {currentTab === 'unread' ? (
                    <EnvelopeOpen className="w-8 h-8 text-primary-500" />
                  ) : currentTab === 'groups' ? (
                    <UsersGroup className="w-8 h-8 text-indigo-500" />
                  ) : (
                    <MessageCircle className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <p className="text-base font-bold text-ink mb-1">
                  {currentTab === 'unread'
                    ? "You're all caught up!"
                    : currentTab === 'groups'
                      ? 'No group chats yet'
                      : 'No messages yet'}
                </p>

                <p className="text-xs text-ink-muted max-w-xs mx-auto mb-4">
                  {currentTab === 'unread'
                    ? 'No unread messages across your conversations.'
                    : currentTab === 'groups'
                      ? 'Create a group or invite friends to start group chatting.'
                      : 'Connect with your followers and friends in the story strip above or search by user ID.'}
                </p>

                {currentTab === 'groups' && (
                  <button
                    onClick={() => setShowPicker(true)}
                    className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    Start a Group
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border-y border-line/60 divide-y divide-line/40">
                {filteredChats.map((chat) => (
                  <ChatListRow
                    key={chat._id}
                    chat={chat}
                    currentUserId={currentUser?._id}
                    onOpen={() => navigate(`/chat/${chat._id}`)}
                    onMute={(muted) => handleMute(chat._id, muted)}
                    onDelete={() => handleDelete(chat._id)}
                    onLongPress={handleOpenActions}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Long Press Chat Action Modal ────────────────────────────── */}
      <Modal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        title="Chat Options"
      >
        {selectedChatForActions && (
          <div className="space-y-3 pt-1">
            {/* User header info */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Avatar
                src={selectedChatForActions.other?.avatar}
                nickname={selectedChatForActions.other?.nickname || 'User'}
                size="md"
                online={selectedChatForActions.other?.online}
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-ink truncate">
                  {selectedChatForActions.other?.nickname || 'Conversation'}
                </p>
                <p className="text-xs text-ink-muted truncate">
                  {selectedChatForActions.other?.online ? 'Online now' : 'Offline'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-1 divide-y divide-slate-100">
              {/* Mute / Unmute */}
              <button
                onClick={handleToggleMuteFromModal}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200/70 text-ink text-sm font-semibold transition-colors"
              >
                {selectedChatForActions.muted ? (
                  <Bell className="w-5 h-5 text-primary-600 shrink-0" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-500 shrink-0" />
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm">
                    {selectedChatForActions.muted ? 'Unmute Notifications' : 'Mute Notifications'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {selectedChatForActions.muted
                      ? 'Resume alerts for new messages'
                      : 'Silence alerts from this conversation'}
                  </p>
                </div>
              </button>

              {/* View profile */}
              {selectedChatForActions.other?._id && (
                <button
                  onClick={() => {
                    setShowActionsModal(false);
                    navigate(`/user/${selectedChatForActions.other?._id}`);
                  }}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200/70 text-ink text-sm font-semibold transition-colors"
                >
                  <UserIcon className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm">View Profile</p>
                    <p className="text-xs text-ink-muted">Check user profile, moments & posts</p>
                  </div>
                </button>
              )}

              {/* Delete conversation */}
              <button
                onClick={handleOpenDeleteConfirm}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-600 text-sm font-semibold transition-colors"
              >
                <Trash className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm text-red-600">Delete Whole Chat</p>
                  <p className="text-xs text-red-400">Remove entire conversation & messages</p>
                </div>
              </button>

              {/* Report user */}
              <button
                onClick={handleOpenReportModal}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 text-amber-600 text-sm font-semibold transition-colors"
              >
                <Flag className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm text-amber-600">Report User</p>
                  <p className="text-xs text-amber-500">Report spam, harassment, or scam</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Remove / Delete Whole Chat Confirmation Modal ────────────── */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Whole Conversation?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-ink-muted">
            Are you sure you want to delete this entire chat? This will remove all messages from your message list.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-ink active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white active:bg-red-800 shadow-sm"
            >
              Delete Chat
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Send Report Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Report User"
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
              placeholder="Please provide additional details to help our moderation team…"
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

      {/* Member Picker Modal */}
      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="New Conversation or Call">
        <MemberPicker onConfirm={startGroupCall} onClose={() => setShowPicker(false)} />
      </Modal>

      <CallInviteBanner invite={invite} onAccept={acceptInvite} onDecline={declineInvite} />

      {call && (
        <CallScreen
          incoming={call.incoming as any}
          outgoing={call.outgoing as any}
          accepted={callAccepted}
          onClose={() => {
            setCall(null);
            setCallAccepted(false);
            loadActiveCalls();
          }}
        />
      )}
    </div>
  );
};

