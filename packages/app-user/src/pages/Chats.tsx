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
  PiFunnelFill as FilterIcon,
  PiCheckBold as CheckIcon,
  PiShieldCheckFill as ShieldCheck,
  PiProhibitFill as Prohibit,
} from 'react-icons/pi';
import { chatApi, callApi, usersApi, reportApi, storyApi, noteApi } from '../api';
import type { UserStoryGroup } from '../api/story.api';
import type { NoteItem } from '../api/note.api';
import { optional } from '../api/pending';
import { useSocketStore, useAuthStore, useUIStore } from '../stores';
import {
  ActiveUserStrip,
  ChatListRow,
  StoryViewerModal,
  CreateStoryModal,
  CreateNoteModal,
  type ChatRow,
} from '../components/chat';
import { Avatar } from '../components/user';
import { LevelBadge } from '../components/user/LevelBadge';
import { flagEmoji } from '../lib/countries';
import { CallScreen, MemberPicker, CallInviteBanner, type IncomingGroupInvite } from '../components/call';
import { Modal, Loading } from '../components/ui';
import type { ActiveChatUser, OfficialChatKey, OfficialChatRow } from '../api/chat.api';
import { isChatDeleted, markChatDeleted } from '../lib/deletedChats';

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Inappropriate or adult content',
  'Fraud or scam',
  'Impersonation or fake account',
  'Hate speech or abusive language',
  'Other violation',
];

// The exact 6 required message tabs
export type MessageTab = 'all' | 'following' | 'friends' | 'strangers' | 'agency' | 'system';

// Secondary filter system
export type MessageFilterType = 'all' | 'unread' | 'online' | 'stories';

const TABS: { key: MessageTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'following', label: 'Following' },
  { key: 'friends', label: 'Friends' },
  { key: 'strangers', label: 'Strangers' },
  { key: 'agency', label: 'Agency' },
  { key: 'system', label: 'System' },
];

const DEFAULT_OFFICIALS: OfficialChatRow[] = [
  {
    key: 'system',
    title: 'System Notice',
    icon: '',
    subtitle: 'Welcome to Nevo Live! Enjoy live streaming and chatting.',
    unread: 0,
    time: new Date().toISOString(),
  },
  {
    key: 'arrival_notice',
    title: 'Arrival Notice',
    icon: '',
    subtitle: 'Discover trending streamers and friends in your area.',
    unread: 0,
    time: new Date().toISOString(),
  },
  {
    key: 'new_followers',
    title: 'Followers',
    icon: '',
    subtitle: 'Check out who followed you and send a greeting.',
    unread: 0,
    time: new Date().toISOString(),
  },
  {
    key: 'income_reminder',
    title: 'Income Reminder',
    icon: '',
    subtitle: 'Daily settlement and reward points update.',
    unread: 0,
    time: new Date().toISOString(),
  },
];

export const Chats = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveChatUser[]>([]);
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 6 Tabs & Filter State
  const [currentTab, setCurrentTab] = useState<MessageTab>('all');
  const [filterType, setFilterType] = useState<MessageFilterType>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Story & Note Modals
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [showCreateNote, setShowCreateNote] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyViewerGroupIndex, setStoryViewerGroupIndex] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [globalUsers, setGlobalUsers] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Call state
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

  // Long press actions & report modal state
  const [selectedChatForActions, setSelectedChatForActions] = useState<ChatRow | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const callRef = useRef(call);
  callRef.current = call;
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Load chat list, official rows, stories, notes, and active users
  const load = useCallback(async () => {
    try {
      const [listRes, officialRes, activeRes, storiesRes, notesRes] = await Promise.all([
        chatApi.getChats({ limit: 50 }).then(({ data }) => (data.success ? data.data || [] : [])).catch(() => []),
        optional(chatApi.getOfficialRows()).then((r) => r?.data || []),
        optional(chatApi.getActiveUsers()).then((r) => r?.data || []),
        storyApi.getStories().then(({ data }) => (data.success ? data.data || [] : [])).catch(() => []),
        noteApi.getNotes().then(({ data }) => (data.success ? data.data || [] : [])).catch(() => []),
      ]);

      const officialList = (officialRes && officialRes.length > 0) ? officialRes : DEFAULT_OFFICIALS;

      // Filter out official channels that the user has previously deleted
      const activeOfficialList = officialList.filter((row) => {
        return !isChatDeleted(row.key, currentUser?._id) && !isChatDeleted(`official_${row.key}`, currentUser?._id);
      });

      // Map official channels into standard ChatRow representations so they appear as normal conversation rows
      const officialChatRows: ChatRow[] = activeOfficialList.map((row) => ({
        _id: `official_${row.key}`,
        category: 'system',
        type: 'system',
        officialKey: row.key,
        other: {
          _id: `official_${row.key}`,
          nickname: row.title,
          avatar: row.icon,
          category: 'system',
          isOfficial: true,
        },
        lastMessage: row.subtitle,
        lastMessageAt: row.time,
        unread: row.unread,
        muted: false,
      }));

      // Combine official chats seamlessly with user conversations and filter out any deleted IDs
      const rawUserChats = (listRes || []).filter((c: any) => !isChatDeleted(c._id, currentUser?._id));
      const allRows = [...officialChatRows, ...rawUserChats];
      setChats(allRows);
      setActiveUsers(activeRes || []);
      setStoryGroups(storiesRes || []);
      setNotes(notesRes || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    load();
  }, [load]);

  // Global user search by ID / username
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

  // Real-time socket updates
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

  /* ── Calls ─────────────────────────────────────────────────────────── */
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

  /* ── Chat Row Actions ────────────────────────────────────────────── */
  const handleMute = async (chatId: string, muted: boolean) => {
    setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted } : c)));
    showToast(muted ? 'Notifications muted for this chat' : 'Notifications unmuted', 'success');
    if (!chatId.startsWith('official_')) {
      const result = await optional(chatApi.muteChat(chatId, muted)).catch(() => null);
      if (result === null) {
        setChats((rows) => rows.map((c) => (c._id === chatId ? { ...c, muted: !muted } : c)));
      }
    }
  };

  const handleDelete = async (chatId: string) => {
    markChatDeleted(chatId, currentUser?._id);
    if (selectedChatForActions?.officialKey) {
      markChatDeleted(selectedChatForActions.officialKey, currentUser?._id);
    }
    if (selectedChatForActions?.other?._id) {
      markChatDeleted(selectedChatForActions.other._id, currentUser?._id);
    }
    setChats((rows) => rows.filter((c) => c._id !== chatId && c.officialKey !== chatId));
    showToast('Conversation removed', 'success');
    if (!chatId.startsWith('official_')) {
      await optional(chatApi.deleteChat(chatId)).catch(() => null);
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
    setSelectedChatForActions(null);
  };

  const handleOpenBlockConfirm = () => {
    setShowActionsModal(false);
    setShowBlockConfirm(true);
  };

  const handleConfirmBlock = async () => {
    if (!selectedChatForActions) return;
    const targetId = selectedChatForActions.other?._id;
    const chatId = selectedChatForActions._id;
    setShowBlockConfirm(false);
    if (targetId) {
      try {
        await usersApi.blockUser(targetId);
        setChats((rows) => rows.filter((c) => c._id !== chatId && c.other?._id !== targetId));
        showToast('User blocked successfully', 'success');
      } catch (err: any) {
        showToast(err?.response?.data?.error || 'Failed to block user', 'error');
      }
    }
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

  const handleOpenChatRow = (chat: ChatRow) => {
    if (chat.officialKey || chat._id.startsWith('official_')) {
      const key = (chat.officialKey || chat._id.replace('official_', '')) as OfficialChatKey;
      openOfficial(key);
    } else {
      navigate(`/chat/${chat._id}`);
    }
  };

  // Open story viewer by userId
  const handleOpenStoryByUserId = (userId: string) => {
    const idx = storyGroups.findIndex((g) => g.user._id === userId);
    if (idx >= 0) {
      setStoryViewerGroupIndex(idx);
      setShowStoryViewer(true);
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const handleOpenStoryByIndex = (index: number) => {
    setStoryViewerGroupIndex(index);
    setShowStoryViewer(true);
  };

  /* ── Tab & Filter Calculations ───────────────────────────────────── */
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((sum, c) => sum + (c.unread || 0), 0);
  }, [chats]);

  // Counts for each of the 6 tabs
  const tabCounts = useMemo(() => {
    const counts: Record<MessageTab, number> = {
      all: chats.length,
      following: 0,
      friends: 0,
      strangers: 0,
      agency: 0,
      system: 0,
    };

    for (const c of chats) {
      const cat = c.category || c.other?.category;
      if (cat === 'following' || c.other?.isFollowing) counts.following++;
      if (cat === 'friends' || c.other?.isFriend) counts.friends++;
      if (cat === 'strangers' || (!c.other?.isFollowing && !c.other?.isFriend && !c.other?.isAgency && c.type !== 'system')) counts.strangers++;
      if (cat === 'agency' || c.other?.isAgency || c.type === 'agency') counts.agency++;
      if (cat === 'system' || c.type === 'system' || c.officialKey) counts.system++;
    }

    return counts;
  }, [chats]);

  // Filtered chats based on selected tab, search query, and secondary filter
  const filteredChats = useMemo(() => {
    return chats.filter((c) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const clean = searchQuery.trim().toLowerCase().replace(/^(id\s*:\s*|#|@)/i, '');
        const nameMatch = c.other?.nickname?.toLowerCase().includes(clean);
        const uidMatch = c.other?.uid?.toLowerCase().includes(clean);
        const idMatch = c.other?._id?.toLowerCase().includes(clean);
        const msgMatch = c.lastMessage?.toLowerCase().includes(clean);
        if (!nameMatch && !uidMatch && !idMatch && !msgMatch) return false;
      }

      // 2. Tab Filter (The 6 Tabs)
      const cat = c.category || c.other?.category;
      if (currentTab === 'following' && cat !== 'following' && !c.other?.isFollowing) return false;
      if (currentTab === 'friends' && cat !== 'friends' && !c.other?.isFriend) return false;
      if (
        currentTab === 'strangers' &&
        cat !== 'strangers' &&
        (c.other?.isFollowing || c.other?.isFriend || c.other?.isAgency || c.type === 'system' || c.officialKey)
      )
        return false;
      if (currentTab === 'agency' && cat !== 'agency' && !c.other?.isAgency && c.type !== 'agency') return false;
      if (currentTab === 'system' && cat !== 'system' && c.type !== 'system' && !c.officialKey) return false;

      // 3. Secondary Filter System
      if (filterType === 'unread') {
        if ((c.unread || 0) <= 0) return false;
      } else if (filterType === 'online') {
        if (!c.other?.online && !c.officialKey) return false;
      } else if (filterType === 'stories') {
        if (!c.other?.hasStory) return false;
      }

      return true;
    });
  }, [chats, currentTab, filterType, searchQuery]);

  // Current user's active note
  const currentUserNote = useMemo(() => {
    return notes.find((n) => n.isSelf || n.user._id === currentUser?._id) || null;
  }, [notes, currentUser?._id]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Top Header with Frosted Glass Effect ───────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-black text-slate-900 tracking-tight">Messages</h1>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white text-[11px] font-black shadow-sm">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSearching(!isSearching)}
              aria-label="Search"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isSearching
                  ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-200'
                  : 'text-slate-700 hover:bg-slate-100 active:bg-slate-200'
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPicker(true)}
              aria-label="New chat or group"
              className="w-9 h-9 rounded-full bg-slate-900 hover:bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {isSearching && (
          <div className="px-4 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 px-3.5 h-10 rounded-2xl bg-slate-100/90 border border-slate-200/80 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user by ID, username, or message…"
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-700">
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
          {/* ── Upper Section: Stories, Notes & Active Users Strip ── */}
          {!searchQuery.trim() && (
            <ActiveUserStrip
              users={activeUsers}
              storyGroups={storyGroups}
              notes={notes}
              currentUser={currentUser}
              onOpenCreateStory={() => setShowCreateStory(true)}
              onOpenCreateNote={() => setShowCreateNote(true)}
              onOpenStoryViewer={handleOpenStoryByIndex}
              onUserSelect={(user) => handleStartChatWithUser(user._id)}
            />
          )}

          {/* ── 6 Message Tabs & Filter System Bar ─────────────────── */}
          {!searchQuery.trim() && (
            <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between px-3.5 py-2.5 gap-2">
                {/* 6 Tabs Scrollable Segmented Bar */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
                  {TABS.map((tab) => {
                    const isActive = currentTab === tab.key;
                    const count = tabCounts[tab.key];
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setCurrentTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm scale-100'
                            : 'bg-slate-100/90 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Filter Button & Dropdown */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      filterType !== 'all'
                        ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Filter Messages"
                  >
                    <FilterIcon className="w-3.5 h-3.5 text-inherit" />
                    <span className="hidden sm:inline capitalize">
                      {filterType === 'all' ? 'Filter' : filterType}
                    </span>
                    {filterType !== 'all' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>

                  {/* Filter Dropdown Popover */}
                  {showFilterMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 space-y-0.5 z-40 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Filter By
                      </div>
                      {[
                        { key: 'all', label: 'All Messages' },
                        { key: 'unread', label: 'Unread Only' },
                        { key: 'online', label: 'Online Users' },
                        { key: 'stories', label: 'With Stories' },
                      ].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => {
                            setFilterType(f.key as MessageFilterType);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            filterType === f.key
                              ? 'bg-rose-50 text-rose-600 font-bold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span>{f.label}</span>
                          {filterType === f.key && <CheckIcon className="w-3.5 h-3.5 text-rose-600" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active group calls banner */}
          {activeCalls.length > 0 && currentTab !== 'system' && !searchQuery.trim() && (
            <div className="mt-3 mx-4 rounded-2xl bg-white border border-emerald-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" /> Active calls
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                  {activeCalls.length} LIVE
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {activeCalls.map((c: any) => (
                  <button
                    key={c.callId}
                    onClick={() => joinCall(c.callId)}
                    className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-emerald-50/50 active:bg-emerald-100/50 transition-colors"
                  >
                    <span className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-emerald-600" />
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-bold text-sm text-slate-900">
                        {c.type === 'video' ? 'Video' : 'Audio'} Group Call
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.participants?.map((p: any) => p.nickname).slice(0, 3).join(', ') || 'Members'}
                        {c.participants?.length > 3 ? ` +${c.participants.length - 3}` : ''}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 active:scale-95 transition-all shrink-0">
                      Join
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Main Chat List / Search Results Section ─────────────── */}
          <div className="mt-2.5 pb-24">
            {/* When user is actively searching */}
            {searchQuery.trim() ? (
              <div className="space-y-4">
                {/* 1. Matching existing conversations */}
                {filteredChats.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-100/80 border-y border-slate-200/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Conversations ({filteredChats.length})
                      </span>
                    </div>
                    <div className="bg-white border-b border-slate-100 divide-y divide-slate-100 shadow-xs">
                      {filteredChats.map((chat) => (
                        <ChatListRow
                          key={chat._id}
                          chat={chat}
                          currentUserId={currentUser?._id}
                          onOpen={() => handleOpenChatRow(chat)}
                          onMute={(muted) => handleMute(chat._id, muted)}
                          onDelete={() => handleDelete(chat._id)}
                          onLongPress={handleOpenActions}
                          onOpenStory={handleOpenStoryByUserId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Global users found by ID / name */}
                {globalUsers.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-slate-100/80 border-y border-slate-200/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Users Found by ID / Name ({globalUsers.length})
                      </span>
                    </div>
                    <div className="bg-white border-b border-slate-100 divide-y divide-slate-100 shadow-xs">
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
                              <span className="font-bold text-[15px] text-slate-900 truncate hover:text-rose-600 transition-colors">
                                {u.nickname || 'User'}
                              </span>
                              {u.uid && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                                  ID: {u.uid}
                                </span>
                              )}
                              {u.country && (
                                <span className="shrink-0 text-sm leading-none">{flagEmoji(u.country)}</span>
                              )}
                              {typeof u.level === 'number' && u.level > 0 && <LevelBadge level={u.level} />}
                            </div>
                            <p className="text-xs text-slate-500 truncate">
                              {u.bio || (u.online ? 'Online now' : 'Active user')}
                            </p>
                          </div>

                          <button
                            onClick={() => handleStartChatWithUser(u._id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs active:scale-95 transition-all shrink-0"
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
                    <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-900 mb-1">
                      No user found for “{searchQuery}”
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                      Try searching with an exact User ID (e.g. ID: 168001), username, or nickname.
                    </p>
                  </div>
                )}

                {/* Searching indicator */}
                {isSearchingGlobal && (
                  <div className="text-center py-6 text-xs text-slate-500 animate-pulse font-medium">
                    Searching for user ID...
                  </div>
                )}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center pt-16 px-8 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-3.5 text-slate-400">
                  {filterType === 'unread' ? (
                    <EnvelopeOpen className="w-8 h-8 text-rose-500" />
                  ) : currentTab === 'agency' ? (
                    <UsersGroup className="w-8 h-8 text-indigo-500" />
                  ) : (
                    <MessageCircle className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <p className="text-base font-bold text-slate-900 mb-1">
                  {filterType === 'unread'
                    ? "You're all caught up!"
                    : currentTab === 'following'
                      ? 'No following chats'
                      : currentTab === 'friends'
                        ? 'No friend chats yet'
                        : currentTab === 'strangers'
                          ? 'No stranger messages'
                          : currentTab === 'agency'
                            ? 'No agency messages'
                            : currentTab === 'system'
                              ? 'No system notices'
                              : 'No messages yet'}
                </p>

                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed">
                  {filterType !== 'all'
                    ? `No messages matching the "${filterType}" filter.`
                    : currentTab === 'following'
                      ? 'People you follow will show their messages here.'
                      : currentTab === 'friends'
                        ? 'Mutual followers and friends will appear here.'
                        : currentTab === 'strangers'
                          ? 'Incoming messages from new users will appear here.'
                          : 'Connect with people in the story strip above or search by user ID.'}
                </p>

                {filterType !== 'all' && (
                  <button
                    onClick={() => setFilterType('all')}
                    className="px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border-y border-slate-100 divide-y divide-slate-100/80 shadow-xs">
                {filteredChats.map((chat) => (
                  <ChatListRow
                    key={chat._id}
                    chat={chat}
                    currentUserId={currentUser?._id}
                    onOpen={() => handleOpenChatRow(chat)}
                    onMute={(muted) => handleMute(chat._id, muted)}
                    onDelete={() => handleDelete(chat._id)}
                    onLongPress={handleOpenActions}
                    onOpenStory={handleOpenStoryByUserId}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Story Creator Modal ─────────────────────────────────────── */}
      <CreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={load}
      />

      {/* ── Note Creator / Editor Modal ─────────────────────────────── */}
      <CreateNoteModal
        isOpen={showCreateNote}
        onClose={() => setShowCreateNote(false)}
        onNoteUpdated={load}
        existingNote={currentUserNote}
        currentUser={currentUser}
      />

      {/* ── Story Viewer Fullscreen Modal ───────────────────────────── */}
      <StoryViewerModal
        isOpen={showStoryViewer}
        onClose={() => setShowStoryViewer(false)}
        storyGroups={storyGroups}
        initialGroupIndex={storyViewerGroupIndex}
        onStoriesChanged={load}
      />

      {/* ── Long Press Chat Action Modal ────────────────────────────── */}
      <Modal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        title="Chat Options"
      >
        {selectedChatForActions && (
          <div className="space-y-3 pt-1">
            {/* User or Official Header Info */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <Avatar
                src={selectedChatForActions.other?.avatar}
                nickname={selectedChatForActions.other?.nickname || 'Conversation'}
                size="md"
                online={selectedChatForActions.other?.online}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-slate-900 truncate">
                    {selectedChatForActions.other?.nickname || 'Conversation'}
                  </p>
                  {selectedChatForActions.other?.isOfficial && (
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200/70 px-1.5 py-0.2 rounded-md shrink-0">
                      Official
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">
                  {selectedChatForActions.other?.isOfficial
                    ? 'Official platform channel'
                    : selectedChatForActions.other?.online
                      ? 'Online now'
                      : 'Offline'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-1 divide-y divide-slate-100">
              {/* Mute / Unmute */}
              <button
                onClick={handleToggleMuteFromModal}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200/70 text-slate-800 text-sm font-semibold transition-colors"
              >
                {selectedChatForActions.muted ? (
                  <Bell className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <BellOff className="w-5 h-5 text-slate-400 shrink-0" />
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm">
                    {selectedChatForActions.muted ? 'Unmute Notifications' : 'Mute Notifications'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedChatForActions.muted
                      ? 'Resume alerts for new messages'
                      : 'Silence alerts from this conversation'}
                  </p>
                </div>
              </button>

              {/* View profile (Only for normal users) */}
              {selectedChatForActions.other?._id && !selectedChatForActions.other?.isOfficial && (
                <button
                  onClick={() => {
                    setShowActionsModal(false);
                    navigate(`/user/${selectedChatForActions.other?._id}`);
                  }}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-slate-100 active:bg-slate-200/70 text-slate-800 text-sm font-semibold transition-colors"
                >
                  <UserIcon className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm">View Profile</p>
                    <p className="text-xs text-slate-500">Check user profile, moments & posts</p>
                  </div>
                </button>
              )}

              {/* Delete conversation (Allowed for both normal & official chats) */}
              <button
                onClick={handleOpenDeleteConfirm}
                className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-600 text-sm font-semibold transition-colors"
              >
                <Trash className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm text-red-600">Delete Chat</p>
                  <p className="text-xs text-red-400">Remove this conversation from your list</p>
                </div>
              </button>

              {/* Block user (Only for normal users — official channels cannot be blocked) */}
              {!selectedChatForActions.other?.isOfficial && selectedChatForActions.type !== 'system' && (
                <button
                  onClick={handleOpenBlockConfirm}
                  className="w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 text-red-600 text-sm font-semibold transition-colors"
                >
                  <Prohibit className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm text-red-600">Block User</p>
                    <p className="text-xs text-red-400">Block user from sending messages and calling</p>
                  </div>
                </button>
              )}

              {/* Report user (Only for normal users — official system channel cannot be blocked or reported) */}
              {!selectedChatForActions.other?.isOfficial && selectedChatForActions.type !== 'system' ? (
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
              ) : (
                <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2 text-xs text-blue-700">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Official system services cannot be blocked or reported.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Block User Confirmation Modal ───────────────────────────── */}
      <Modal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        title="Block User?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-slate-500">
            Are you sure you want to block <span className="font-semibold text-slate-800">{selectedChatForActions?.other?.nickname || 'this user'}</span>? They will not be able to message or call you, and this chat will be removed.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 active:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBlock}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-semibold text-white active:bg-red-800 shadow-sm"
            >
              Block User
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Remove / Delete Whole Chat Confirmation Modal ────────────── */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Conversation?"
      >
        <div className="space-y-4 pt-1">
          <p className="text-sm text-slate-500">
            Are you sure you want to delete this chat? This will remove all messages from your message list.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 active:bg-slate-100"
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
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
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
                      ? 'bg-rose-50 text-rose-700 border border-rose-300 font-bold'
                      : 'bg-slate-100 text-slate-800 hover:bg-slate-200/70 border border-transparent'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Please provide additional details to help our moderation team…"
              rows={3}
              className="w-full p-3 text-xs rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white resize-none text-slate-900"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 active:bg-slate-100"
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
