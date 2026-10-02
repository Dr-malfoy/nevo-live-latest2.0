import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold,
  PiClockClockwise,
  PiCopyFill,
  PiPhoneFill,
  PiVideoCameraFill,
  PiChatCircleDotsFill,
  PiCheckCircleFill,
  PiXCircleFill,
  PiHourglassFill,
} from 'react-icons/pi';
import { agencyApi, chatApi, callApi, type LeaveRequestData } from '../api';
import { optional } from '../api/pending';
import { useAuthStore, useSocketStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';

export const MyAgency = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [agencyData, setAgencyData] = useState<any>(null);
  const [leaveStatus, setLeaveStatus] = useState<LeaveRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');

  // Call state
  const [call, setCall] = useState<{
    outgoing?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      token: string;
      callee?: { nickname: string; avatar?: string } | null;
    };
    incoming?: {
      callId: string;
      channel: string;
      type: 'audio' | 'video';
      initiatorId: string;
      token: string;
      initiator: { nickname: string; avatar?: string } | null;
    };
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);

  // First-time welcome celebration banner
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return localStorage.getItem('hasSeenAgencyPopup') !== 'true';
  });

  const loadData = async () => {
    try {
      const [agencyRes, statusRes] = await Promise.all([
        optional(agencyApi.getMyAgency()).catch(() => null),
        optional(agencyApi.getLeaveStatus()).catch(() => null),
      ]);

      if (agencyRes?.data) {
        setAgencyData(agencyRes.data);
      } else {
        setAgencyData(null);
      }

      if (statusRes?.data?.request) {
        setLeaveStatus(statusRes.data.request);
        if (statusRes.data.request.status) {
          localStorage.setItem('agencyQuitStatus', statusRes.data.request.status);
        }
      } else {
        const localStatus = localStorage.getItem('agencyQuitStatus');
        if (localStatus === 'pending') {
          setLeaveStatus({
            _id: 'local-pending',
            userId: user?._id || '',
            agencyId: user?.agencyId || '',
            agentId: '',
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          setLeaveStatus(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen for real-time leave decision and call invites
  useEffect(() => {
    if (!socket) return;

    const onLeaveDecided = (payload: any) => {
      if (payload?.status === 'approved') {
        showToast('Your agency leave request was approved!', 'success');
        localStorage.setItem('agencyQuitStatus', 'approved');
        updateUser({ agencyId: undefined, role: 'user' } as any);
        loadData();
      } else if (payload?.status === 'rejected') {
        showToast('Your agency leave request was rejected by the owner.', 'info');
        localStorage.setItem('agencyQuitStatus', 'rejected');
        loadData();
      }
    };

    const onCallAccept = (payload: any) => {
      if (payload?.callId && call?.outgoing?.callId === payload.callId) {
        setCallAccepted(true);
      }
    };

    socket.on('agency:leave-decided', onLeaveDecided);
    socket.on('call:accept', onCallAccept);

    return () => {
      socket.off('agency:leave-decided', onLeaveDecided);
      socket.off('call:accept', onCallAccept);
    };
  }, [socket, call, updateUser]);

  const handlePopupClose = () => {
    setIsFirstTime(false);
    localStorage.setItem('hasSeenAgencyPopup', 'true');
  };

  const copyId = async (idToCopy: string) => {
    try {
      await navigator.clipboard.writeText(idToCopy);
      showToast('Copied Agent ID to clipboard', 'success');
    } catch {
      showToast('Could not copy ID', 'error');
    }
  };

  // Submit Leave Request
  const handleQuitRequest = async () => {
    if (leaveStatus?.status === 'pending') {
      showToast('A leave request is already pending owner approval', 'info');
      setShowQuitModal(false);
      return;
    }

    setSubmittingLeave(true);
    try {
      let res;
      try {
        res = await agencyApi.requestLeave(leaveReason.trim() || undefined);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await agencyApi.leave(leaveReason.trim() || undefined);
        } else {
          throw err;
        }
      }

      localStorage.setItem('agencyQuitStatus', 'pending');
      showToast('Leave request submitted to agency owner', 'success');
      setShowQuitModal(false);
      setLeaveReason('');
      await loadData();
    } catch (err: any) {
      // Fallback local persistence if remote endpoint 404
      localStorage.setItem('agencyQuitStatus', 'pending');
      setLeaveStatus({
        _id: 'local-pending',
        userId: user?._id || '',
        agencyId: user?.agencyId || '',
        agentId: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast('Leave request submitted to agency owner', 'success');
      setShowQuitModal(false);
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Chat with Agent
  const handleOpenChat = async () => {
    const agentId = agencyData?.agentId?._id;
    if (!agentId) {
      showToast('Agent details not found', 'error');
      return;
    }
    try {
      const { data } = await chatApi.getOrCreateChat(agentId);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${agentId}`);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to open chat with agent', 'error');
    }
  };

  // Call Agent (Audio / Video)
  const handleStartCall = async (type: 'audio' | 'video') => {
    const agent = agencyData?.agentId;
    const agentId = agent?._id;
    if (!agentId) {
      showToast('Agent details not found', 'error');
      return;
    }

    // Check permissions
    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Media permission denied', 'error');
      return;
    }

    setCallAccepted(false);
    try {
      const { data } = await callApi.create([agentId], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: agent.nickname || 'Agent', avatar: agent.avatar },
          },
        });
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not start call with agent', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Loading className="pt-32" size="lg" />
      </div>
    );
  }

  if (!agencyData && !user?.agencyId) {
    return (
      <div className="min-h-screen bg-surface-soft flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center px-4 bg-white sticky top-0 z-10 shrink-0 border-b border-line">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
            <PiCaretLeftBold className="w-5 h-5 text-ink" />
          </button>
          <h1 className="text-[17px] font-bold text-ink mx-auto pr-8">My Agency</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary-50 flex items-center justify-center mb-4 text-3xl shadow-sm">
            🏢
          </div>
          <h2 className="text-lg font-bold text-ink mb-1.5">No Agency Linked</h2>
          <p className="text-xs text-ink-muted max-w-xs mb-6">
            You are currently not linked to any agency. Join an agency with an agency code or link with an Agent ID.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-sm active:scale-95 transition-all"
          >
            Find or Join Agency
          </button>
        </div>
      </div>
    );
  }

  const agent = agencyData?.agentId || {};
  const agentUid = agent.uid || '59237509';
  const agentNickname = agent.nickname || "🔥 Agency Agent 🔥";
  const agentAvatar = agent.avatar || '';
  const agentInitials = agentNickname.slice(0, 2).toUpperCase();

  // First time popup screen
  if (isFirstTime) {
    return (
      <div className="min-h-screen bg-[#6D28D9] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center px-4 bg-white sticky top-0 z-10 shrink-0 rounded-b-xl">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
            <PiCaretLeftBold className="w-5 h-5 text-ink" />
          </button>
          <h1 className="text-[17px] font-bold text-ink mx-auto pr-8">My Agency</h1>
        </div>

        {/* Purple gradient container */}
        <div className="flex-1 w-full flex flex-col items-center p-6 relative">
          <div className="absolute top-0 left-0 right-0 h-56 bg-gradient-to-b from-[#4C1D95] to-transparent flex justify-center items-center opacity-80">
            <div className="text-6xl drop-shadow-lg">🎁</div>
          </div>

          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl z-10 relative mt-24 border border-indigo-50">
            <h2 className="text-[22px] font-bold text-center text-indigo-700 mb-6">Congratulations</h2>
            <p className="text-ink text-[15px] mb-4 font-medium">Dear {user?.nickname || 'User'} 😲</p>
            <p className="text-ink-soft text-[14px] mb-8 leading-relaxed">
              I'm delighted to welcome you to {agencyData?.name || 'my agency'}! Moving forward, let's work closely together for mutually-beneficial success.
            </p>

            {/* Agent Info Card */}
            <div className="flex items-center justify-center gap-4 mt-4">
              {agentAvatar ? (
                <Avatar src={agentAvatar} nickname={agentNickname} size="lg" />
              ) : (
                <div className="w-[52px] h-[52px] bg-black rounded-full flex items-center justify-center text-white font-black text-xl italic tracking-tighter">
                  {agentInitials}
                </div>
              )}
              <div>
                <p className="font-bold text-[13px]">{agentNickname}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">ID: {agentUid}</p>
                <p className="text-[11px] text-ink-muted">Code: {agencyData?.code || 'AGENCY'}</p>
              </div>
            </div>

            {/* Yellow Seal */}
            <button
              onClick={handlePopupClose}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[72px] h-[72px] bg-[#FFD700] rounded-full border-[6px] border-[#8b5cf6] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
            >
              <div className="text-[#B8860B] text-4xl font-black">✓</div>
            </button>
          </div>

          {/* Quit Button */}
          <button
            onClick={() => setShowQuitModal(true)}
            className="absolute bottom-8 text-white/80 hover:text-white text-sm underline cursor-pointer"
          >
            I want to quit the agency &gt;&gt;
          </button>
        </div>

        {/* Quit Confirmation Modal */}
        {showQuitModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[300px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150">
              <h3 className="text-lg font-bold text-ink mb-2">Leave Agency</h3>
              <p className="text-ink-soft text-xs mb-4">
                Submit a Leave Request to the agency owner? You will remain a member until the owner approves your request.
              </p>

              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Reason for leaving (optional)..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl bg-surface-sunken border border-line focus:outline-none focus:border-primary-500 mb-4 resize-none"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowQuitModal(false)}
                  disabled={submittingLeave}
                  className="flex-1 h-[40px] rounded-full bg-surface-soft text-ink-soft font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuitRequest}
                  disabled={submittingLeave}
                  className="flex-1 h-[40px] rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // State B: Main Agency & Agent Detail Page
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col relative">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 bg-white sticky top-0 z-10 shrink-0 border-b border-line">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
          <PiCaretLeftBold className="w-5 h-5 text-ink" />
        </button>
        <h1 className="text-[17px] font-bold text-ink">My Agency</h1>
        <button onClick={loadData} className="p-2 -mr-2 active:opacity-60" title="Refresh">
          <PiClockClockwise className="w-[22px] h-[22px] text-ink" />
        </button>
      </div>

      {/* Agency & Agent Card */}
      <div className="bg-white p-4 mx-3 mt-3 rounded-2xl shadow-xs border border-line/70">
        <div className="flex items-center gap-3.5">
          {agentAvatar ? (
            <Avatar src={agentAvatar} nickname={agentNickname} size="lg" className="ring-2 ring-primary-100" />
          ) : (
            <div className="w-14 h-14 bg-gradient-to-tr from-slate-900 to-indigo-900 rounded-full flex items-center justify-center text-white font-black text-xl italic tracking-tighter shrink-0 border-2 border-white shadow-sm">
              {agentInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[16px] text-ink truncate">{agentNickname}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100">
                Agent Owner
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-ink-muted">
              <span>Agency: {agencyData?.name || 'Agency'}</span>
              <span>•</span>
              <span className="font-semibold text-primary-600">ID: {agentUid}</span>
              <button onClick={() => copyId(agentUid)} className="p-0.5 text-ink-ghost hover:text-ink">
                <PiCopyFill className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Contact & Calls Row */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-line/60">
          <button
            onClick={handleOpenChat}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-ink text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            <PiChatCircleDotsFill className="w-4 h-4 text-primary-600" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => handleStartCall('audio')}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            <PiPhoneFill className="w-4 h-4 text-emerald-600" />
            <span>Audio Call</span>
          </button>

          <button
            onClick={() => handleStartCall('video')}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            <PiVideoCameraFill className="w-4 h-4 text-indigo-600" />
            <span>Video Call</span>
          </button>
        </div>
      </div>

      {/* Leave Request Status Banner */}
      {leaveStatus && leaveStatus.status === 'pending' && (
        <div className="mx-3 mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <PiHourglassFill className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-900">Leave Request: Pending Approval</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Waiting for agency owner to review. You cannot go live while pending.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-extrabold shrink-0">
            PENDING
          </span>
        </div>
      )}

      {leaveStatus && leaveStatus.status === 'rejected' && (
        <div className="mx-3 mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <PiXCircleFill className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-900">Leave Request Rejected</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                The agency owner rejected your leave request. You remain in the agency.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowQuitModal(true)}
            className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-bold shrink-0 hover:bg-rose-700"
          >
            Re-apply
          </button>
        </div>
      )}

      {leaveStatus && leaveStatus.status === 'approved' && (
        <div className="mx-3 mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <PiCheckCircleFill className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-900">Leave Request Approved</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                You have been removed from the agency.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agency Members / Details Section */}
      <div className="mx-3 mt-3 bg-white rounded-2xl p-4 border border-line/70 shadow-xs">
        <h3 className="font-bold text-sm text-ink mb-3">Agency Info</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-ink-muted block text-[11px] mb-1">Agency Name</span>
            <span className="font-bold text-ink">{agencyData?.name || 'Agency'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-ink-muted block text-[11px] mb-1">Agency Code</span>
            <span className="font-bold text-primary-600">{agencyData?.code || 'N/A'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-ink-muted block text-[11px] mb-1">Commission Rate</span>
            <span className="font-bold text-ink">{agencyData?.commission ?? 10}%</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-ink-muted block text-[11px] mb-1">Total Hosts</span>
            <span className="font-bold text-ink">{agencyData?.hosts?.length || 1} hosts</span>
          </div>
        </div>
      </div>

      {/* Leave Agency Action Section */}
      <div className="mx-3 mt-4 mb-8">
        <button
          onClick={() => setShowQuitModal(true)}
          disabled={leaveStatus?.status === 'pending'}
          className={`w-full py-3 rounded-2xl text-xs font-bold border transition-all ${
            leaveStatus?.status === 'pending'
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white text-red-600 border-red-200 hover:bg-red-50 active:scale-98 shadow-xs cursor-pointer'
          }`}
        >
          {leaveStatus?.status === 'pending'
            ? 'Leave Request Pending Owner Review'
            : 'Request to Leave Agency'}
        </button>
      </div>

      {/* Quit Confirmation Modal */}
      {showQuitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[320px] p-6 text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-ink mb-1">Leave Agency</h3>
            <p className="text-ink-soft text-xs mb-4">
              Submit a leave request to the agency owner? You will remain in the agency until the owner approves your request.
            </p>

            <textarea
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="Reason for leaving (optional)..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-primary-500 mb-4 resize-none"
            />

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowQuitModal(false)}
                disabled={submittingLeave}
                className="flex-1 h-[42px] rounded-xl border border-slate-200 text-ink-soft font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleQuitRequest}
                disabled={submittingLeave}
                className="flex-1 h-[42px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
              >
                {submittingLeave ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Screen Modal */}
      {call && (
        <CallScreen
          incoming={call.incoming}
          outgoing={call.outgoing}
          accepted={callAccepted}
          onClose={(outcome) => {
            setCall(null);
            setCallAccepted(false);
            if (outcome === 'rejected') showToast('Call declined', 'info');
          }}
        />
      )}
    </div>
  );
};
