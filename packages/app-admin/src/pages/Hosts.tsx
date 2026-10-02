import { useEffect, useState } from 'react';
import { Search, RefreshCw, Sparkles, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Award, Clock, DollarSign } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { HostBadge } from '../components/HostBadge';
import { getMediaUrl } from '../lib/media';

const BADGE_OPTIONS = [
  { value: 'none', label: 'None (Remove Badge)' },
  { value: 'alpha', label: 'Alpha Host (Male)' },
  { value: 'aurora', label: 'Aurora Host (Female)' },
];

export const Hosts = () => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [recalculating, setRecalculating] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async (p: number, s: string, b: string, g: string) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getHosts({
        page: p,
        limit: 20,
        search: s,
        badge: b,
        gender: g,
      });
      if (data.success) {
        setHosts(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to load hosts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, search, badgeFilter, genderFilter);
  }, [page, badgeFilter, genderFilter]);

  const handleSearch = () => {
    setPage(1);
    load(1, search, badgeFilter, genderFilter);
  };

  const handleSetBadge = async (hostId: string, badge: 'alpha' | 'aurora' | 'none') => {
    try {
      await adminApi.setHostBadge(hostId, badge);
      setToastMsg({
        type: 'success',
        text: `Badge successfully ${badge === 'none' ? 'removed' : `set to ${badge.toUpperCase()} HOST`}`,
      });
      load(page, search, badgeFilter, genderFilter);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      setToastMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to update host badge',
      });
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data } = await adminApi.recalculateHostBadges();
      if (data.success) {
        setToastMsg({
          type: 'success',
          text: `Recalculated: ${data.data.alphaAssigned} Alpha, ${data.data.auroraAssigned} Aurora badges updated.`,
        });
        load(page, search, badgeFilter, genderFilter);
      }
    } catch (err: any) {
      setToastMsg({
        type: 'error',
        text: err?.response?.data?.error || 'Failed to recalculate host badges',
      });
    } finally {
      setRecalculating(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const columns = [
    {
      key: 'host',
      label: 'Host',
      render: (r: any) => (
        <div className="flex items-center gap-3">
          <img
            src={getMediaUrl(r.avatar) || 'https://via.placeholder.com/40'}
            alt={r.nickname}
            className="w-10 h-10 rounded-full object-cover border border-dark-600 shrink-0 bg-dark-700"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-white truncate text-sm">{r.nickname}</span>
              {r.hostBadge && r.hostBadge !== 'none' && (
                <HostBadge badge={r.hostBadge} size="xs" showLabel={false} />
              )}
            </div>
            <p className="text-xs text-dark-400 font-mono">ID: {r.uid}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (r: any) => (
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
            r.gender === 'male'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : r.gender === 'female'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-dark-700 text-dark-300'
          }`}
        >
          {r.gender || 'Unspecified'}
        </span>
      ),
    },
    {
      key: 'hostBadge',
      label: 'Current Badge',
      render: (r: any) => {
        if (!r.hostBadge || r.hostBadge === 'none') {
          return <span className="text-xs text-dark-400">None</span>;
        }
        return (
          <div className="flex flex-col gap-1 items-start">
            <HostBadge badge={r.hostBadge} size="sm" showLabel={true} />
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className={`font-semibold px-1.5 py-0.2 rounded uppercase ${
                  r.hostBadgeType === 'manual'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {r.hostBadgeType || 'Auto'}
              </span>
              <span className="text-dark-400">+5% Bonus Active</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'weeklyEarnings',
      label: 'Weekly Earnings',
      render: (r: any) => {
        const meets = r.meetsEarnings;
        return (
          <div className="flex flex-col">
            <span className={`font-mono text-sm flex items-center gap-1 ${meets ? 'text-amber-300 font-bold' : 'text-dark-300'}`}>
              <DollarSign className="w-3.5 h-3.5" />
              {Number(r.weeklyEarnings || 0).toLocaleString()} Coins
            </span>
            <span className="text-[10px] text-dark-400">
              Req: 500,000 {meets ? <span className="text-emerald-400 font-bold">✓ Met</span> : `(${(Math.max(0, 500000 - (r.weeklyEarnings || 0))).toLocaleString()} left)`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'weeklyLiveHours',
      label: 'Weekly Live Time',
      render: (r: any) => {
        const meets = r.meetsLiveHours;
        return (
          <div className="flex flex-col">
            <span className={`font-mono text-sm flex items-center gap-1 ${meets ? 'text-cyan-300 font-bold' : 'text-dark-300'}`}>
              <Clock className="w-3.5 h-3.5" />
              {r.weeklyLiveHours || 0} hrs
            </span>
            <span className="text-[10px] text-dark-400">
              Req: 50.0 hrs {meets ? <span className="text-emerald-400 font-bold">✓ Met</span> : `(${(Math.max(0, 50 - (r.weeklyLiveHours || 0))).toFixed(1)}h left)`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'qualification',
      label: 'Auto Status',
      render: (r: any) => {
        if (r.qualifiesAuto && r.eligibleBadge) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Eligible ({r.eligibleBadge.toUpperCase()})
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded-lg">
            <XCircle className="w-3.5 h-3.5 shrink-0 text-dark-500" />
            Not Qualified
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Set Badge',
      render: (r: any) => (
        <select
          value={r.hostBadge || 'none'}
          onChange={(e) => handleSetBadge(r._id, e.target.value as any)}
          aria-label={`Set Badge for ${r.nickname}`}
          className={`bg-dark-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none transition-colors border ${
            r.hostBadge === 'alpha'
              ? 'border-yellow-500/50 text-yellow-300 bg-dark-800'
              : r.hostBadge === 'aurora'
              ? 'border-pink-500/50 text-pink-300 bg-dark-800'
              : 'border-dark-600 text-dark-300'
          }`}
        >
          {BADGE_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value} className="bg-dark-800 text-white">
              {label}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-3 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-500/50'
              : 'bg-red-900/90 text-red-100 border-red-500/50'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
          {toastMsg.text}
        </div>
      )}

      {/* Header & Badges Summary */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <Award className="w-6 h-6 text-primary-400" />
            Host Management
          </h2>
          <p className="text-xs text-dark-400 mt-1">
            Manage host badges (Alpha Host & Aurora Host), qualification tracking, and weekly performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate Qualifications'}
          </button>
        </div>
      </div>

      {/* Badge Information Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-yellow-500/30 flex items-start gap-3 relative overflow-hidden">
          <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 shrink-0">
            <HostBadge badge="alpha" size="sm" showLabel={false} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-yellow-300">ALPHA HOST</h3>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Male Hosts</span>
            </div>
            <p className="text-xs text-dark-300 mt-1 leading-relaxed">
              Auto criteria: <strong className="text-white">≥ 500,000 Coins</strong> + <strong className="text-white">≥ 50 Live Hours/week</strong>. Gives <strong className="text-yellow-300">+5% earning bonus</strong> & premium search priority.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/80 border border-pink-500/30 flex items-start gap-3 relative overflow-hidden">
          <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 shrink-0">
            <HostBadge badge="aurora" size="sm" showLabel={false} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-pink-300">AURORA HOST</h3>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-bold">Female Hosts</span>
            </div>
            <p className="text-xs text-dark-300 mt-1 leading-relaxed">
              Auto criteria: <strong className="text-white">≥ 500,000 Coins</strong> + <strong className="text-white">≥ 50 Live Hours/week</strong>. Gives <strong className="text-pink-300">+5% earning bonus</strong> & premium search priority.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-dark-900 p-3 rounded-xl border border-dark-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search host by nickname, UID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-dark-800 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Badge Filter */}
        <select
          value={badgeFilter}
          onChange={(e) => {
            setBadgeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-dark-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none border border-dark-700"
        >
          <option value="all">All Badges</option>
          <option value="alpha">Alpha Host</option>
          <option value="aurora">Aurora Host</option>
          <option value="none">No Badge</option>
        </select>

        {/* Gender Filter */}
        <select
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(1);
          }}
          className="bg-dark-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none border border-dark-700"
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={hosts}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};
