import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiMagnifyingGlassBold as Search, PiCaretLeftBold as ArrowLeft, PiVideoCameraFill as Video, PiUsersFill as Users } from 'react-icons/pi';
import { usersApi, callApi } from '../api';
import { UserListRow } from '../components/user';
import { CountryFilterBar } from '../components/filter';
import { CallScreen, MemberPicker, CallInviteBanner, type IncomingGroupInvite } from '../components/call';
import { Modal } from '../components/ui';
import { useSocketStore, useAuthStore, useCountryStore } from '../stores';

export const Discover = () => {
  const navigate = useNavigate();
  const socket = useSocketStore((s) => s.socket);
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [call, setCall] = useState<{
    outgoing?: { callId: string; channel: string; type: 'audio' | 'video'; token: string; callee?: { nickname: string; avatar?: string } | null };
    incoming?: IncomingGroupInvite;
  } | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [invite, setInvite] = useState<IncomingGroupInvite | null>(null);
  const callRef = useRef<typeof call>(null);
  callRef.current = call;
  const selectedCountries = useCountryStore((s) => s.selected);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearched(true);
    try {
      // Requirement #1 — Discover honours the shared country filter too.
      const { data } = await usersApi.searchUsers(query.trim(), {
        ...(selectedCountries.length > 0 ? { country: selectedCountries.join(',') } : {}),
      });
      setResults(data.data || []);
    } catch {} finally { setSearching(false); }
  };

  // Re-run an existing search when the country filter changes.
  useEffect(() => {
    if (searched && query.trim()) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries.join(',')]);

  // Active-calls lobby refresh
  const loadActiveCalls = () => {
    callApi.getActive().then(({ data }) => {
      if (data.success) setActiveCalls(data.data || []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadActiveCalls();
    const t = setInterval(loadActiveCalls, 15000);
    return () => clearInterval(t);
  }, []);

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
      alert(err?.response?.data?.error || 'Failed to start group call');
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
      alert(err?.response?.data?.error || 'Failed to join call');
    }
  };

  // Socket: incoming group invites + accept signals
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
      alert(err?.response?.data?.error || 'Failed to accept call');
    }
  };

  const declineInvite = async (inv: IncomingGroupInvite) => {
    setInvite(null);
    await callApi.end(inv.callId, 'rejected').catch(() => {});
  };

  const handleCallClose = () => {
    setCall(null);
    setCallAccepted(false);
    loadActiveCalls();
  };

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-1 p-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Discover</h1>
          <button
            onClick={() => setShowPicker(true)}
            aria-label="Start a group call"
            className="h-8 px-3 rounded-full bg-surface-sunken text-ink-soft flex items-center gap-1.5 text-xs font-semibold"
          >
            <Users className="w-3.5 h-3.5" /> Group Call
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by ID or name"
              className="w-full h-11 pl-9 pr-24 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint truncate
                border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3.5 btn-primary text-xs disabled:opacity-40"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>
        </div>

        {/* Requirement #1 — country filter applies to people search too */}
        <CountryFilterBar className="px-4 pb-3" />
      </header>

      {/* Active calls — the "Join" option */}
      {activeCalls.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5" /> Join a Call
          </p>
          <div className="space-y-2">
            {activeCalls.map((c: any) => (
              <button
                key={c.callId}
                onClick={() => joinCall(c.callId)}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-card shadow-card"
              >
                <span className="w-10 h-10 rounded-full bg-[#E9F9EE] flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#22A45D]" />
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm text-ink">
                    {c.type === 'video' ? 'Video' : 'Audio'} call
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {c.participants?.map((p: any) => p.nickname).slice(0, 3).join(', ') || 'Members'}
                    {c.participants?.length > 3 ? ` +${c.participants.length - 3}` : ''}
                  </p>
                </div>
                <span className="text-xs text-ink-muted shrink-0">
                  {c.participants?.length}/{c.maxParticipants || 10}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3">
        {searched && !searching && results.length === 0 && (
          <p className="text-sm text-ink-muted text-center py-10 px-8">
            No one found for “{query}”. Try a different ID or name.
          </p>
        )}

        {results.length > 0 && (
          <div className="bg-white divide-y divide-line">
            {results.map((u: any) => (
              <UserListRow key={u._id} user={u} showFollow />
            ))}
          </div>
        )}
      </div>

      {/* Group call member picker */}
      <Modal isOpen={showPicker} onClose={() => setShowPicker(false)} title="Start a Group Call">
        <MemberPicker onConfirm={startGroupCall} onClose={() => setShowPicker(false)} />
      </Modal>

      {/* Incoming group-call invite banner */}
      <CallInviteBanner invite={invite} onAccept={acceptInvite} onDecline={declineInvite} />

      {/* Active call screen */}
      {call && (
        <CallScreen
          incoming={call.incoming as any}
          outgoing={call.outgoing as any}
          accepted={callAccepted}
          onClose={handleCallClose}
        />
      )}
    </div>
  );
};
