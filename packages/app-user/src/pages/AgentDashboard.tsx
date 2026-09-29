import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiBellFill as Bell, PiCaretDownBold as ChevronDown, PiCaretRightBold as ChevronRight, PiCoinsFill as Coins, PiGiftFill as Gift, PiHeadphonesFill as Headphones, PiMagnifyingGlassBold as Search, PiTrophyFill as Trophy, PiUserPlusFill as UserPlus, PiUsersFill as Users, PiUsersThreeFill as UsersRound } from 'react-icons/pi';
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
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import {
  ScreenHeader,
  PillTabs,
  TabBar,
  SectionCard,
  StatCell,
  EmptyState,
  PendingApiNotice,
} from '../components/common';
import { Sparkline } from '../components/common/Sparkline';
import { Avatar, RoleTags, UserNameplate } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Agent dashboard — requirements #5, #34, #52 and #54.
 *
 * Four screens in the documents, one dashboard with three tabs here:
 * Make Money · Manage · Data. Endpoints are specified in BACKEND-GUIDE.md §4.7.
 */

type Tab = 'make_money' | 'manage' | 'data';
type DataTab = 'overview' | 'host' | 'invite';

/** #34.6 — the six money-making tools. */
const TOOLS = [
  { key: 'add_host', label: 'Add Host', Icon: UserPlus, tint: 'bg-[#FFECF3] text-[#FF6EA6]', to: '/agent/invite-hosts' },
  { key: 'invite_agent', label: 'Invite Agent', Icon: Users, tint: 'bg-[#E8F4FF] text-role-agent', to: '/referral' },
  { key: 'coins_trading', label: 'Coins Trading', Icon: Coins, tint: 'bg-[#FFF3E0] text-role-seller', to: '/transfer' },
  { key: 'support', label: 'Support', Icon: Headphones, tint: 'bg-[#FFF8E0] text-[#E0A83C]', to: '/settings' },
  { key: 'ranking', label: 'Ranking', Icon: Trophy, tint: 'bg-[#F3EDFF] text-[#8B5CF6]', to: '/rankings?board=agent_count' },
  { key: 'reward', label: 'Reward', Icon: Gift, tint: 'bg-[#F3EDFF] text-[#8B5CF6]', to: '/rewards' },
];

/** Manage → the five bonus options from #5. */
const MANAGE_ROWS = [
  { key: 'my_host', label: 'My Host' },
  { key: 'base_salary', label: 'Base Salary Host' },
  { key: 'applications', label: 'Host Application' },
  { key: 'add_host', label: 'Add Host' },
  { key: 'host_group', label: 'Host Group' },
];

const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const AgentDashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<Tab>('make_money');
  const [dataTab, setDataTab] = useState<DataTab>('overview');
  const [range, setRange] = useState<AgentRange>('30d');
  const [rangeOpen, setRangeOpen] = useState(false);

  const [earnings, setEarnings] = useState<AgentEarnings | null>(null);
  const [hostData, setHostData] = useState<AgentHostData | null>(null);
  const [inviteData, setInviteData] = useState<AgentInviteData | null>(null);
  const [hosts, setHosts] = useState<AgentHostRow[]>([]);
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      optional(agentApi.getEarnings(range)).catch(() => null),
      optional(agentApi.getHostData(range)).catch(() => null),
      optional(agentApi.getInviteAgentData(range)).catch(() => null),
      optional(agentApi.getHosts({ range })).catch(() => null),
      optional(agentApi.getApplications()).catch(() => null),
    ])
      .then(([e, h, i, hostList, apps]) => {
        if (cancelled) return;
        setEarnings(e?.data ?? null);
        setHostData(h?.data ?? null);
        setInviteData(i?.data ?? null);
        setHosts(hostList?.data ?? []);
        setApplications(apps?.data ?? []);
        setLive(!!e?.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const rangeLabel = useMemo(
    () => AGENT_RANGES.find((r) => r.key === range)?.label ?? '',
    [range]
  );

  const filteredHosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hosts;
    return hosts.filter(
      (h) => h.user.nickname.toLowerCase().includes(q) || h.user.uid?.toLowerCase().includes(q)
    );
  }, [hosts, search]);

  const decideApplication = async (id: string, accept: boolean) => {
    const res = await optional(
      accept ? agentApi.acceptApplication(id) : agentApi.rejectApplication(id)
    ).catch(() => null);
    if (res === null) {
      showToast('Host applications are not connected yet', 'info');
      return;
    }
    setApplications((rows) => rows.filter((a) => a._id !== id));
    showToast(accept ? 'Host accepted' : 'Application rejected', 'success');
  };

  const RangePicker = (
    <div className="relative">
      <button
        onClick={() => setRangeOpen((v) => !v)}
        className="h-8 px-3 rounded-full bg-surface-sunken text-sm text-ink-soft flex items-center gap-1"
      >
        {rangeLabel}
        <ChevronDown className="w-4 h-4" />
      </button>
      {rangeOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-card-hover overflow-hidden">
            {AGENT_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setRange(r.key);
                  setRangeOpen(false);
                }}
                className={`w-full h-11 px-4 text-left text-sm border-b border-line last:border-0 ${
                  r.key === range ? 'text-accent-500 font-semibold' : 'text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      {/* Pastel hero, as in #34.1 */}
      <div className="bg-gradient-to-b from-[#FFE9F2] via-[#EFEAFF] to-surface-soft">
        <ScreenHeader
          title=""
          right={
            <div className="flex items-center gap-1">
              <span className="h-7 px-2.5 rounded-full bg-role-seller/20 text-[#B4771A] text-[11px] font-bold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Agent
              </span>
              <button
                onClick={() => navigate('/notifications')}
                aria-label="Notifications"
                className="relative w-9 h-9 flex items-center justify-center text-ink"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-live" />
              </button>
            </div>
          }
        />

        {/* Identity row */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="lg" />
          <div className="flex-1 min-w-0">
            <UserNameplate user={user as any} size="md" showRoles={false} showOnline={false} />
            <RoleTags user={user as any} className="mt-1" />
          </div>

          <div className="bg-white rounded-card px-3 py-2 text-center shrink-0">
            <p className="text-lg font-bold text-accent-500 tabular-nums leading-none">
              {Math.round((earnings?.levelProgress ?? 0) * 100)}%
            </p>
            <p className="text-[10px] text-ink-muted mt-1">
              {earnings?.maxed ? 'Max' : 'Commission'}
            </p>
          </div>
        </div>

        <div className="px-4 pb-3">
          <PillTabs
            tabs={[
              { key: 'make_money', label: 'Make Money' },
              { key: 'manage', label: 'Manage' },
              { key: 'data', label: 'Data' },
            ]}
            active={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        </div>
      </div>

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : (
        <>
          {/* ── Make Money (#34) ─────────────────────────────────── */}
          {tab === 'make_money' && (
            <div className="px-3 space-y-3">
              <SectionCard>
                <div className="flex items-stretch">
                  <div className="flex-1">
                    <p className="text-xs text-ink-muted">Earned Today</p>
                    <p className="text-[26px] leading-tight font-bold text-ink tabular-nums">
                      {(earnings?.earnedToday ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-px bg-line" />
                  <div className="flex-1 pl-4">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-ink-muted">Points</p>
                      <button
                        onClick={() => navigate('/withdraw-methods')}
                        className="h-6 px-2.5 rounded-full bg-accent-500 text-white text-[11px] font-bold"
                      >
                        Withdraw
                      </button>
                    </div>
                    <p className="text-[26px] leading-tight font-bold text-ink tabular-nums">
                      {(earnings?.points ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3 px-3 py-2 rounded-lg bg-accent-50 text-[13px] text-ink-soft tabular-nums">
                  Accumulated Earnings: {(earnings?.accumulated ?? 0).toLocaleString()}
                </div>
              </SectionCard>

              <SectionCard title="Money-making tools">
                <div className="grid grid-cols-4 gap-y-4">
                  {TOOLS.map(({ key, label, Icon, tint, to }) => (
                    <button
                      key={key}
                      onClick={() => navigate(to)}
                      className="flex flex-col items-center gap-1.5 active:opacity-60"
                    >
                      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="text-[11px] text-ink-soft text-center leading-tight">{label}</span>
                    </button>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Withdraw rates"
                subtitle="From the agency agreement"
              >
                <ul className="text-sm text-ink-soft space-y-1.5">
                  <li>100,000 coins = 2,500 BDT</li>
                  <li>bKash / Nagad / Rocket — 2.5% charge</li>
                  <li>USDT · Binance · Epay · Payoneer · Bank transfer also available</li>
                </ul>
                <button
                  onClick={() => navigate('/withdraw-methods')}
                  className="mt-3 h-10 px-4 btn-secondary text-sm w-full"
                >
                  View withdraw methods
                </button>
              </SectionCard>

              {!live && <PendingApiNotice section="§4.7" what="Agent earnings" />}
            </div>
          )}

          {/* ── Manage (#5 bonus icons) ──────────────────────────── */}
          {tab === 'manage' && (
            <div className="px-3 space-y-3">
              <div className="list-group">
                {MANAGE_ROWS.map((row) => (
                  <button
                    key={row.key}
                    onClick={() =>
                      row.key === 'add_host' ? navigate('/agent/invite-hosts') : undefined
                    }
                    className="list-row w-full"
                  >
                    <span className="flex-1 text-left">{row.label}</span>
                    {row.key === 'applications' && applications.length > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-status-live text-white text-[11px] font-bold flex items-center justify-center">
                        {applications.length}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-ink-ghost" />
                  </button>
                ))}
                {/* Mock Quit Requests Row */}
                <button className="list-row w-full">
                  <span className="flex-1 text-left">Quit Requests</span>
                  {localStorage.getItem('agencyQuitStatus') === 'pending' && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-ink-ghost" />
                </button>
              </div>

              {/* Quit Requests UI Mock */}
              {localStorage.getItem('agencyQuitStatus') === 'pending' && (
                <SectionCard title="Quit Requests" flush>
                  <div className="divide-y divide-line">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Avatar src={user?.avatar} nickname={user?.nickname} size="md" />
                      <div className="flex-1 min-w-0">
                        <UserNameplate user={user as any} size="sm" showRoles={false} wrap />
                        <p className="text-[11px] text-ink-muted">Requested to quit agency</p>
                      </div>
                      <button
                        onClick={() => {
                          localStorage.setItem('agencyQuitStatus', 'none');
                          window.location.reload();
                        }}
                        className="h-8 px-3 rounded-full bg-surface-sunken text-ink-muted text-xs font-semibold"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          localStorage.setItem('agencyQuitStatus', 'none');
                          localStorage.setItem('hasSeenAgencyPopup', 'false'); // user can join again
                          window.location.reload();
                        }}
                        className="h-8 px-3.5 rounded-full bg-red-500 text-white text-xs font-bold"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* Host applications — accept / reject inline */}
              {applications.length > 0 && (
                <SectionCard title="Host applications" flush>
                  <div className="divide-y divide-line">
                    {applications.map((app) => (
                      <div key={app._id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar src={app.user.avatar} nickname={app.user.nickname} size="md" />
                        <div className="flex-1 min-w-0">
                          <UserNameplate user={app.user} size="sm" showRoles={false} wrap />
                        </div>
                        <button
                          onClick={() => decideApplication(app._id, false)}
                          className="h-8 px-3 rounded-full bg-surface-sunken text-ink-muted text-xs font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => decideApplication(app._id, true)}
                          className="h-8 px-3.5 rounded-full bg-black text-white text-xs font-bold"
                        >
                          Accept
                        </button>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {/* My hosts */}
              <SectionCard title="My Host" right={RangePicker} flush>
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or ID"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                        border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {filteredHosts.length === 0 ? (
                  <div className="pb-4">
                    <EmptyState
                      icon={<UsersRound className="w-6 h-6" />}
                      title={hosts.length === 0 ? 'No hosts yet' : 'No host matches that search'}
                      className="!py-8"
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-line">
                    {filteredHosts.map((host) => (
                      <button
                        key={host._id}
                        onClick={() => navigate(`/user/${host.user._id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-surface-sunken"
                      >
                        <span className="w-6 text-xs font-bold text-ink-faint tabular-nums shrink-0">
                          {host.serial}
                        </span>
                        <Avatar src={host.user.avatar} nickname={host.user.nickname} size="sm" />
                        <div className="flex-1 min-w-0">
                          <UserNameplate user={host.user} size="sm" showRoles={false} wrap />
                          <p className="text-[11px] text-ink-muted mt-0.5 tabular-nums">
                            Live {formatDuration(host.liveDurationSec)} · Party{' '}
                            {formatDuration(host.partyDurationSec)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">
                            {compactNumber(host.earnings)}
                          </p>
                          <p className="text-[11px] text-ink-muted tabular-nums">
                            +{compactNumber(host.commission)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>

              {!live && <PendingApiNotice section="§4.7" what="Your host list and applications" />}
            </div>
          )}

          {/* ── Data (#52, #54) ──────────────────────────────────── */}
          {tab === 'data' && (
            <div className="px-3 space-y-3">
              <div className="px-1">
                <TabBar
                  tabs={[
                    { key: 'overview', label: 'Overview' },
                    { key: 'host', label: 'Host analysis' },
                    { key: 'invite', label: 'Income analysis' },
                  ]}
                  active={dataTab}
                  onChange={(k) => setDataTab(k as DataTab)}
                />
              </div>

              {dataTab === 'overview' && (
                <SectionCard
                  title="Earnings & Commission"
                  subtitle={
                    earnings?.refreshedAt
                      ? `Refreshed ${new Date(earnings.refreshedAt).toLocaleTimeString()}`
                      : 'Refresh data every 30 minutes'
                  }
                  right={RangePicker}
                >
                  <div className="grid grid-cols-3 gap-1">
                    <StatCell
                      label="Total earnings"
                      value={compactNumber(earnings?.totals.totalEarnings ?? 0)}
                      highlight
                    />
                    <StatCell label="Host Earnings" value={compactNumber(earnings?.totals.hostEarnings ?? 0)} />
                    <StatCell
                      label="Invite agent earnings"
                      value={compactNumber(earnings?.totals.inviteAgentEarnings ?? 0)}
                    />
                    <StatCell
                      label="Total commission"
                      value={compactNumber(earnings?.totals.totalCommission ?? 0)}
                      highlight
                    />
                    <StatCell
                      label="Host commission"
                      value={compactNumber(earnings?.totals.hostCommission ?? 0)}
                    />
                    <StatCell
                      label="Invite agent commission"
                      value={compactNumber(earnings?.totals.inviteAgentCommission ?? 0)}
                    />
                  </div>

                  <div className="mt-3">
                    <Sparkline
                      points={(earnings?.series ?? []).map((p) => ({ date: p.date, value: p.value }))}
                      withAxes
                    />
                  </div>
                </SectionCard>
              )}

              {dataTab === 'host' && (
                <SectionCard
                  title="Host data"
                  subtitle="Refresh data every 30 minutes"
                  right={RangePicker}
                >
                  <div className="grid grid-cols-2 gap-1">
                    <StatCell label="New" value={hostData?.new ?? 0} highlight />
                    <StatCell label="New base salary" value={hostData?.newBaseSalary ?? 0} />
                    <StatCell
                      label="Live Duration"
                      value={formatDuration(hostData?.liveDurationSec ?? 0)}
                    />
                    <StatCell label="Valid host" value={hostData?.validHosts ?? 0} />
                  </div>
                  <div className="mt-3">
                    <Sparkline points={hostData?.series ?? []} withAxes color="#2F80ED" />
                  </div>
                </SectionCard>
              )}

              {dataTab === 'invite' && (
                <SectionCard
                  title="Invite agent data"
                  subtitle="Refresh data every 30 minutes"
                  right={RangePicker}
                >
                  <div className="grid grid-cols-2 gap-1">
                    <StatCell label="New" value={inviteData?.new ?? 0} highlight />
                    <StatCell label="Have income" value={inviteData?.haveIncome ?? 0} />
                  </div>
                  <div className="mt-3">
                    <Sparkline points={inviteData?.series ?? []} withAxes color="#22A45D" />
                  </div>
                </SectionCard>
              )}

              {!live && <PendingApiNotice section="§4.7" what="Agent analytics" />}
            </div>
          )}
        </>
      )}
    </div>
  );
};
