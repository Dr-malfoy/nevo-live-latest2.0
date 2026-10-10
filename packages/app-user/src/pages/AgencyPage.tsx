import { useEffect, useState, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PiCaretLeftBold,
  PiMagnifyingGlassBold,
  PiPlusCircleFill,
  PiBuildingsFill,
  PiShieldCheckFill,
  PiLockKeyFill,
  PiGlobeFill,
  PiCopyFill,
  PiCrownFill,
  PiUsersFill,
  PiFlameFill,
  PiChartLineUpFill,
  PiSparkleFill,
  PiXCircleFill,
  PiCheckCircleFill,
} from 'react-icons/pi';
import { agencyApi, type AgencyItem } from '../api/agency.api';
import { useAuthStore, useUIStore } from '../stores';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { getMediaUrl } from '../lib/media';

type FilterType = 'all' | 'public' | 'private' | 'popular' | 'level';

const AgencyCard = ({
  agency,
  user,
  joining,
  onCopyCode,
  onJoinClick,
}: {
  agency: AgencyItem;
  user: any;
  joining: boolean;
  onCopyCode: (code: string, e: React.MouseEvent) => void;
  onJoinClick: (agency: AgencyItem, e: React.MouseEvent) => void;
}) => {
  const navigate = useNavigate();
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const isOwner = user?._id === (typeof agency.agent === 'object' ? agency.agent?._id : agency.agent);
  const isMember = user?.agencyId === agency._id;
  const isPrivate = agency.type === 'private';

  const avatarUrl = agency.avatar ? getMediaUrl(agency.avatar) : '';
  const coverUrl = agency.cover ? getMediaUrl(agency.cover) : '';

  return (
    <div
      onClick={() => navigate(`/agency/${agency._id}`)}
      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden group"
    >
      {/* Cover Banner */}
      <div className="h-24 sm:h-28 w-full relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700">
        {coverUrl && !coverError ? (
          <img
            src={coverUrl}
            alt="Agency Cover"
            onError={() => setCoverError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden opacity-80">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-lg" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-indigo-400/20 blur-lg" />
            <div className="absolute inset-0 flex items-center justify-center text-white/20 font-black text-4xl tracking-widest uppercase pointer-events-none select-none">
              {agency.name.slice(0, 3)}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

        {/* Top Badges: Type & Level */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold backdrop-blur-md shadow-xs border flex items-center gap-1 ${
              isPrivate
                ? 'bg-purple-900/80 text-purple-200 border-purple-400/30'
                : 'bg-emerald-900/80 text-emerald-200 border-emerald-400/30'
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
      </div>

      {/* Profile & Info Section */}
      <div className="p-3.5 pt-0">
        <div className="flex items-end justify-between -mt-7 mb-2.5">
          <div className="relative">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={agency.name}
                onError={() => setAvatarError(true)}
                className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md ring-4 ring-white">
                {agency.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black border border-white flex items-center gap-0.5 shadow-xs">
              <PiCrownFill className="w-2.5 h-2.5 text-amber-400" />
              <span>Lv.{agency.level}</span>
            </div>
          </div>

          {/* Agency Code Pill */}
          <button
            type="button"
            onClick={(e) => onCopyCode(agency.code, e)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 text-[11px] font-mono font-bold text-indigo-700 transition-all shadow-xs"
          >
            <span>{agency.code}</span>
            <PiCopyFill className="w-3 h-3 text-indigo-500" />
          </button>
        </div>

        {/* Agency Name & Stats */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
              {agency.name}
            </h3>
            <PiShieldCheckFill className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          </div>

          {agency.description && (
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium">
              {agency.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <PiUsersFill className="w-3.5 h-3.5 text-slate-400" />
              <strong className="text-slate-800 font-bold">{agency.memberCount}</strong> hosts
            </span>
            <span>•</span>
            <span className="text-amber-600 font-bold">
              {(agency.totalContribution || 0).toLocaleString()} pts
            </span>
            <span>•</span>
            <span className="text-slate-500">
              {agency.totalLiveHours || 0}h live
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 my-2.5" />

        {/* Bottom Row: Agent Info & Action Button */}
        <div className="flex items-center justify-between gap-2">
          {/* Agent Leader */}
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              src={agency.agent.avatar}
              nickname={agency.agent.nickname}
              size="xs"
              className="ring-1 ring-slate-200 shadow-xs"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate leading-none">
                {agency.agent.nickname}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                Leader ID: {agency.agent.uid}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0">
            {isOwner ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/agent');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
              >
                Manage
              </button>
            ) : isMember ? (
              <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs inline-flex items-center gap-1">
                <PiCheckCircleFill className="w-3.5 h-3.5 text-indigo-600" />
                <span>Member</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => onJoinClick(agency, e)}
                disabled={joining}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1 ${
                  isPrivate
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                }`}
              >
                {isPrivate ? 'Request' : 'Join'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AgencyPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';
  const initialSearch = searchParams.get('q') || '';

  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [search, setSearch] = useState(initialSearch);
  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick Join / Request modal state
  const [selectedAgency, setSelectedAgency] = useState<AgencyItem | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);

  const [, startTransition] = useTransition();

  const loadAgencies = async (targetFilter = filter, targetSearch = search, targetPage = 1) => {
    setLoading(true);
    try {
      const res = await agencyApi.getAgencies({
        filter: targetFilter,
        search: targetSearch.trim() || undefined,
        page: targetPage,
        limit: 20,
      });

      if (res.data?.success && res.data.data) {
        setAgencies(res.data.data);
        setPage(res.data.pagination?.page || 1);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      } else {
        setAgencies([]);
      }
    } catch {
      showToast('Failed to load agencies', 'error');
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies(filter, search, 1);
  }, [filter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchParams(search.trim() ? { q: search.trim(), filter } : { filter });
    loadAgencies(filter, search, 1);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setSearchParams(search.trim() ? { q: search.trim(), filter: newFilter } : { filter: newFilter });
  };

  const handleCopyCode = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      showToast(`Copied agency code: ${code}`, 'success');
    } catch {
      showToast('Failed to copy code', 'error');
    }
  };

  const handleJoinClick = (agency: AgencyItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }

    // If already in agency
    if (user.agencyId) {
      if (user.agencyId === agency._id) {
        navigate(`/agency/${agency._id}`);
        return;
      }
      showToast('You are already linked to an agency. Leave your current agency first.', 'info');
      return;
    }

    if (agency.type === 'public') {
      // Direct Join
      handlePublicJoin(agency);
    } else {
      // Open Join Request Modal
      setSelectedAgency(agency);
      setShowJoinModal(true);
    }
  };

  const handlePublicJoin = async (agency: AgencyItem) => {
    setJoining(true);
    try {
      const res = await agencyApi.joinAgency(agency._id);
      if (res.data?.success) {
        showToast(`Successfully joined ${agency.name}!`, 'success');
        navigate(`/agency/${agency._id}`);
      } else {
        showToast(res.data?.error || 'Could not join agency', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to join agency', 'error');
    } finally {
      setJoining(false);
    }
  };

  const handlePrivateJoinRequest = async () => {
    if (!selectedAgency) return;
    setJoining(true);
    try {
      const res = await agencyApi.requestJoin(selectedAgency._id, joinMessage.trim() || undefined);
      if (res.data?.success) {
        showToast('Join request submitted to agency owner!', 'success');
        setShowJoinModal(false);
        setJoinMessage('');
        loadAgencies(filter, search, page);
      } else {
        showToast(res.data?.error || 'Could not submit join request', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit join request', 'error');
    } finally {
      setJoining(false);
    }
  };

  const isUserAgent = user?.role === 'agent' || user?.isAgent;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* ── Top Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <PiCaretLeftBold className="w-6 h-6" />
          </button>

          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
            <PiBuildingsFill className="w-5 h-5 text-indigo-600" />
            <span>Agency Center</span>
          </h1>

          <div className="flex items-center gap-2">
            {isUserAgent ? (
              <button
                onClick={() => navigate('/agent')}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1"
              >
                <PiCrownFill className="w-3.5 h-3.5 text-amber-300" />
                <span>My Agency</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/agency/create')}
                className="px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 active:scale-95 transition-all flex items-center gap-1"
              >
                <PiPlusCircleFill className="w-4 h-4 text-indigo-600" />
                <span>Create</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Search Input Box ── */}
        <div className="px-4 pb-3 max-w-md mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Agency Code (e.g. AGY...) or Name"
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs font-medium focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
            <PiMagnifyingGlassBold className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  loadAgencies(filter, '', 1);
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <PiXCircleFill className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs"
            >
              Search
            </button>
          </form>
        </div>

        {/* ── Working Filter Tabs ── */}
        <div className="flex items-center gap-1 px-3 pb-2.5 overflow-x-auto no-scrollbar max-w-md mx-auto">
          {(
            [
              { key: 'all', label: 'All Agencies', icon: PiBuildingsFill },
              { key: 'public', label: 'Public', icon: PiGlobeFill },
              { key: 'private', label: 'Private', icon: PiLockKeyFill },
              { key: 'popular', label: 'Most Popular', icon: PiFlameFill },
              { key: 'level', label: 'Highest Level', icon: PiCrownFill },
            ] as const
          ).map((t) => {
            const active = filter === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleFilterChange(t.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content / Agency Cards ── */}
      <div className="px-3 pt-3 max-w-md mx-auto space-y-3">
        {loading ? (
          <div className="py-24 text-center">
            <Loading size="lg" />
            <p className="text-xs text-slate-500 mt-3 font-medium">Discovering agencies...</p>
          </div>
        ) : agencies.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center text-3xl mb-3">
              🏢
            </div>
            <h3 className="font-extrabold text-base text-slate-900">No Agencies Found</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-5">
              {search
                ? `No agency matches "${search}". Check the Agency Code or try searching by name.`
                : 'No agencies match the selected filter.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    loadAgencies(filter, '', 1);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Clear Search
                </button>
              )}
              <button
                onClick={() => navigate('/agency/create')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700"
              >
                Create an Agency
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold">
              <span>{totalCount} Agencies Found</span>
              {search && <span className="text-indigo-600">Results for "{search}"</span>}
            </div>

            {agencies.map((agency) => (
              <AgencyCard
                key={agency._id}
                agency={agency}
                user={user}
                joining={joining}
                onCopyCode={handleCopyCode}
                onJoinClick={handleJoinClick}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Private Agency Join Request Modal ── */}
      {showJoinModal && selectedAgency && (
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
                <strong>{selectedAgency.name}</strong> requires owner approval.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs space-y-1.5 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Agency Code:</span>
                <span className="font-mono font-bold text-indigo-600">{selectedAgency.code}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Agency Owner / Agent:</span>
                <span className="font-bold text-slate-800">{selectedAgency.agent.nickname}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Current Members:</span>
                <span className="font-bold text-slate-800">{selectedAgency.memberCount}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Message to Agency Owner (Optional)
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Tell the owner about your livestream experience or schedule..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-slate-100 border border-slate-200 focus:bg-white focus:border-purple-500 focus:outline-none transition-all resize-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedAgency(null);
                }}
                disabled={joining}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrivateJoinRequest}
                disabled={joining}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {joining ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
