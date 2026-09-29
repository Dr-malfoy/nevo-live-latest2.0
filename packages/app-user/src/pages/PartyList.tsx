import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio, PiMagnifyingGlassBold as Search, PiTrophyFill as Trophy, PiVideoCameraFill as Video, PiChartBarFill as ChartBar, PiXBold as CloseIcon, PiUsersFill as UsersIcon, PiLockKeyFill as LockIcon, PiSparkleFill as Sparkle } from 'react-icons/pi';
import { partyApi, type PartyListItem } from '../api/party.api';
import { roomsApi } from '../api/rooms.api';
import { optional } from '../api/pending';
import { useCountryStore, useAuthStore, useUIStore, useSocketStore } from '../stores';
import { TabBar, EmptyState, PendingApiNotice } from '../components/common';
import { CountryFilterBar } from '../components/filter';
import { Avatar } from '../components/user';
import { Loading, VerificationGateModal } from '../components/ui';
import { canUseLiveFeatures } from '../services/verification';
import { compactNumber } from '../lib/time';

type Tab = 'following' | 'party';

export const PartyList = () => {
  const navigate = useNavigate();
  const selectedCountries = useCountryStore((s) => s.selected);
  const user = useAuthStore((s) => s.user);
  const socket = useSocketStore((s) => s.socket);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('party');
  const [rooms, setRooms] = useState<PartyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [showGate, setShowGate] = useState(false);

  // Quick party creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [partyName, setPartyName] = useState(user?.nickname ? `${user.nickname}'s Party` : 'My Party Room');
  const [seatCount, setSeatCount] = useState<number>(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadFeed = async () => {
    try {
      const feed = await optional(
        partyApi.getFeed({
          tab,
          country: selectedCountries.length ? selectedCountries.join(',') : undefined,
        })
      ).catch(() => null);

      if (feed?.success && Array.isArray(feed.data)) {
        setRooms(feed.data.filter((r) => !!r._id && !!r.owner));
        setLive(true);
        return;
      }

      // Fallback: the basic room list
      const { data } = await partyApi.listRooms({ limit: 30 });
      const mapped: PartyListItem[] = (data.data || [])
        .filter((room: any) => !!room.ownerId)
        .map((room: any) => ({
          _id: room._id,
          name: room.name,
          thumbnail: room.ownerId?.avatar,
          owner: room.ownerId,
          memberCount: (room.seats || []).filter((s: any) => s.userId).length,
          viewerCount: room.viewerCount ?? 0,
        }));
      setRooms(mapped);
      setLive(false);
    } catch {
      setRooms([]);
      setLive(false);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleRoomClosed = ({ roomId }: { roomId: string }) => {
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
    };
    socket.on('room:closed', handleRoomClosed);
    socket.on('room:ended', handleRoomClosed);
    socket.on('room:deleted', handleRoomClosed);
    return () => {
      socket.off('room:closed', handleRoomClosed);
      socket.off('room:ended', handleRoomClosed);
      socket.off('room:deleted', handleRoomClosed);
    };
  }, [socket]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadFeed().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const onFocus = () => {
      loadFeed();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [tab, selectedCountries.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      showToast('Please enter a party name', 'error');
      return;
    }

    setCreating(true);
    try {
      const { data } = await roomsApi.create({
        name: partyName.trim(),
        seatCount,
        isPrivate,
      });

      if (data.success && data.data?._id) {
        showToast('Party room created!', 'success');
        setShowCreateModal(false);
        navigate(`/party/${data.data._id}`);
      } else {
        showToast(data.message || 'Failed to create party', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to create party', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf2ff] via-[#f5f8ff] to-[#f4f7fa] pb-24 relative">
      <header className="sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 pt-10 pb-2 bg-transparent">
          <div className="flex items-center gap-[18px] text-[16px] text-ink-muted font-medium transition-all">
            <button
              onClick={() => setTab('following')}
              className={tab === 'following' ? 'text-[22px] text-ink font-bold' : ''}
            >
              Following
            </button>
            <button
              onClick={() => setTab('party')}
              className={tab === 'party' ? 'text-[22px] text-ink font-bold' : ''}
            >
              Party
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/search')}>
              <Search className="w-6 h-6 text-ink" />
            </button>
            <button onClick={() => navigate('/rankings')}>
              <Trophy className="w-[26px] h-[26px] text-yellow-500" />
            </button>
          </div>
        </div>

        <CountryFilterBar className="px-4 py-2" />
      </header>

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : rooms.length === 0 ? (
        <>
          <EmptyState
            icon={<Radio className="w-6 h-6" />}
            title={tab === 'following' ? 'No parties from people you follow' : 'No parties right now'}
            hint="Start your own party now using the PARTY button below!"
          />
          {!live && <PendingApiNotice section="§4.9" what="The party feed with member previews" />}
        </>
      ) : (
        <div className="mt-3 px-4 flex flex-col gap-3">
          {rooms.map((room, index) => (
            <div key={room._id}>
              <button
                onClick={() => navigate(`/party/${room._id}`)}
                className="w-full flex items-center p-3 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-[84px] h-[84px] rounded-[14px] overflow-hidden bg-surface-sunken shrink-0">
                  {room.thumbnail ? (
                    <img src={room.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-ghost">
                      <Video className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 ml-3 flex flex-col justify-center h-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-ink text-[16px] truncate">{room.name}</span>
                    {room.owner?.country && (
                      <img
                        src={`https://flagcdn.com/w40/${room.owner.country.toLowerCase()}.png`}
                        alt={room.owner.country}
                        className="w-[14px] h-[14px] rounded-full object-cover inline-block shrink-0 shadow-sm"
                      />
                    )}
                  </div>

                  <div className="mt-1">
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#f6a02d]">
                      <span className="text-[14px]">😎</span> {room.tag?.label ?? 'Chatting'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="flex -space-x-1.5">
                        {room.memberAvatars?.slice(0, 3).map((src, i) => (
                          <Avatar key={i} src={src} nickname="" size="xs" className="w-5 h-5 ring-2 ring-white" />
                        ))}
                        <div className="w-5 h-5 rounded-full bg-[#8e8e93] ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white z-10">
                          {room.memberCount > 9 ? '9+' : room.memberCount}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#8e8e93] text-[13px] font-semibold">
                      <ChartBar className="w-4 h-4" />
                      {compactNumber(room.viewerCount || (index + 1) * 450)}
                    </div>
                  </div>
                </div>
              </button>

              {index === 3 && (
                <div
                  onClick={() => navigate('/invite')}
                  className="mt-3 w-full h-[84px] rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-r from-[#44177d] via-[#f72e73] to-[#f72e73] flex items-center justify-center text-white shadow-sm"
                >
                  <div className="text-center font-black italic text-2xl drop-shadow-md">
                    Invite Friends
                    <div className="text-sm font-bold mt-1 text-[#ffe270]">Up to 10,500 /invite</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating PARTY button */}
      <div
        className="fixed z-30 pointer-events-none"
        style={{ right: 'max(1rem, calc(50vw - 12.5rem + 1rem))', bottom: '5.5rem' }}
      >
        <button
          onClick={() => {
            if (!canUseLiveFeatures(user?.verification, user?.role)) {
              setShowGate(true);
              return;
            }
            setPartyName(user?.nickname ? `${user.nickname}'s Party` : 'My Voice Party');
            setShowCreateModal(true);
          }}
          className="pointer-events-auto h-12 px-6 rounded-full bg-gradient-to-r from-[#ff9a25] to-[#ff7314] flex items-center justify-center shadow-xl text-white font-black text-[15px] gap-2 active:scale-95 transition-transform"
        >
          <Radio className="w-5 h-5 text-white animate-pulse" />
          <span>START PARTY</span>
        </button>
      </div>

      {/* Direct Create Party Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </span>
                <h3 className="text-lg font-bold text-ink">Start Voice Party</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full text-ink-muted flex items-center justify-center hover:bg-surface-sunken"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase mb-1">Party Room Title</label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="Enter Party Title"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-sunken text-ink text-sm font-medium border border-transparent focus:bg-white focus:border-amber-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-muted uppercase mb-1">Seats Capacity</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSeatCount(8)}
                    className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                      seatCount === 8
                        ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-line text-ink-muted bg-surface-sunken'
                    }`}
                  >
                    <UsersIcon className="w-4 h-4" />
                    <span>8 Seats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeatCount(16)}
                    className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                      seatCount === 16
                        ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-line text-ink-muted bg-surface-sunken'
                    }`}
                  >
                    <Sparkle className="w-4 h-4" />
                    <span>16 Seats</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken">
                <div className="flex items-center gap-2">
                  <LockIcon className="w-4 h-4 text-ink-muted" />
                  <div>
                    <p className="text-xs font-bold text-ink">Private Room</p>
                    <p className="text-[11px] text-ink-muted">Only invited friends can join</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-500 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !partyName.trim()}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold shadow-lg shadow-amber-500/25 active:scale-95 transition-transform disabled:opacity-50"
              >
                {creating ? 'Starting Party…' : 'Start Party Room Now'}
              </button>
            </form>
          </div>
        </div>
      )}

      <VerificationGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        type="face"
        title="Live Face Verification Required"
        message="Live Face Verification is required to create and host Voice Party rooms. Complete live face verification to start your party room."
      />
    </div>
  );
};
