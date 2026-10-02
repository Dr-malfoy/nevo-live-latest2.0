import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold,
  PiBuildingsFill,
  PiLockKeyFill,
  PiGlobeFill,
  PiCopyFill,
  PiCrownFill,
  PiUsersFill,
  PiCoinsFill,
  PiClockFill,
  PiChatCircleDotsFill,
  PiPhoneFill,
  PiVideoCameraFill,
  PiCheckCircleFill,
  PiHourglassFill,
  PiSparkleFill,
  PiShieldCheckFill,
} from 'react-icons/pi';
import { agencyApi, chatApi, callApi, type AgencyItem } from '../api';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { CallScreen } from '../components/call/CallScreen';
import { requestMediaPermissions } from '../lib/permissions';

export const AgencyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [agency, setAgency] = useState<AgencyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await agencyApi.getAgencyDetails(id);
      if (res.data?.success && res.data.data) {
        setAgency(res.data.data);
      } else {
        setAgency(null);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Agency not found', 'error');
      setAgency(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied agency code: ${code}`, 'success');
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleJoinDirect = async () => {
    if (!agency) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agencyApi.joinAgency(agency._id);
      if (res.data?.success) {
        showToast(`Successfully joined ${agency.name}!`, 'success');
        loadDetails();
      } else {
        showToast(res.data?.error || 'Could not join agency', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to join agency', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!agency) return;
    if (!user) {
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      const res = await agencyApi.requestJoin(agency._id, joinMessage.trim() || undefined);
      if (res.data?.success) {
        showToast('Join request submitted to agency owner!', 'success');
        setShowJoinModal(false);
        setJoinMessage('');
        loadDetails();
      } else {
        showToast(res.data?.error || 'Could not submit join request', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit join request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async () => {
    const agentId = agency?.agent?._id;
    if (!agentId) return;
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

  const handleStartCall = async (type: 'audio' | 'video') => {
    const agentId = agency?.agent?._id;
    if (!agentId) return;

    const perm = await requestMediaPermissions(type);
    if (!perm.granted) {
      showToast(perm.error || 'Permission denied', 'error');
      return;
    }

    try {
      const { data } = await callApi.create([agentId], type);
      if (data.success && data.data) {
        setCall({
          outgoing: {
            callId: data.data.callId,
            channel: data.data.channel,
            type: data.data.type,
            token: data.data.token,
            callee: { nickname: agency.agent.nickname, avatar: agency.agent.avatar },
          },
        });
      }
    } catch {
      showToast('Could not start call with agent', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mb-3">
          🏢
        </div>
        <h2 className="text-base font-extrabold text-slate-900">Agency Not Found</h2>
        <p className="text-xs text-slate-500 max-w-xs mt-1 mb-5">
          The requested agency may have been closed, deleted, or does not exist.
        </p>
        <button
          onClick={() => navigate('/agency')}
          className="px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs"
        >
          Back to Agency Center
        </button>
      </div>
    );
  }

  const relationship = agency.userRelationship || {
    isOwner: user?._id === agency.agent._id,
    isMember: user?.agencyId === agency._id,
    hasPendingJoinRequest: false,
    hasPendingLeaveRequest: false,
  };

  const isPrivate = agency.type === 'private';
  const members = agency.members || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <PiCaretLeftBold className="w-6 h-6" />
          </button>
          <h1 className="text-base font-extrabold text-slate-900 truncate max-w-[200px]">
            {agency.name}
          </h1>
          <button
            onClick={() => handleCopyCode(agency.code)}
            className="p-1 text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
          >
            <PiCopyFill className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto space-y-4">
        {/* ── Agency Hero Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          {agency.cover ? (
            <div className="h-28 w-full relative overflow-hidden bg-slate-900">
              <img src={agency.cover} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          ) : null}

          <div className={`p-5 ${agency.cover ? 'pt-3' : ''}`}>
            <div className="flex items-start gap-4">
              <div className={`relative shrink-0 ${agency.cover ? '-mt-10' : ''}`}>
                {agency.avatar ? (
                  <img
                    src={agency.avatar}
                    alt={agency.name}
                    className="w-18 h-18 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-md ring-4 ring-white">
                    {agency.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black border border-white flex items-center gap-0.5 shadow-xs">
                  <PiCrownFill className="w-3 h-3" />
                  <span>Lv.{agency.level}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 truncate">
                    {agency.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 border flex items-center gap-1 ${
                      isPrivate
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isPrivate ? (
                      <>
                        <PiLockKeyFill className="w-2.5 h-2.5" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <PiGlobeFill className="w-2.5 h-2.5" />
                        <span>Public</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Agency Code */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    onClick={() => handleCopyCode(agency.code)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-xs font-mono font-bold text-indigo-700 transition-colors"
                  >
                    <span>Code: {agency.code}</span>
                    <PiCopyFill className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                </div>

                {agency.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                    {agency.description}
                  </p>
                )}
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                <span className="text-slate-600 flex items-center gap-1">
                  <PiCrownFill className="w-3.5 h-3.5 text-amber-500" />
                  Agency Level {agency.level}
                </span>
                <span className="text-indigo-600 font-bold">{agency.levelProgress || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, Math.min(100, agency.levelProgress || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Key Statistics Grid ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-xs">
            <PiUsersFill className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Members</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{agency.memberCount}</p>
          </div>

          <div className="bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-xs">
            <PiCoinsFill className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contribution</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5 truncate">
              {(agency.totalContribution || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-xs">
            <PiClockFill className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Hours</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">{agency.totalLiveHours}h</p>
          </div>
        </div>

        {/* ── Agency Owner / Agent Card ── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Agency Owner / Agent
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Agent Leader
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Avatar
              src={agency.agent.avatar}
              nickname={agency.agent.nickname}
              size="lg"
              className="ring-2 ring-indigo-100"
            />

            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-sm text-slate-900 truncate">
                {agency.agent.nickname}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span className="font-mono font-semibold text-indigo-600">ID: {agency.agent.uid}</span>
                {agency.agent.country && (
                  <>
                    <span>•</span>
                    <span>{agency.agent.country}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Contact Agent Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleOpenChat}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              <PiChatCircleDotsFill className="w-4 h-4 text-indigo-600" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => handleStartCall('audio')}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all cursor-pointer"
            >
              <PiPhoneFill className="w-4 h-4 text-emerald-600" />
              <span>Audio</span>
            </button>

            <button
              onClick={() => handleStartCall('video')}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
            >
              <PiVideoCameraFill className="w-4 h-4 text-indigo-600" />
              <span>Video</span>
            </button>
          </div>
        </div>

        {/* ── Member Contribution & Roster ── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Agency Members ({members.length})
            </h3>
            <span className="text-[11px] text-slate-400">Live Hours & Contributions</span>
          </div>

          {members.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No members have joined yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {members.map((member, idx) => (
                <div
                  key={member._id}
                  onClick={() => navigate(`/user/${member._id}`)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center font-extrabold text-xs text-slate-400">
                      {idx + 1}
                    </span>
                    <Avatar
                      src={member.avatar}
                      nickname={member.nickname}
                      size="sm"
                      className="ring-1 ring-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {member.nickname}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        ID: {member.uid} • Lv.{member.level}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-amber-600 tabular-nums">
                      {(member.contribution || 0).toLocaleString()} coins
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {member.liveHours || 0}h live
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Fixed Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto">
          {relationship.isOwner ? (
            <button
              onClick={() => navigate('/agent')}
              className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2"
            >
              <PiCrownFill className="w-4 h-4 text-amber-400" />
              <span>Agency Owner Dashboard & Management</span>
            </button>
          ) : relationship.isMember ? (
            <button
              onClick={() => navigate('/my-agency')}
              className="w-full h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs flex items-center justify-center gap-2"
            >
              <PiCheckCircleFill className="w-4 h-4 text-indigo-600" />
              <span>You are a Member (View My Agency Hub)</span>
            </button>
          ) : relationship.hasPendingJoinRequest ? (
            <div className="w-full h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs flex items-center justify-center gap-2">
              <PiHourglassFill className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>Join Request Pending Owner Approval</span>
            </div>
          ) : isPrivate ? (
            <button
              onClick={() => setShowJoinModal(true)}
              disabled={actionLoading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <PiLockKeyFill className="w-4 h-4" />
              <span>Request to Join Agency</span>
            </button>
          ) : (
            <button
              onClick={handleJoinDirect}
              disabled={actionLoading}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <PiGlobeFill className="w-4 h-4" />
              <span>{actionLoading ? 'Joining...' : 'Join Agency Directly'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Join Request Modal for Private Agency ── */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center text-xl mb-2">
                <PiLockKeyFill className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Join Private Agency
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Send a join request to <strong>{agency.name}</strong>.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Introductory Message (Optional)
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Tell the agency owner about your streaming experience..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-purple-500 focus:outline-none transition-all resize-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestJoin}
                disabled={actionLoading}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
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
