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
  PiEyeFill as EyeIcon,
  PiSlidersHorizontalBold as FilterIcon,
  PiStarFill as StarIcon,
  PiArrowSquareOutBold as ExternalLinkIcon,
  PiCheckBold as CheckBold,
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
import { AgencyWelcomeBanner, BANNER_THEMES } from '../components/agency';
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
import { getMediaUrl } from '../lib/media';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';

type Tab = 'make_money' | 'users' | 'manage' | 'wallet' | 'data';
type DataTab = 'overview' | 'host' | 'invite';

export const AGENCY_TIER_LIST = [
  { tier: 'starter', label: 'Starter', percent: 4, adminPercent: 26, badge: '🌟 Starter (4%)', desc: 'Agency opening with 2+ hosts' },
  { tier: 'bronze', label: 'Bronze', percent: 8, adminPercent: 22, badge: '🥉 Bronze (8%)', desc: '5 active hosts + 7-day milestone' },
  { tier: 'silver', label: 'Silver', percent: 12, adminPercent: 18, badge: '🥈 Silver (12%)', desc: '20 active hosts + 30-day milestone + retention' },
  { tier: 'gold', label: 'Gold', percent: 16, adminPercent: 14, badge: '🥇 Gold (16%)', desc: '50 active hosts + 30+90 day milestone + quality' },
  { tier: 'platinum', label: 'Platinum', percent: 18, adminPercent: 12, badge: '💠 Platinum (18%)', desc: '100 active hosts + eligible revenue + leaderboard' },
  { tier: 'diamond', label: 'Diamond', percent: 20, adminPercent: 10, badge: '💎 Diamond (20%)', desc: '100+ active hosts + top leaderboard + elite rank' },
];

const LEVEL_COMMISSIONS: Record<number, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 12,
  6: 14,
  7: 16,
  8: 18,
  9: 19,
  10: 20,
};

export function getAgencyCommissionByLevel(level: number = 1): number {
  const lvl = Math.max(1, Math.floor(level || 1));
  if (lvl >= 10) return 20;
  return LEVEL_COMMISSIONS[lvl] ?? 4;
}

export const AGENCY_LEVEL_COMMISSION_LIST = [
  { level: 1, percent: 4, label: 'Level 1', desc: '0 - 10K score' },
  { level: 2, percent: 6, label: 'Level 2', desc: '10K - 50K score' },
  { level: 3, percent: 8, label: 'Level 3', desc: '50K - 150K score' },
  { level: 4, percent: 10, label: 'Level 4', desc: '150K - 500K score' },
  { level: 5, percent: 12, label: 'Level 5', desc: '500K - 1.5M score' },
  { level: 6, percent: 14, label: 'Level 6', desc: '1.5M - 5M score' },
  { level: 7, percent: 16, label: 'Level 7', desc: '5M - 15M score' },
  { level: 8, percent: 18, label: 'Level 8', desc: '15M - 50M score' },
  { level: 9, percent: 19, label: 'Level 9', desc: '50M - 150M score' },
  { level: 10, percent: 20, label: 'Level 10+', desc: '150M+ score (Max Elite)' },
];

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
  const [userSort, setUserSort] = useState<'all' | 'coins' | 'diamonds' | 'level' | 'hours'>('all');
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'banner'>('general');
  const [agencyName, setAgencyName] = useState('');
  const [agencyDescription, setAgencyDescription] = useState('');
  const [agencyAvatar, setAgencyAvatar] = useState('');
  const [agencyCover, setAgencyCover] = useState('');
  const [agencyType, setAgencyType] = useState<'public' | 'private'>('public');
  const [agencyTier, setAgencyTier] = useState<string>('starter');
  const [agencyCommission, setAgencyCommission] = useState(4);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Welcome Banner Customizer State
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeTitle, setWelcomeTitle] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeTheme, setWelcomeTheme] = useState('purple');
  const [welcomeBadge, setWelcomeBadge] = useState('OFFICIAL HOST');
  const [welcomeImage, setWelcomeImage] = useState('');
  const [welcomeFloat, setWelcomeFloat] = useState(true);
  const [uploadingWelcomeBg, setUploadingWelcomeBg] = useState(false);

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
        setAgencyTier(ag.tier || 'starter');
        setAgencyCommission(ag.commission ?? getAgencyCommissionByLevel(ag.level || 1));

        // Initialize welcome banner customizer
        const wb = ag.welcomeBanner || {};
        setWelcomeEnabled(wb.enabled !== false);
        setWelcomeTitle(wb.title || '');
        setWelcomeMessage(wb.message || '');
        setWelcomeTheme(wb.theme || 'purple');
        setWelcomeBadge(wb.badgeText || 'OFFICIAL HOST');
        setWelcomeImage(wb.imageUrl || '');
        setWelcomeFloat(wb.floatAnimation !== false);
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

  // Copy Agency Code
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      showToast(`Agency code ${code} copied!`, 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  // Call agency member directly (Voice / Video)
  const handleStartCallWithMember = async (
    memberId: string,
    memberNickname: string,
    memberAvatar: string | undefined,
    type: 'audio' | 'video' = 'audio'
  ) => {
    if (!memberId) return;
    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Permission denied', 'error');
      return;
    }

    try {
      const { data } = await callApi.create([memberId], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: memberNickname, avatar: memberAvatar },
          },
        });
      } else {
        showToast(data.error || 'Could not initiate call', 'error');
      }
    } catch {
      showToast('Could not start call with member', 'error');
    }
  };

  // Quick Send Coins or Diamonds to member
  const handleQuickSend = (uid: string, type: 'send_coins' | 'send_diamonds' = 'send_coins') => {
    setTargetIdInput(uid);
    setTransferAmountInput('');
    setTransferNote('');
    setWalletModal(type);
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
        tier: agencyTier,
        commission: Number(agencyCommission),
        welcomeBanner: {
          enabled: welcomeEnabled,
          title: welcomeTitle.trim() || undefined,
          message: welcomeMessage.trim() || undefined,
          theme: welcomeTheme,
          badgeText: welcomeBadge.trim() || undefined,
          imageUrl: welcomeImage.trim() || undefined,
          floatAnimation: welcomeFloat,
        },
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
    const currentBalance = convertFrom === 'coin' ? (user?.coins || 0) : (user?.diamonds || 0);
    if (amount > currentBalance) {
      showToast(`Insufficient ${convertFrom} balance. Available: ${currentBalance.toLocaleString()}`, 'error');
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

  const getHostUser = (h: any) => {
    if (!h) return { _id: '', uid: '', nickname: 'Member', avatar: '', level: 1, earnings: 0, coins: 0, diamonds: 0 };
    const u = (typeof h === 'object' && h !== null && 'user' in h && h.user && typeof h.user === 'object')
      ? h.user
      : h;
    return {
      _id: u?._id || h?._id || '',
      uid: u?.uid || h?.uid || '',
      nickname: u?.nickname || h?.nickname || 'Streamer',
      avatar: u?.avatar || h?.avatar || '',
      level: u?.level || h?.level || 1,
      earnings: Number(h?.earnings ?? h?.contribution ?? u?.coins ?? h?.coins ?? 0),
      coins: Number(u?.coins ?? h?.coins ?? 0),
      diamonds: Number(u?.diamonds ?? h?.diamonds ?? 0),
    };
  };

  const userStats = useMemo(() => {
    if (!Array.isArray(hosts)) return { totalCoins: 0, totalDiamonds: 0, totalHours: 0, totalEarnings: 0, count: 0 };
    return hosts.reduce(
      (acc, h: any) => {
        const u = getHostUser(h);
        acc.totalCoins += u.coins;
        acc.totalDiamonds += u.diamonds;
        acc.totalEarnings += u.earnings;
        acc.totalHours += Number(h?.liveHours || h?.durationHours || 0);
        acc.count += 1;
        return acc;
      },
      { totalCoins: 0, totalDiamonds: 0, totalHours: 0, totalEarnings: 0, count: 0 }
    );
  }, [hosts]);

  const sortedAndFilteredHosts = useMemo(() => {
    if (!Array.isArray(hosts)) return [];
    let list = hosts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((h: any) => {
        const u = getHostUser(h);
        return (
          u.nickname.toLowerCase().includes(q) ||
          u.uid.toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a: any, b: any) => {
      const uA = getHostUser(a);
      const uB = getHostUser(b);
      if (userSort === 'coins') return uB.coins - uA.coins;
      if (userSort === 'diamonds') return uB.diamonds - uA.diamonds;
      if (userSort === 'level') return uB.level - uA.level;
      if (userSort === 'hours') {
        const hA = Number((a as any)?.liveHours || (a as any)?.durationHours || 0);
        const hB = Number((b as any)?.liveHours || (b as any)?.durationHours || 0);
        return hB - hA;
      }
      return 0;
    });
  }, [hosts, search, userSort]);

  const topStreamers = useMemo(() => {
    if (!Array.isArray(hosts) || hosts.length === 0) return [];
    return [...hosts]
      .sort((a: any, b: any) => {
        const uA = getHostUser(a);
        const uB = getHostUser(b);
        const scoreA = (uA.earnings || uA.coins) + uA.diamonds;
        const scoreB = (uB.earnings || uB.coins) + uB.diamonds;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [hosts]);

  const filteredHosts = sortedAndFilteredHosts;

  const rangeLabel = AGENT_RANGES.find((r) => r.key === range)?.label ?? 'Range';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* ── Top Header Banner with Cover ── */}
      <div className="relative text-white pt-2 pb-5 px-4 shadow-md overflow-hidden bg-slate-950">
        {myAgency?.cover ? (
          <img
            src={getMediaUrl(myAgency.cover)}
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
                <Avatar src={getMediaUrl(myAgency?.avatar) || getMediaUrl(user?.avatar)} nickname={myAgency?.name || user?.nickname || 'Agent'} size="lg" className="ring-2 ring-white/40" />
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
            <div className="max-w-md mx-auto mt-4 overflow-x-auto no-scrollbar">
              <PillTabs
                tabs={[
                  { key: 'make_money', label: 'Overview' },
                  { key: 'users', label: `My Users (${hosts.length})` },
                  { key: 'manage', label: `Requests (${joinRequests.length + leaveRequests.length})` },
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

              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Level</p>
                  <p className="text-sm font-extrabold text-indigo-600 mt-0.5">Lv.{myAgency.level || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Tier</p>
                  <p className="text-xs font-black text-purple-700 mt-1 uppercase bg-purple-50 px-1.5 py-0.5 rounded-md inline-block">
                    {myAgency.tier || 'STARTER'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Members</p>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{myAgency.memberCount || 1}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Commission</p>
                  <p className="text-sm font-extrabold text-emerald-600 mt-0.5">{getAgencyCommissionByLevel(myAgency.level || 1)}%</p>
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
            {/* ── 1. Full Agency Overview Tab ────────────────────────────── */}
            {tab === 'make_money' && (
              <div className="space-y-3.5">
                {/* Pending Requests Alert Banner */}
                {(joinRequests.length > 0 || leaveRequests.length > 0) && (
                  <div
                    onClick={() => setTab('manage')}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 flex items-center justify-between cursor-pointer hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 text-xs font-bold text-amber-900">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                      </span>
                      <span>
                        Action Needed: {joinRequests.length > 0 && `${joinRequests.length} Join Request(s)`}
                        {joinRequests.length > 0 && leaveRequests.length > 0 && ' • '}
                        {leaveRequests.length > 0 && `${leaveRequests.length} Quit Request(s)`}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-indigo-700 bg-white/80 px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-0.5 border border-indigo-100">
                      Review <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                )}

                {/* Agency Brand & Level Hero Card */}
                <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 rounded-3xl p-4 text-white shadow-md relative overflow-hidden border border-white/10">
                  <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={getMediaUrl(myAgency?.avatar) || getMediaUrl(user?.avatar)}
                        nickname={myAgency?.name || 'Agency'}
                        size="lg"
                        className="ring-2 ring-indigo-400/50 shadow-md shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-black text-white truncate">
                            {myAgency?.name || `${user?.nickname}'s Agency`}
                          </h3>
                          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" title="Verified Agency" />
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black border ${
                            myAgency?.type === 'private'
                              ? 'bg-purple-500/30 text-purple-200 border-purple-400/40'
                              : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40'
                          }`}>
                            {myAgency?.type === 'private' ? 'Private' : 'Public'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <button
                            onClick={() => myAgency?.code && handleCopyCode(myAgency.code)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-mono font-bold text-amber-300 transition-all border border-white/10"
                            title="Copy Agency Code"
                          >
                            <span>Code: {myAgency?.code || 'AGENCY'}</span>
                            {copiedCode ? <CheckBold className="w-3 h-3 text-emerald-400" /> : <CopyIcon className="w-3 h-3" />}
                          </button>

                          <span className="text-white/30">•</span>
                          <span className="text-[11px] font-extrabold text-indigo-300 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Level {myAgency?.level || 1}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {myAgency?._id && (
                      <button
                        onClick={() => navigate(`/agency/${myAgency._id}`)}
                        className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-extrabold text-xs border border-white/15 shadow-2xs flex items-center gap-1 shrink-0 transition-all"
                        title="View Public Agency Profile"
                      >
                        <span>Public View</span>
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Level Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
                      <span className="text-indigo-200 flex items-center gap-1">
                        <span>Level Progress</span>
                        <span className="text-white/40">→ Level {(myAgency?.level || 1) + 1}</span>
                      </span>
                      <span className="text-amber-300 font-black">{myAgency?.levelProgress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400 rounded-full transition-all duration-700 shadow-xs"
                        style={{ width: `${Math.max(4, Math.min(100, myAgency?.levelProgress || 0))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Comprehensive Full Overview Stats Grid (6 KPI cards) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkle className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Agency Key Performance Metrics</span>
                    </h3>
                    <button
                      onClick={() => setTab('users')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      <span>Manage Users ({hosts.length})</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Total Contribution Points */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Contribution
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                          <Trophy className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
                        {(myAgency?.totalContribution || earnings?.earnedToday || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Total points earned</p>
                    </div>

                    {/* Total Live Stream Hours */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Live Stream
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          <ClockIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
                        {myAgency?.totalLiveHours || 0}h
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Total broadcast time</p>
                    </div>

                    {/* Total Members Count */}
                    <div
                      onClick={() => setTab('users')}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Total Users
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xl font-black text-indigo-700 tracking-tight leading-none">
                          {myAgency?.memberCount || hosts.length}
                        </p>
                        <span className="text-[10px] font-extrabold text-indigo-600">View All →</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Active streamers joined</p>
                    </div>

                    {/* Agency Level & Commission */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Agency Level
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                          <Crown className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                      </div>
                      <p className="text-lg font-black text-purple-700 tracking-tight leading-none uppercase">
                        Lv.{myAgency?.level || 1} ({getAgencyCommissionByLevel(myAgency?.level || 1)}%)
                      </p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-1">Dynamic Level Commission</p>
                    </div>

                    {/* Members Total Coins Circulation */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-amber-700 uppercase tracking-wider">
                          Members Coins
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-xl font-black text-amber-600 tracking-tight leading-none truncate">
                        {userStats.totalCoins.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Held across members</p>
                    </div>

                    {/* Members Total Diamonds Circulation */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-extrabold text-sky-700 uppercase tracking-wider">
                          Members Diamonds
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                          <DiamondIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <p className="text-xl font-black text-sky-700 tracking-tight leading-none truncate">
                        {userStats.totalDiamonds.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Held across members</p>
                    </div>
                  </div>
                </div>

                {/* Owner's Wallet Balance Quick Card */}
                <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 rounded-3xl p-4 border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider">
                        Agent Wallet Balance
                      </h4>
                    </div>
                    <button
                      onClick={() => setTab('wallet')}
                      className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5"
                    >
                      <span>Wallet Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/60">
                      <span className="text-[10px] font-extrabold text-amber-800 uppercase">Available Coins</span>
                      <p className="text-lg font-black text-slate-900 mt-0.5 tabular-nums">
                        {(user?.coins || 0).toLocaleString()}
                      </p>
                      <button
                        onClick={() => setWalletModal('send_coins')}
                        className="mt-2 w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-[11px] shadow-2xs transition-all"
                      >
                        Send Coins
                      </button>
                    </div>

                    <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl border border-amber-200/60">
                      <span className="text-[10px] font-extrabold text-sky-800 uppercase">Available Diamonds</span>
                      <p className="text-lg font-black text-slate-900 mt-0.5 tabular-nums">
                        {(user?.diamonds || 0).toLocaleString()}
                      </p>
                      <button
                        onClick={() => setWalletModal('send_diamonds')}
                        className="mt-2 w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-extrabold text-[11px] shadow-2xs transition-all"
                      >
                        Send Diamonds
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agency Level & Coin Flow Ladder */}
                <SectionCard
                  title="Agency Levels & Dynamic Commission"
                  subtitle="Dynamic Level-based Agency Commissions (4% - 20%)"
                >
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-pink-900/10 p-3 rounded-2xl border border-purple-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-xs font-black text-slate-900">
                              Current Agency Level: <span className="text-purple-700 font-extrabold">Lv.{myAgency?.level || 1}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Your agency receives <strong className="text-emerald-600">{getAgencyCommissionByLevel(myAgency?.level || 1)}%</strong> coins directly into your wallet from every host gift.
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-black text-xs shadow-2xs">
                          {getAgencyCommissionByLevel(myAgency?.level || 1)}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {AGENCY_LEVEL_COMMISSION_LIST.map((lvl) => {
                        const currentLvl = myAgency?.level || 1;
                        const isCurrent = currentLvl === lvl.level;
                        return (
                          <div
                            key={lvl.level}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isCurrent
                                ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20'
                                : 'bg-white border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-900">
                                {lvl.label} {isCurrent && <span className="text-purple-600 text-[10px] font-bold">(Current)</span>}
                              </span>
                              <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                                {lvl.percent}% Commission
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">
                              {lvl.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>

                {/* Top Agency Streamers Leaderboard Preview */}
                <SectionCard
                  title={`Top Streamers (${topStreamers.length})`}
                  subtitle="Leaderboard of your highest achieving hosts"
                  flush
                >
                  {topStreamers.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-xs text-slate-400">No streamers have joined your agency yet.</p>
                      <button
                        onClick={() => navigate('/agent/invite-hosts')}
                        className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Invite Your First Host</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {topStreamers.map((h: any, idx: number) => {
                        const member = getHostUser(h);
                        const rankBadge =
                          idx === 0
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                            : 'bg-slate-100 text-slate-500 border-slate-200';

                        return (
                          <div
                            key={member._id || `top-${idx}`}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/90 hover:bg-slate-100 border border-slate-200/70 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs border ${rankBadge}`}>
                                {idx + 1}
                              </span>
                              <Avatar src={getMediaUrl(member.avatar)} nickname={member.nickname} size="sm" />
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-900 truncate">{member.nickname}</p>
                                <p className="text-[10px] text-slate-400 font-mono">ID: {member.uid} • Lv.{member.level}</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                                  🪙 {member.coins.toLocaleString()}
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[10px] font-bold">
                                  💎 {member.diamonds.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                {Number((h as any)?.liveHours || (h as any)?.durationHours || 0).toFixed(1)}h streamed
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        onClick={() => setTab('users')}
                        className="w-full mt-2 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                      >
                        <span>Open My Users Page ({hosts.length})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </SectionCard>

                {/* Quick Tool Shortcuts */}
                <SectionCard title="Agency Management Toolkit">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => setTab('users')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 transition-all text-center"
                    >
                      <Users className="w-6 h-6 text-indigo-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">My Users</span>
                    </button>

                    <button
                      onClick={() => navigate('/agent/invite-hosts')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-100 transition-all text-center"
                    >
                      <UserPlus className="w-6 h-6 text-emerald-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Add Host</span>
                    </button>

                    <button
                      onClick={() => setTab('manage')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/70 border border-purple-100 transition-all text-center relative"
                    >
                      {(joinRequests.length > 0 || leaveRequests.length > 0) && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                      <Lock className="w-6 h-6 text-purple-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Requests</span>
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
                      onClick={() => {
                        setConvertFrom('coin');
                        setTransferAmountInput('');
                        setWalletModal('convert');
                      }}
                      className="flex flex-col items-center p-3 rounded-2xl bg-violet-50 hover:bg-violet-100/70 border border-violet-100 transition-all text-center group"
                    >
                      <ExchangeIcon className="w-6 h-6 text-violet-600 mb-1.5 group-hover:scale-105 transition-transform" />
                      <span className="text-xs font-bold text-slate-900">Currency Converter</span>
                    </button>

                    <button
                      onClick={() => myAgency?._id ? navigate(`/agency/${myAgency._id}`) : navigate('/agency')}
                      className="flex flex-col items-center p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/70 border border-blue-100 transition-all text-center"
                    >
                      <Buildings className="w-6 h-6 text-blue-600 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Agency Profile</span>
                    </button>

                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex flex-col items-center p-3 rounded-2xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 transition-all text-center"
                    >
                      <Gear className="w-6 h-6 text-slate-700 mb-1.5" />
                      <span className="text-xs font-bold text-slate-900">Settings</span>
                    </button>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* ── 2. Dedicated My Users Page Tab ─────────────────────────── */}
            {tab === 'users' && (
              <div className="space-y-3.5">
                {/* Users Page Header Card */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        My Users & Streamers
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {hosts.length} registered host{hosts.length === 1 ? '' : 's'} under your agency
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/agent/invite-hosts')}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Host</span>
                    </button>
                  </div>

                  {/* Users Aggregated Summary Grid */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Users</p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{hosts.length}</p>
                    </div>
                    <div className="bg-amber-50/80 p-2 rounded-xl border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Coins</p>
                      <p className="text-sm font-black text-amber-700 mt-0.5 truncate">
                        {userStats.totalCoins >= 1_000_000
                          ? `${(userStats.totalCoins / 1_000_000).toFixed(1)}M`
                          : userStats.totalCoins.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-sky-50/80 p-2 rounded-xl border border-sky-100">
                      <p className="text-[10px] font-bold text-sky-700 uppercase">Diamonds</p>
                      <p className="text-sm font-black text-sky-700 mt-0.5 truncate">
                        {userStats.totalDiamonds >= 1_000_000
                          ? `${(userStats.totalDiamonds / 1_000_000).toFixed(1)}M`
                          : userStats.totalDiamonds.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Stream</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">
                        {userStats.totalHours.toFixed(0)}h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search & Sort Controls */}
                <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
                  <div className="relative">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search users by nickname or UID..."
                      className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-100 text-xs font-medium text-slate-900 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter & Sort Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                    <button
                      onClick={() => setUserSort('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                        userSort === 'all'
                          ? 'bg-slate-950 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({hosts.length})
                    </button>
                    <button
                      onClick={() => setUserSort('coins')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                        userSort === 'coins'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                      }`}
                    >
                      <span>🪙 Top Coins</span>
                    </button>
                    <button
                      onClick={() => setUserSort('diamonds')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                        userSort === 'diamonds'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/60'
                      }`}
                    >
                      <span>💎 Top Diamonds</span>
                    </button>
                    <button
                      onClick={() => setUserSort('level')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                        userSort === 'level'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60'
                      }`}
                    >
                      <span>👑 Highest Level</span>
                    </button>
                    <button
                      onClick={() => setUserSort('hours')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                        userSort === 'hours'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                      }`}
                    >
                      <span>⏱️ Live Hours</span>
                    </button>
                  </div>
                </div>

                {/* Users List Cards */}
                {sortedAndFilteredHosts.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center text-2xl mb-3 border border-indigo-100">
                      👥
                    </div>
                    <h4 className="text-sm font-black text-slate-900">
                      {search ? 'No Matching Users Found' : 'No Users in Your Agency Yet'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                      {search
                        ? 'Try searching with a different streamer nickname or user ID.'
                        : 'Share your agency code with streamers or add them directly to start building your roster.'}
                    </p>
                    <button
                      onClick={() => navigate('/agent/invite-hosts')}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invite Streamers Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sortedAndFilteredHosts.map((h: any, idx: number) => {
                      const member = getHostUser(h);
                      const liveHours = Number((h as any)?.liveHours || (h as any)?.durationHours || 0);

                      return (
                        <div
                          key={member._id || `user-row-${idx}`}
                          className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs transition-all hover:shadow-xs"
                        >
                          {/* User Header Info */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                onClick={() => member._id && navigate(`/user/${member._id}`)}
                                className="relative cursor-pointer shrink-0"
                              >
                                <Avatar
                                  src={getMediaUrl(member.avatar)}
                                  nickname={member.nickname}
                                  size="lg"
                                  className="ring-2 ring-indigo-100 shadow-2xs"
                                />
                                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black border border-white">
                                  Lv.{member.level}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4
                                    onClick={() => member._id && navigate(`/user/${member._id}`)}
                                    className="font-black text-sm text-slate-900 truncate cursor-pointer hover:text-indigo-600"
                                  >
                                    {member.nickname}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  UID: <strong className="text-slate-700">{member.uid}</strong>
                                </p>
                                {liveHours > 0 && (
                                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    <span>{liveHours.toFixed(1)}h broadcasted</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Public Profile Link */}
                            {member._id && (
                              <button
                                onClick={() => navigate(`/user/${member._id}`)}
                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-colors shrink-0"
                                title="View Public Profile"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Coins and Diamonds Pill Display (Only for Agency Owner) */}
                          <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                                <span>🪙</span> Coins
                              </span>
                              <span className="text-xs font-black text-amber-700 tabular-nums">
                                {member.coins.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-l border-slate-200 pl-2">
                              <span className="text-[10px] font-bold text-sky-800 flex items-center gap-1">
                                <span>💎</span> Diamonds
                              </span>
                              <span className="text-xs font-black text-sky-700 tabular-nums">
                                {member.diamonds.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Action Toolbar for Agency Owner */}
                          <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-100">
                            {/* 1. Chat */}
                            <button
                              onClick={async () => {
                                if (!member._id) return;
                                try {
                                  const { data } = await chatApi.getOrCreateChat(member._id);
                                  if (data.success && data.data?._id) navigate(`/chat/${data.data._id}`);
                                } catch {
                                  navigate(`/user/${member._id}`);
                                }
                              }}
                              className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 transition-all"
                              title="Chat with Member"
                            >
                              <ChatIcon className="w-4 h-4 mb-0.5" />
                              <span className="text-[9px] font-extrabold">Chat</span>
                            </button>

                            {/* 2. Voice Call */}
                            <button
                              onClick={() => handleStartCallWithMember(member._id, member.nickname, member.avatar, 'audio')}
                              className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 transition-all border border-emerald-100"
                              title="Voice Call"
                            >
                              <Phone className="w-4 h-4 mb-0.5 text-emerald-600" />
                              <span className="text-[9px] font-extrabold">Voice</span>
                            </button>

                            {/* 3. Video Call */}
                            <button
                              onClick={() => handleStartCallWithMember(member._id, member.nickname, member.avatar, 'video')}
                              className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 text-purple-700 transition-all border border-purple-100"
                              title="Video Call"
                            >
                              <Video className="w-4 h-4 mb-0.5 text-purple-600" />
                              <span className="text-[9px] font-extrabold">Video</span>
                            </button>

                            {/* 4. Send Coins */}
                            <button
                              onClick={() => handleQuickSend(member.uid, 'send_coins')}
                              className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 transition-all border border-amber-100"
                              title="Send Coins to Member"
                            >
                              <Coins className="w-4 h-4 mb-0.5 text-amber-600" />
                              <span className="text-[9px] font-extrabold">+Coins</span>
                            </button>

                            {/* 5. Remove Member */}
                            <button
                              onClick={() => handleRemoveMember(member._id, member.nickname)}
                              className="flex flex-col items-center justify-center py-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-600 transition-all border border-red-100"
                              title="Remove from Agency"
                            >
                              <TrashIcon className="w-4 h-4 mb-0.5 text-red-500" />
                              <span className="text-[9px] font-extrabold">Remove</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── 3. Manage Requests Tab ─────────────────────────────────── */}
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
                                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold">
                                    🪙 {(applicant.coins || 0).toLocaleString()} Coins
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-100/80 text-sky-900 text-[10px] font-bold">
                                    💎 {(applicant.diamonds || 0).toLocaleString()} Diamonds
                                  </span>
                                </div>
                                <p className="text-[11px] text-purple-900 mt-1 leading-snug">
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
                                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold">
                                    🪙 {(hostUser.coins || 0).toLocaleString()} Coins
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-100/80 text-sky-900 text-[10px] font-bold">
                                    💎 {(hostUser.diamonds || 0).toLocaleString()} Diamonds
                                  </span>
                                </div>
                                <p className="text-[11px] text-amber-900 mt-1">
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-extrabold text-slate-900">Agency Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Settings Tabs */}
            <div className="flex border-b border-slate-200 mb-4 bg-slate-50 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  settingsTab === 'general'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                General Info
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('banner')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settingsTab === 'banner'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Welcome Banner</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold flex items-center gap-0.5">
                  <Sparkle className="w-2.5 h-2.5 text-amber-500" />
                  <span>Design</span>
                </span>
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {settingsTab === 'general' ? (
                <>
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
                          <img src={getMediaUrl(agencyAvatar)} alt="" className="w-full h-full object-cover" />
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
                          <img src={getMediaUrl(agencyCover)} alt="" className="w-full h-full object-cover" />
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
                </>
              ) : (
                /* ── Welcome Banner Customizer Tab ── */
                <div className="space-y-4">
                  {/* Live Floating Animated Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Live Animated Preview</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Seen by new members</span>
                    </div>

                    <div className="p-2 rounded-3xl bg-slate-100/80 border border-slate-200">
                      <AgencyWelcomeBanner
                        mode="preview"
                        banner={{
                          enabled: welcomeEnabled,
                          title: welcomeTitle,
                          message: welcomeMessage,
                          theme: welcomeTheme,
                          badgeText: welcomeBadge,
                          imageUrl: welcomeImage,
                          floatAnimation: welcomeFloat,
                        }}
                        agencyName={agencyName || myAgency?.name}
                        agencyCode={myAgency?.code}
                        agent={{
                          nickname: user?.nickname,
                          avatar: user?.avatar,
                          uid: user?.uid,
                        }}
                      />
                    </div>
                  </div>

                  {/* Enable Switch & Float Animation Switch */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-700">Enable Banner</span>
                      <input
                        type="checkbox"
                        checked={welcomeEnabled}
                        onChange={(e) => setWelcomeEnabled(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Sparkle className="w-3 h-3 text-amber-500" />
                        <span>Float Animation</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={welcomeFloat}
                        onChange={(e) => setWelcomeFloat(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Banner Theme Gradient Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Banner Theme / Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(BANNER_THEMES).map(([key, t]) => {
                        const isSelected = welcomeTheme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setWelcomeTheme(key)}
                            className={`p-2 rounded-2xl border text-left flex flex-col justify-between h-14 transition-all relative overflow-hidden ${
                              isSelected
                                ? 'border-indigo-600 ring-2 ring-indigo-500/30 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-full h-3 rounded-md bg-gradient-to-r ${t.gradient}`} />
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-extrabold text-slate-800 truncate">{t.name}</span>
                              {isSelected && <span className="text-[10px] text-indigo-600 font-black">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Welcome Title</label>
                    <input
                      type="text"
                      value={welcomeTitle}
                      onChange={(e) => setWelcomeTitle(e.target.value)}
                      placeholder={`Welcome to ${agencyName || 'Our Agency'}! 🎉`}
                      className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Badge Text */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={welcomeBadge}
                      onChange={(e) => setWelcomeBadge(e.target.value)}
                      placeholder="OFFICIAL HOST / VIP STREAMER"
                      maxLength={25}
                      className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Welcome Message */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Welcome Message / Greeting Note</label>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      rows={3}
                      placeholder={`We are thrilled to welcome you to the ${agencyName || 'agency'} family! Broadcast, shine bright, and let's achieve great success together.`}
                      className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 resize-none font-medium focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Custom Background Image Upload */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700">Custom Banner Background (Optional)</label>
                      <label className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                        {uploadingWelcomeBg ? 'Uploading...' : 'Upload Image'}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingWelcomeBg}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingWelcomeBg(true);
                            try {
                              const url = await uploadApi.upload(file, 'agency');
                              setWelcomeImage(url);
                              showToast('Banner background uploaded', 'success');
                            } catch {
                              showToast('Failed to upload background', 'error');
                            } finally {
                              setUploadingWelcomeBg(false);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      {welcomeImage && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                          <img src={getMediaUrl(welcomeImage)} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <input
                        type="text"
                        value={welcomeImage}
                        onChange={(e) => setWelcomeImage(e.target.value)}
                        placeholder="https://... image URL (optional)"
                        className="flex-1 h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium"
                      />
                      {welcomeImage && (
                        <button
                          type="button"
                          onClick={() => setWelcomeImage('')}
                          className="text-xs text-rose-500 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 h-11 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings || uploadingLogo || uploadingCover || uploadingWelcomeBg}
                  className="flex-1 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
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
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Currency Converter</h3>
                <p className="text-xs text-slate-500">Exchange between Coins and Diamonds instantly</p>
              </div>
              <button
                type="button"
                onClick={() => setWalletModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Available Balance Box */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Your Available Balance
                </span>
                <span className="text-[10px] font-bold text-indigo-600">Rate: 1 Diamond = 1 Coin</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Available Coins */}
                <div
                  onClick={() => {
                    setConvertFrom('coin');
                    setTransferAmountInput('');
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    convertFrom === 'coin'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <CoinIcon className="w-4 h-4 text-amber-500" /> Coins
                    </span>
                    {convertFrom === 'coin' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                        From
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 tabular-nums">
                    {(user?.coins || 0).toLocaleString()}
                  </p>
                </div>

                {/* Available Diamonds */}
                <div
                  onClick={() => {
                    setConvertFrom('diamond');
                    setTransferAmountInput('');
                  }}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    convertFrom === 'diamond'
                      ? 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-400/30 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <DiamondIcon className="w-4 h-4 text-cyan-500" /> Diamonds
                    </span>
                    {convertFrom === 'diamond' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-cyan-200/80 text-cyan-900">
                        From
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-slate-900 tabular-nums">
                    {(user?.diamonds || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleConvertCurrency} className="space-y-3">
              {/* Direction Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConvertFrom('coin');
                    setTransferAmountInput('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                    convertFrom === 'coin'
                      ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CoinIcon className={`w-4 h-4 ${convertFrom === 'coin' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Coins → Diamonds</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConvertFrom('diamond');
                    setTransferAmountInput('');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                    convertFrom === 'diamond'
                      ? 'border-cyan-600 bg-cyan-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DiamondIcon className={`w-4 h-4 ${convertFrom === 'diamond' ? 'text-white' : 'text-cyan-500'}`} />
                  <span>Diamonds → Coins</span>
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Amount to Convert
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const maxAmount = convertFrom === 'coin' ? (user?.coins || 0) : (user?.diamonds || 0);
                      setTransferAmountInput(String(maxAmount));
                    }}
                    className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Max: {(convertFrom === 'coin' ? (user?.coins || 0) : (user?.diamonds || 0)).toLocaleString()}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={transferAmountInput}
                    onChange={(e) => setTransferAmountInput(e.target.value.replace(/\D/g, ''))}
                    placeholder={`Enter ${convertFrom === 'coin' ? 'Coins' : 'Diamonds'} to convert`}
                    className="w-full h-11 px-3 pr-24 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black tabular-nums focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase pointer-events-none">
                    {convertFrom === 'coin' ? 'Coins' : 'Diamonds'}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[100, 500, 1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTransferAmountInput(String(preset))}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-colors shrink-0"
                  >
                    +{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Live Estimation Preview */}
              {Number(transferAmountInput) > 0 && (
                <div className="p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="text-indigo-700 font-bold">You will receive approx:</span>
                  <span className="font-black text-indigo-950 flex items-center gap-1.5">
                    {convertFrom === 'coin' ? (
                      <>
                        <DiamondIcon className="w-4 h-4 text-cyan-600 inline" />
                        {Number(transferAmountInput).toLocaleString()} Diamonds
                      </>
                    ) : (
                      <>
                        <CoinIcon className="w-4 h-4 text-amber-500 inline" />
                        {Number(transferAmountInput).toLocaleString()} Coins
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModal(null)}
                  disabled={submittingTx}
                  className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTx || !transferAmountInput || Number(transferAmountInput) <= 0}
                  className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all"
                >
                  {submittingTx ? 'Converting...' : 'Convert Now'}
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
