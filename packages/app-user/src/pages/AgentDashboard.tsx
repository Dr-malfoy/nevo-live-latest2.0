import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiBellFill as Bell,
  PiCaretDownBold as ChevronDown,
  PiCaretRightBold as ChevronRight,
  PiCoinsFill as Coins,
  PiGiftFill as Gift,
  PiHeadphonesFill as Headphones,
  PiMagnifyingGlassBold as Search,
  PiTrophyFill as Trophy,
  PiUserPlusFill as UserPlus,
  PiUsersFill as Users,
  PiPhoneFill as Phone,
  PiVideoCameraFill as Video,
  PiChatCircleDotsFill as ChatIcon,
  PiBuildingsFill as Buildings,
  PiGearFill as Gear,
  PiLockKeyFill as Lock,
  PiGlobeFill as Globe,
  PiCrownFill as Crown,
  PiPaperPlaneRightFill as SendIcon,
  PiArrowsLeftRightFill as ExchangeIcon,
  PiTrashFill as TrashIcon,
  PiCheckCircleFill as CheckCircle,
  PiXCircleFill as XCircle,
  PiCopyFill as CopyIcon,
  PiClockFill as ClockIcon,
  PiSparkleFill as Sparkle,
  PiSignOutFill as SignOut,
  PiBroadcastFill as BroadcastIcon,
  PiShieldCheckFill as ShieldCheck,
} from 'react-icons/pi';
import {
  agentApi,
  AGENT_RANGES,
  type AgentEarnings,
  type AgentHostData,
  type AgentHostRow,
  type AgentInviteData,
  type AgentRange,
  type HostApplication,
} from '../api/agent.api';
import {
  agencyApi,
  chatApi,
  callApi,
  uploadApi,
  type LeaveRequestData,
  type JoinRequestData,
  type AgencyItem,
} from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import {
  ScreenHeader,
  PillTabs,
  TabBar,
  SectionCard,
  StatCell,
  EmptyState,
} from '../components/common';
import { Sparkline } from '../components/common/Sparkline';
import { Avatar, RoleTags, UserNameplate } from '../components/user';
import { Loading } from '../components/ui';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { compactNumber } from '../lib/time';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';

type Tab = 'make_money' | 'manage' | 'wallet' | 'data';
type DataTab = 'overview' | 'host' | 'invite';

export const AgentDashboard = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('make_money');
  const [dataTab, setDataTab] = useState<DataTab>('overview');
  const [range, setRange] = useState<AgentRange>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);

  const [myAgency, setMyAgency] = useState<AgencyItem | null>(null);
  const [earnings, setEarnings] = useState<AgentEarnings | null>(null);
  const [hostData, setHostData] = useState<AgentHostData | null>(null);
  const [inviteData, setInviteData] = useState<AgentInviteData | null>(null);
  const [hosts, setHosts] = useState<AgentHostRow[]>([]);
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestData[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [agencyAvatar, setAgencyAvatar] = useState('');
  const [agencyCover, setAgencyCover] = useState('');
  const [agencyType, setAgencyType] = useState<'public' | 'private'>('public');
  const [agencyCommission, setAgencyCommission] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Member Leave Agency Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Wallet Actions (Send Coins, Send Diamonds, Convert)
  const [walletModal, setWalletModal] = useState<'send_coins' | 'send_diamonds' | 'convert' | null>(null);
  const [targetIdInput, setTargetIdInput] = useState('');
  const [transferAmountInput, setTransferAmountInput] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [convertFrom, setConvertFrom] = useState<'coin' | 'diamond'>('coin');
  const [submittingTx, setSubmittingTx] = useState(false);

  // Call state
  const [call, setCall] = useState<{
    outgoing?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      token: string;
      callee?: { nickname: string; avatar?: string } | null;
    };
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  // Check if current user is agency owner / agent
  const isOwner = useMemo(() => {
    if (!user) return false;
    if (user.role === 'agent' || (user as any).isAgent) return true;
    if (myAgency?.agent) {
      if (typeof myAgency.agent === 'object' && myAgency.agent !== null) {
        if (myAgency.agent._id === user._id || myAgency.agent.uid === user.uid) return true;
      } else if (typeof myAgency.agent === 'string' && myAgency.agent === user._id) {
        return true;
      }
    }
    return false;
  }, [user, myAgency]);

  const loadAgencyData = async () => {
    try {
      const [agencyRes, joinReqsRes, leaveReqsRes] = await Promise.all([
        agencyApi.getMyAgency().catch(() => null),
        agencyApi.getJoinRequests('pending').catch(() => null),
        agencyApi.getLeaveRequests('pending').catch(() => null),
      ]);

      if (agencyRes?.data?.success && agencyRes.data.data) {
        const ag = agencyRes.data.data;
        setMyAgency(ag);
        setAgencyName(ag.name || '');
        setAgencyDescription(ag.description || '');
        setAgencyAvatar(ag.avatar || '');
        setAgencyCover(ag.cover || '');
        setAgencyType(ag.type || 'public');
        setAgencyCommission(ag.commission ?? 10);
      } else {
        setMyAgency(null);
      }
      if (joinReqsRes?.data?.success) {
        setJoinRequests(joinReqsRes.data.data || []);
      }
      if (leaveReqsRes?.data?.success) {
        setLeaveRequests(leaveReqsRes.data.data || []);
      }
    } catch {
      // ignore
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAgencyData(),
        optional(agentApi.getEarnings(range)).then((e) => setEarnings(e?.data ?? null)).catch(() => {}),
        optional(agentApi.getHostData(range)).then((h) => setHostData(h?.data ?? null)).catch(() => {}),
        optional(agentApi.getInviteAgentData(range)).then((i) => setInviteData(i?.data ?? null)).catch(() => {}),
        optional(agentApi.getHosts({ range })).then((hostList) => setHosts(hostList?.data ?? [])).catch(() => {}),
        optional(agentApi.getApplications()).then((apps) => setApplications(apps?.data ?? [])).catch(() => {}),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [range]);

  // Real-time socket events for new requests and balance sync
  useEffect(() => {
    if (!socket) return;

    const onJoinRequest = (payload: any) => {
      showToast(`New join request from ${payload.user?.nickname || 'a streamer'}!`, 'info');
      loadAgencyData();
    };

    const onLeaveRequest = (payload: any) => {
      showToast(`Quit request from ${payload.user?.nickname || 'a member'}!`, 'info');
      loadAgencyData();
    };

    const onBalanceUpdate = (data: { coins?: number; diamonds?: number }) => {
      updateUser({ coins: data.coins, diamonds: data.diamonds });
    };

    socket.on('agency:join-request', onJoinRequest);
    socket.on('agency:leave-request', onLeaveRequest);
    socket.on('balance:update', onBalanceUpdate);

    return () => {
      socket.off('agency:join-request', onJoinRequest);
      socket.off('agency:leave-request', onLeaveRequest);
      socket.off('balance:update', onBalanceUpdate);
    };
  }, [socket, updateUser]);

  const copyAgencyCode = async () => {
    if (!myAgency?.code) return;
    try {
      await navigator.clipboard.writeText(myAgency.code);
      showToast(`Agency code ${myAgency.code} copied!`, 'success');
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  // Chat with Agent
  const handleOpenChat = async (targetUserId?: string) => {
    const agentId = targetUserId || (typeof myAgency?.agent === 'object' ? myAgency?.agent?._id : myAgency?.agent);
    if (!agentId) {
      showToast('Agent contact unavailable', 'error');
      return;
    }
    try {
      const { data } = await chatApi.getOrCreateChat(agentId);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${agentId}`);
      }
    } catch {
      navigate(`/user/${agentId}`);
    }
  };

  // Call Agent (Audio or Video)
  const handleStartCall = async (callType: 'audio' | 'video') => {
    const agentObj = typeof myAgency?.agent === 'object' ? myAgency?.agent : null;
    const agentId = agentObj?._id || (typeof myAgency?.agent === 'string' ? myAgency?.agent : undefined);
    if (!agentId) {
      showToast('Agent contact unavailable', 'error');
      return;
    }

    const perm = await requestMediaPermissions(callType);
    if (!perm.granted) {
      showToast(perm.error || 'Permission denied', 'error');
      return;
    }

    try {
      const { data } = await callApi.create([agentId], callType);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: agentObj?.nickname || 'Agent', avatar: agentObj?.avatar },
          },
        });
      } else {
        showToast(data.error || 'Could not initiate call', 'error');
      }
    } catch {
      showToast('Could not start call with agent', 'error');
    }
  };

  // Transfer coins directly to Agent
  const handleOpenSendToAgent = () => {
    const agentObj = typeof myAgency?.agent === 'object' ? myAgency?.agent : null;
    setTargetIdInput(agentObj?.uid || agentObj?._id || '');
    setTransferAmountInput('');
    setTransferNote('Member coin transfer');
    setWalletModal('send_coins');
  };

  // Submit Quit / Leave Agency Request
  const handleRequestLeaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      const res = await agencyApi.requestLeave(leaveReason.trim() || undefined);
      if (res.data?.success) {
        showToast('Quit request submitted to your agency agent', 'success');
        setShowLeaveModal(false);
        setLeaveReason('');
        loadAgencyData();
      } else {
        showToast(res.data?.error || 'Failed to submit quit request', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit quit request', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Join Request Decide (Approve / Reject)
  const handleDecideJoinRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      const res = await agencyApi.decideJoinRequest(requestId, decision);
      if (res.data?.success) {
        setJoinRequests((prev) => prev.filter((r) => r._id !== requestId));
        showToast(decision === 'approve' ? 'Member approved and added to agency!' : 'Join request rejected', 'success');
        loadAgencyData();
        optional(agentApi.getHosts({ range })).then((hostList) => {
          if (hostList?.data) setHosts(hostList.data);
        });
      } else {
        showToast(res.data?.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Leave Request Decide (Approve / Reject)
  const handleDecideLeaveRequest = async (requestId: string, decision: 'approve' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      const res = await agencyApi.decideLeaveRequest(requestId, decision);
      if (res.data?.success) {
        setLeaveRequests((prev) => prev.filter((r) => r._id !== requestId));
        showToast(decision === 'approve' ? 'Leave request approved; host removed.' : 'Leave request rejected', 'success');
        loadAgencyData();
        optional(agentApi.getHosts({ range })).then((hostList) => {
          if (hostList?.data) setHosts(hostList.data);
        });
      } else {
        showToast(res.data?.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Remove member manually
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from your agency?`)) return;
    try {
      const res = await agencyApi.removeMember(memberId, 'Removed by agency owner');
      if (res.data?.success) {
        showToast(`${memberName} removed from agency`, 'success');
        loadAgencyData();
        optional(agentApi.getHosts({ range })).then((hostList) => {
          if (hostList?.data) setHosts(hostList.data);
        });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to remove member', 'error');
    }
  };

  // Save Agency Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await agencyApi.updateSettings({
        name: agencyName.trim() || undefined,
        description: agencyDescription.trim(),
        avatar: agencyAvatar.trim() || undefined,
        cover: agencyCover.trim() || undefined,
        type: agencyType,
        commission: Number(agencyCommission),
      });
      if (res.data?.success) {
        showToast('Agency settings updated successfully', 'success');
        setShowSettingsModal(false);
        loadAgencyData();
      } else {
        showToast(res.data?.error || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to update settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Send Coins
  const handleSendCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmountInput.replace(/\D/g, ''), 10);
    if (!targetIdInput.trim()) {
      showToast('Enter recipient UID or Phone', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Enter a valid coin amount', 'error');
      return;
    }
    if ((user?.coins || 0) < amount) {
      showToast('Insufficient coin balance', 'error');
      return;
    }

    setSubmittingTx(true);
    try {
      const res = await agencyApi.agentSendCoins(targetIdInput.trim(), amount, transferNote.trim() || undefined);
      if (res.data?.success) {
        showToast(`Sent ${amount.toLocaleString()} coins to ${res.data.data?.recipient?.nickname || targetIdInput}!`, 'success');
        updateUser({ coins: res.data.data?.balance });
        setWalletModal(null);
        setTargetIdInput('');
        setTransferAmountInput('');
        setTransferNote('');
      } else {
        showToast(res.data?.error || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Handle Send Diamonds
  const handleSendDiamonds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmountInput.replace(/\D/g, ''), 10);
    if (!targetIdInput.trim()) {
      showToast('Enter recipient UID or Phone', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showToast('Enter a valid diamond amount', 'error');
      return;
    }
    if ((user?.diamonds || 0) < amount) {
      showToast('Insufficient diamond balance', 'error');
      return;
    }

    setSubmittingTx(true);
    try {
      const res = await agencyApi.agentSendDiamonds(targetIdInput.trim(), amount, transferNote.trim() || undefined);
      if (res.data?.success) {
        showToast(`Sent ${amount.toLocaleString()} diamonds to ${res.data.data?.recipient?.nickname || targetIdInput}!`, 'success');
        updateUser({ diamonds: res.data.data?.balance });
        setWalletModal(null);
        setTargetIdInput('');
        setTransferAmountInput('');
        setTransferNote('');
      } else {
        showToast(res.data?.error || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Transfer failed', 'error');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Handle Convert Currency
  const handleConvertCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferAmountInput.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      showToast('Enter an amount to convert', 'error');
      return;
    }

    setSubmittingTx(true);
    try {
      const res = await agencyApi.agentConvertCurrency(convertFrom, amount);
      if (res.data?.success) {
        showToast(`Converted ${amount.toLocaleString()} ${convertFrom}s successfully!`, 'success');
        updateUser({ coins: res.data.data?.coins, diamonds: res.data.data?.diamonds });
        setWalletModal(null);
        setTransferAmountInput('');
      } else {
        showToast(res.data?.error || 'Conversion failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Conversion failed', 'error');
    } finally {
      setSubmittingTx(false);
    }
  };

  const filteredHosts = useMemo(() => {
    if (!search.trim()) return hosts;
    const q = search.trim().toLowerCase();
    return hosts.filter(
      (h) =>
        h.user.nickname.toLowerCase().includes(q) ||
        h.user.uid.toLowerCase().includes(q)
    );
  }, [hosts, search]);

  const rangeLabel = AGENT_RANGES.find((r) => r.key === range)?.label ?? 'Range';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* ── Top Header Banner with Cover ── */}
      <div className="relative text-white pt-2 pb-5 px-4 shadow-md overflow-hidden bg-slate-950">
        {myAgency?.cover ? (
          <img
            src={myAgency.cover}
            alt="Agency Cover"
            className="absolute inset-0 w-full h-full object-cover opacity-35 scale-105 filter blur-[0.5px]"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/85 via-purple-950/80 to-slate-950 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between h-12 max-w-md mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-white/80 hover:text-white active:scale-90 transition-transform"
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>

            <div className="flex items-center gap-1.5">
              {isOwner ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[11px] font-black flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Agency Owner / Agent
                </span>
              ) : myAgency ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/80 text-white text-[11px] font-black flex items-center gap-1 border border-indigo-400/50">
                  <ShieldCheck className="w-3.5 h-3.5" /> Agency Member
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                  Agency Center
                </span>
              )}
            </div>

            {isOwner ? (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 text-white/80 hover:text-white"
                title="Agency Settings"
              >
                <Gear className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/agency')}
                className="p-2 text-white/80 hover:text-white"
                title="Agencies"
              >
                <Buildings className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Agency Identity Bar (when user has an agency) */}
          {myAgency ? (
            <div className="max-w-md mx-auto mt-2 flex items-center gap-3.5 bg-black/30 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shadow-sm">
              <div className="relative shrink-0">
                <Avatar src={myAgency?.avatar || user?.avatar} nickname={myAgency?.name || user?.nickname || 'Agent'} size="lg" className="ring-2 ring-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-base truncate">{myAgency?.name || `${user?.nickname}'s Agency`}</h2>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold border ${myAgency?.type === 'private' ? 'bg-purple-500/30 text-purple-200 border-purple-400/50' : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/50'}`}>
                    {myAgency?.type === 'private' ? 'Private' : 'Public'}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={copyAgencyCode}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-[11px] font-mono font-bold text-amber-300 transition-colors"
                  >
                    <span>Code: {myAgency?.code || 'AGENCY'}</span>
                    <CopyIcon className="w-3 h-3" />
                  </button>
                  <span className="text-white/40">•</span>
                  <span className="text-[11px] text-indigo-200 font-bold">
                    Lv.{myAgency?.level || 1}
                  </span>
                </div>
              </div>

              <button
                onClick={() => myAgency?._id && navigate(`/agency/${myAgency._id}`)}
                className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 font-extrabold text-xs shadow-xs hover:bg-indigo-50"
              >
                Profile
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto mt-3 text-center py-2">
              <h2 className="text-xl font-black tracking-tight">Agency & Agent Center</h2>
              <p className="text-xs text-white/80 mt-1 max-w-xs mx-auto">
                Join an agency to unlock higher streaming rewards, or create your own agency and become an official agent.
              </p>
            </div>
          )}

          {/* Navigation Tabs (Only for Agency Owners / Agents) */}
          {isOwner && (
            <div className="max-w-md mx-auto mt-4">
              <PillTabs
                tabs={[
                  { key: 'make_money', label: 'Overview' },
                  { key: 'manage', label: `Manage (${joinRequests.length + leaveRequests.length})` },
                  { key: 'wallet', label: 'Agent Wallet' },
                  { key: 'data', label: 'Analytics' },
                ]}
                active={tab}
                onChange={(k) => setTab(k as Tab)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-3 pt-3 space-y-3">
        {loading ? (
          <div className="py-20 text-center">
            <Loading size="lg" />
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading Agency Data...</p>
          </div>
        ) : !isOwner && myAgency ? (
          /* ══════════════════════════════════════════════════════════════════════
             ── MEMBER VIEW (For Streamers / Members joined to an Agency) ──
             Shows agency information, agency statistics, and agent's profile info
             with communication channels (chat, audio call, video call, send coins).
             ══════════════════════════════════════════════════════════════════════ */
          <div className="space-y-3">
            {/* Agency Overview Summary */}
            <SectionCard>
              <div className="flex items-stretch">
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Agency Contribution</p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">
                    {(myAgency.totalContribution || 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-px bg-slate-200 mx-3" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">Total Live Hours</p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums">
                    {myAgency.totalLiveHours || 0}h
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Level</p>
                  <p className="text-sm font-extrabold text-indigo-600 mt-0.5">Lv.{myAgency.level || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Members</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{myAgency.memberCount || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Commission</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{myAgency.commission ?? 10}%</p>
                </div>
              </div>

              {myAgency.description && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-600 italic">"{myAgency.description}"</p>
                </div>
              )}
            </SectionCard>

            {/* ── My Agent (Agency Owner) Info Card ── */}
            {myAgency.agent && typeof myAgency.agent === 'object' && (
              <SectionCard title="My Agent (Agency Owner)">
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <Avatar
                    src={myAgency.agent.avatar}
                    nickname={myAgency.agent.nickname}
                    size="lg"
                    className="ring-2 ring-indigo-500/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {myAgency.agent.nickname}
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        Agent
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      ID: {myAgency.agent.uid} • Lv.{myAgency.agent.level || 1}
                    </p>
                    {myAgency.agent.bio && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                        {myAgency.agent.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* 4 Agent Communication & Support Actions */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  <button
                    onClick={() => handleOpenChat()}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 transition-colors"
                  >
                    <ChatIcon className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Chat</span>
                  </button>

                  <button
                    onClick={() => handleStartCall('audio')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 transition-colors"
                  >
                    <Phone className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Voice Call</span>
                  </button>

                  <button
                    onClick={() => handleStartCall('video')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 transition-colors"
                  >
                    <Video className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Video Call</span>
                  </button>

                  <button
                    onClick={handleOpenSendToAgent}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-800 transition-colors"
                  >
                    <Coins className="w-5 h-5 mb-1" />
                    <span className="text-[11px] font-bold">Send Coins</span>
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ── My Membership Status & Shortcuts ── */}
            <SectionCard title="My Streamer Membership">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Membership Status</p>
                    <p className="text-[11px] text-slate-500">Official Streamer & Agency Member</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/agency/${myAgency._id}`)}
                    className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Buildings className="w-4 h-4" />
                    <span>View Agency Profile</span>
                  </button>

                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <SignOut className="w-4 h-4" />
                    <span>Quit Agency</span>
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : !isOwner && !myAgency ? (
          /* ══════════════════════════════════════════════════════════════════════
             ── REGULAR USER VIEW (Not in any agency, not an agent) ──
             Shows agency discovery, benefits, and options to explore or create.
             ══════════════════════════════════════════════════════════════════════ */
          <div className="space-y-3">
            {/* Join / Create Agency Action Cards */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white shadow-lg space-y-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Agency Program
                </span>
                <h3 className="text-lg font-black mt-1">Join or Create an Agency</h3>
                <p className="text-xs text-white/80 mt-1 leading-relaxed">
                  Connect with experienced agents, increase your streaming reach, participate in agency events, and earn top commission tiers.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => navigate('/agency')}
                  className="py-3 px-3 rounded-2xl bg-white text-indigo-900 font-extrabold text-xs shadow-md hover:bg-indigo-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Buildings className="w-4 h-4 text-indigo-600" />
                  <span>Browse Agencies</span>
                </button>

                <button
                  onClick={() => navigate('/agency/create')}
                  className="py-3 px-3 rounded-2xl bg-amber-400 text-slate-900 font-extrabold text-xs shadow-md hover:bg-amber-300 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-4 h-4 text-slate-900" />
                  <span>Create Agency</span>
                </button>
              </div>
            </div>

            {/* Benefits Overview */}
            <SectionCard title="Why Join an Agency?">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Higher Earnings & Bonuses</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Earn up to 50% commission bonuses and receive direct coin support from your agent.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Direct Agent Mentorship</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Get 1-on-1 audio/video call guidance and live streaming tips directly from your agent.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Featured Stream Promotion</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Boost your live streams to the top of category feeds through your agency's network.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════════
             ── AGENCY OWNER / AGENT VIEW ──
             Full administrative and management controls.
             ══════════════════════════════════════════════════════════════════════ */
          <>
            {/* ── 1. Overview Tab ────────────────────────────────────────── */}
            {tab === 'make_money' && (
              <div className="space-y-3">
                {/* Pending Requests Alert */}
                {(joinRequests.length > 0 || leaveRequests.length > 0) && (
                  <div
                    onClick={() => setTab('manage')}
                    className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span>
                        {joinRequests.length > 0 && `${joinRequests.length} Join Request(s)`}
                        {joinRequests.length > 0 && leaveRequests.length > 0 && ' & '}
                        {leaveRequests.length > 0 && `${leaveRequests.length} Quit Request(s)`}
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold text-indigo-600 flex items-center gap-0.5">
                      Review <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}

                {/* Earnings & Members Stat Card */}
                <SectionCard>
                  <div className="flex items-stretch">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Total Contribution</p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">
                        {(myAgency?.totalContribution || earnings?.earnedToday || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-px bg-slate-200 mx-3" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Live Hours</p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">
                        {myAgency?.totalLiveHours || 0}h
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Agency Level</p>
                      <p className="text-sm font-extrabold text-indigo-600 mt-0.5">Lv.{myAgency?.level || 1}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Total Members</p>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">{myAgency?.memberCount || hosts.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Commission</p>
                      <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{myAgency?.commission ?? 10}%</p>
                    </div>
                  </div>
                </SectionCard>

                {/* Six Quick Tool Shortcuts */}
                <SectionCard title="Agent Tools">
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      onClick={() => navigate('/agent/invite-hosts')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 transition-all text-center"
                    >
                      <UserPlus className="w-6 h-6 text-indigo-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Add Host</span>
                    </button>

                    <button
                      onClick={() => setWalletModal('send_coins')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/70 border border-amber-100 transition-all text-center"
                    >
                      <Coins className="w-6 h-6 text-amber-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Send Coins</span>
                    </button>

                    <button
                      onClick={() => setWalletModal('send_diamonds')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100/70 border border-cyan-100 transition-all text-center"
                    >
                      <DiamondIcon className="w-6 h-6 text-cyan-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Send Diamonds</span>
                    </button>

                    <button
                      onClick={() => setWalletModal('convert')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/70 border border-purple-100 transition-all text-center"
                    >
                      <ExchangeIcon className="w-6 h-6 text-purple-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Convert</span>
                    </button>

                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex flex-col items-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all text-center"
                    >
                      <Gear className="w-6 h-6 text-slate-700 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Settings</span>
                    </button>

                    <button
                      onClick={() => navigate('/agency')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 transition-all text-center"
                    >
                      <Buildings className="w-6 h-6 text-emerald-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Agencies</span>
                    </button>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── 2. Manage Tab ──────────────────────────────────────────── */}
            {tab === 'manage' && (
              <div className="space-y-3">
                {/* Incoming Private Join Requests */}
                <SectionCard
                  title={`Join Requests (${joinRequests.length})`}
                  subtitle="Users requesting to join your agency"
                  flush
                >
                  {joinRequests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No pending join requests.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {joinRequests.map((req) => {
                        const applicant = typeof req.userId === 'object' && req.userId !== null ? req.userId : ({ _id: req.userId, nickname: 'Applicant', uid: '' } as any);

                        return (
                          <div key={req._id} className="p-3.5 bg-purple-50/40">
                            <div className="flex items-center gap-3">
                              <Avatar src={applicant.avatar} nickname={applicant.nickname} size="md" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-slate-900 truncate">
                                    {applicant.nickname}
                                  </span>
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                                    ID: {applicant.uid}
                                  </span>
                                </div>
                                <p className="text-[11px] text-purple-900 mt-0.5 leading-snug">
                                  "{req.message || 'Requesting to join agency'}"
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-purple-100">
                              <button
                                disabled={processingRequestId === req._id}
                                onClick={() => handleDecideJoinRequest(req._id, 'reject')}
                                className="h-8 px-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
                              >
                                Reject
                              </button>
                              <button
                                disabled={processingRequestId === req._id}
                                onClick={() => handleDecideJoinRequest(req._id, 'approve')}
                                className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* Incoming Leave Requests */}
                <SectionCard
                  title={`Quit Requests (${leaveRequests.length})`}
                  subtitle="Members requesting to leave agency"
                  flush
                >
                  {leaveRequests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No pending quit requests.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {leaveRequests.map((req) => {
                        const hostUser = typeof req.userId === 'object' && req.userId !== null ? req.userId : ({ _id: req.userId, nickname: 'Host Member', uid: '' } as any);

                        return (
                          <div key={req._id} className="p-3.5 bg-amber-50/40">
                            <div className="flex items-center gap-3">
                              <Avatar src={hostUser.avatar} nickname={hostUser.nickname} size="md" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-slate-900 truncate">
                                    {hostUser.nickname}
                                  </span>
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                                    ID: {hostUser.uid}
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-900 mt-0.5">
                                  Reason: {req.reason || 'Requested to leave'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-amber-100">
                              <button
                                disabled={processingRequestId === req._id}
                                onClick={() => handleDecideLeaveRequest(req._id, 'reject')}
                                className="h-8 px-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
                              >
                                Reject
                              </button>
                              <button
                                disabled={processingRequestId === req._id}
                                onClick={() => handleDecideLeaveRequest(req._id, 'approve')}
                                className="h-8 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all"
                              >
                                Approve Leave
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* Agency Members Management List */}
                <SectionCard
                  title={`Agency Members (${hosts.length})`}
                  subtitle="Manage and communicate with your streamers"
                  flush
                >
                  <div className="p-3">
                    <div className="relative mb-3">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search member by nickname or ID..."
                        className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-100 text-xs font-medium text-slate-900 border border-slate-200 focus:bg-white focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {filteredHosts.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No members found.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredHosts.map((h) => (
                          <div
                            key={h._id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar src={h.user.avatar} nickname={h.user.nickname} size="md" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 truncate">{h.user.nickname}</p>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {h.user.uid} • Lv.{h.user.level || 1}</p>
                                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                  Earned: {(h.earnings || 0).toLocaleString()} coins
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={async () => {
                                  const { data } = await chatApi.getOrCreateChat(h.user._id);
                                  if (data.success && data.data?._id) navigate(`/chat/${data.data._id}`);
                                }}
                                className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600"
                                title="Chat"
                              >
                                <ChatIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveMember(h.user._id, h.user.nickname)}
                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                                title="Remove Member"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── 3. Agent Wallet Tab ────────────────────────────────────── */}
            {tab === 'wallet' && (
              <div className="space-y-3">
                {/* Wallet Balance Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-[#FFF5DC] to-[#FFE8A3] rounded-2xl p-4 border border-amber-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-900/80 uppercase">Coins</p>
                      <CoinIcon className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                      {(user?.coins || 0).toLocaleString()}
                    </p>
                    <button
                      onClick={() => setWalletModal('send_coins')}
                      className="mt-3 w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shadow-xs"
                    >
                      Send Coins
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-[#E8F4FF] to-[#D0EAFF] rounded-2xl p-4 border border-cyan-200 shadow-xs">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-cyan-900/80 uppercase">Diamonds</p>
                      <DiamondIcon className="w-6 h-6 text-cyan-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                      {(user?.diamonds || 0).toLocaleString()}
                    </p>
                    <button
                      onClick={() => setWalletModal('send_diamonds')}
                      className="mt-3 w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs"
                    >
                      Send Diamonds
                    </button>
                  </div>
                </div>

                {/* Conversion Shortcut Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Currency Conversion</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Convert Coins to Diamonds or Diamonds to Coins</p>
                  </div>
                  <button
                    onClick={() => setWalletModal('convert')}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                  >
                    Convert
                  </button>
                </div>

                {/* Quick Transfers Info */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2">
                    Agent Permissions & Rules
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                    <li>As an Agency Owner/Agent, you can send coins & diamonds to any user or other agents.</li>
                    <li>Agency members transfer their earned coins directly to you for cash-out/trading.</li>
                    <li>All transactions are recorded with immutable transaction IDs.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── 4. Analytics Tab ───────────────────────────────────────── */}
            {tab === 'data' && (
              <div className="space-y-3">
                <SectionCard title="Performance Analytics">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500">Live Hours & Earnings History</p>
                    <div className="relative">
                      <button
                        onClick={() => setRangeOpen((v) => !v)}
                        className="h-8 px-3 rounded-full bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1"
                      >
                        {rangeLabel} <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {rangeOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                          <div className="absolute right-0 top-9 z-20 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                            {AGENT_RANGES.map((r) => (
                              <button
                                key={r.key}
                                onClick={() => {
                                  setRange(r.key);
                                  setRangeOpen(false);
                                }}
                                className={`w-full py-2 px-3 text-left text-xs ${r.key === range ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <StatCell label="New Hosts" value={hostData?.new ?? 0} />
                    <StatCell label="Valid Hosts" value={hostData?.validHosts ?? 0} />
                  </div>

                  {earnings?.series && (
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-2">Earnings Trend</p>
                      <Sparkline points={earnings.series} />
                    </div>
                  )}
                </SectionCard>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Member Leave Agency Modal ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Quit Agency</h3>
            <p className="text-xs text-slate-500 mb-3">
              Submit a quit request to your agency agent.
            </p>

            <form onSubmit={handleRequestLeaveAgency} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason (Optional)</label>
                <textarea
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="State why you wish to leave this agency..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 resize-none font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  disabled={submittingLeave}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
                >
                  {submittingLeave ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Agency Settings Modal ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 mb-3">Agency Settings</h3>
            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              {/* Agency Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Agency Name</label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                />
              </div>

              {/* Agency Logo */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Agency Logo</label>
                  <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingLogo}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingLogo(true);
                        try {
                          const url = await uploadApi.upload(file, 'agency');
                          setAgencyAvatar(url);
                          showToast('Logo uploaded', 'success');
                        } catch {
                          showToast('Failed to upload logo', 'error');
                        } finally {
                          setUploadingLogo(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {agencyAvatar ? (
                      <img src={agencyAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">Logo</div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={agencyAvatar}
                    onChange={(e) => setAgencyAvatar(e.target.value)}
                    placeholder="https://... logo URL"
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Agency Cover Banner */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Cover Banner</label>
                  <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    {uploadingCover ? 'Uploading...' : 'Upload Banner'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingCover}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingCover(true);
                        try {
                          const url = await uploadApi.upload(file, 'agency');
                          setAgencyCover(url);
                          showToast('Cover uploaded', 'success');
                        } catch {
                          showToast('Failed to upload cover', 'error');
                        } finally {
                          setUploadingCover(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1.5">
                  {agencyCover && (
                    <div className="h-16 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={agencyCover} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="text"
                    value={agencyCover}
                    onChange={(e) => setAgencyCover(e.target.value)}
                    placeholder="https://... cover URL"
                    className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Agency Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAgencyType('public')}
                    className={`py-2 text-xs font-bold rounded-xl border ${agencyType === 'public' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgencyType('private')}
                    className={`py-2 text-xs font-bold rounded-xl border ${agencyType === 'private' ? 'border-purple-500 bg-purple-50 text-purple-800' : 'border-slate-200 text-slate-600'}`}
                  >
                    Private
                  </button>
                </div>
              </div>

              {/* Commission */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commission ({agencyCommission}%)</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={agencyCommission}
                  onChange={(e) => setAgencyCommission(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={agencyDescription}
                  onChange={(e) => setAgencyDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 resize-none font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings || uploadingLogo || uploadingCover}
                  className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Send Coins Modal ── */}
      {walletModal === 'send_coins' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Send Coins</h3>
            <p className="text-xs text-slate-500 mb-3">Available: {(user?.coins || 0).toLocaleString()} Coins</p>

            <form onSubmit={handleSendCoins} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient UID or Phone</label>
                <input
                  type="text"
                  required
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                  placeholder="Enter User/Agent UID or Phone"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Coins)</label>
                <input
                  type="text"
                  required
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 10000"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Transfer note / message"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModal(null)}
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs shadow-xs"
                >
                  {submittingTx ? 'Sending...' : 'Confirm Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Send Diamonds Modal ── */}
      {walletModal === 'send_diamonds' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Send Diamonds</h3>
            <p className="text-xs text-slate-500 mb-3">Available: {(user?.diamonds || 0).toLocaleString()} Diamonds</p>

            <form onSubmit={handleSendDiamonds} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient UID or Phone</label>
                <input
                  type="text"
                  required
                  value={targetIdInput}
                  onChange={(e) => setTargetIdInput(e.target.value)}
                  placeholder="Enter User/Agent UID or Phone"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (Diamonds)</label>
                <input
                  type="text"
                  required
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 500"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Transfer note / message"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModal(null)}
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs"
                >
                  {submittingTx ? 'Sending...' : 'Confirm Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Currency Convert Modal ── */}
      {walletModal === 'convert' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-slate-900 mb-3">Convert Currency</h3>

            <form onSubmit={handleConvertCurrency} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConvertFrom('coin')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center ${convertFrom === 'coin' ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'}`}
                >
                  Coins → Diamonds
                </button>
                <button
                  type="button"
                  onClick={() => setConvertFrom('diamond')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center ${convertFrom === 'diamond' ? 'border-cyan-500 bg-cyan-50 text-cyan-900' : 'border-slate-200 text-slate-600'}`}
                >
                  Diamonds → Coins
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount to Convert ({convertFrom === 'coin' ? 'Coins' : 'Diamonds'})
                </label>
                <input
                  type="text"
                  required
                  value={transferAmountInput}
                  onChange={(e) => setTransferAmountInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter amount"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold tabular-nums"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModal(null)}
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
                >
                  {submittingTx ? 'Converting...' : 'Convert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Call Screen Modal */}
      {call && (
        <CallScreen
          outgoing={call.outgoing}
          accepted={callAccepted}
          onClose={() => {
            setCall(null);
            setCallAccepted(false);
          }}
        />
      )}
    </div>
  );
};
