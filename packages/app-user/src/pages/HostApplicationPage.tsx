import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiLockKeyFill as LockIcon,
  PiCheckCircleFill as CheckIcon,
  PiClockFill as ClockIcon,
  PiCalendarCheckFill as CalendarIcon,
  PiGiftFill as GiftIcon,
  PiCrownFill as CrownIcon,
  PiSparkleFill as SparkleIcon,
  PiShieldCheckFill as ShieldIcon,
  PiPaperPlaneRightFill as SendIcon,
  PiHourglassFill as HourglassIcon,
  PiWarningCircleFill as WarningIcon,
  PiArrowsClockwiseBold as RefreshIcon,
  PiCoinsFill as CoinsIcon,
  PiMedalFill as MedalIcon,
  PiInfoBold as InfoIcon,
} from 'react-icons/pi';
import { usersApi } from '../api';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { HostBadge } from '../components/user';
import { DiamondIcon } from '../components/ui/CurrencyIcon';

export const HostApplicationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [refreshingBonus, setRefreshingBonus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [bonusData, setBonusData] = useState<any>(null);

  // Active view tab: 'bonus' (7-day performance bonus) or 'application' (initial eligibility)
  const isApprovedHost =
    user?.hostBadge === 'alpha' ||
    user?.hostBadge === 'aurora' ||
    eligibilityData?.latestApplication?.status === 'approved';

  const [activeTab, setActiveTab] = useState<'bonus' | 'application'>('bonus');

  // Form states
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [hostType, setHostType] = useState<'alpha' | 'aurora'>(
    user?.gender === 'female' ? 'aurora' : 'alpha'
  );

  // 7-Day Countdown Timer state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [eligRes, bonusRes] = await Promise.allSettled([
        usersApi.getHostEligibility(),
        usersApi.getHostBonusCycle(),
      ]);

      if (eligRes.status === 'fulfilled' && eligRes.value.data.success) {
        setEligibilityData(eligRes.value.data.data);
        if (eligRes.value.data.data?.targetHostType) {
          setHostType(eligRes.value.data.data.targetHostType);
        }
      }

      if (bonusRes.status === 'fulfilled' && bonusRes.value.data.success) {
        setBonusData(bonusRes.value.data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load host data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshBonus = async () => {
    try {
      setRefreshingBonus(true);
      const { data } = await usersApi.getHostBonusCycle();
      if (data.success) {
        setBonusData(data.data);
        showToast('Bonus progress updated', 'success');
      }
    } catch {
      showToast('Could not refresh bonus data', 'error');
    } finally {
      setRefreshingBonus(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update active tab based on approved status once loaded
  useEffect(() => {
    if (!loading) {
      if (isApprovedHost) {
        setActiveTab('bonus');
      } else {
        setActiveTab('application');
      }
    }
  }, [loading, isApprovedHost]);

  // Live countdown to cycle refresh
  useEffect(() => {
    if (!bonusData?.currentCycle?.endDate) return;

    const updateTimer = () => {
      const diff = Math.max(0, new Date(bonusData.currentCycle.endDate).getTime() - Date.now());
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [bonusData?.currentCycle?.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realName.trim()) {
      showToast('Please enter your real name', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Please enter your contact phone number', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await usersApi.submitHostApplication({
        realName: realName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        bio: bio.trim() || undefined,
        socialLink: socialLink.trim() || undefined,
        hostType,
      });

      if (data.success) {
        showToast('Application submitted successfully! Admin will review shortly.', 'success');
        loadData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const criteria = eligibilityData?.criteria;
  const isEligible = Boolean(eligibilityData?.isEligible);
  const latestApp = eligibilityData?.latestApplication;
  const isPending = latestApp?.status === 'pending';
  const isRejected = latestApp?.status === 'rejected';

  const currentCycle = bonusData?.currentCycle;
  const activeBadgeType: 'alpha' | 'aurora' =
    bonusData?.hostType || (user?.hostBadge === 'aurora' ? 'aurora' : 'alpha');
  const activeRule =
    bonusData?.rule ||
    (activeBadgeType === 'aurora'
      ? {
          name: 'Aurora Host (Female ♀️)',
          cycleDays: 7,
          targetLiveHours: 20,
          minDailyHours: 3,
          maxDailyHours: 5,
          targetGiftCoins: 500_000,
          bonusDiamonds: 300_000,
        }
      : {
          name: 'Alpha Host (Male ♂️)',
          cycleDays: 7,
          targetLiveHours: 15,
          minDailyHours: 2,
          maxDailyHours: 4,
          targetGiftCoins: 400_000,
          bonusDiamonds: 200_000,
        });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="-ml-1 p-1 text-ink active:scale-95 transition-transform"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-base font-extrabold text-ink">Host Portal</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {isApprovedHost ? (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                <CheckIcon className="w-3.5 h-3.5" />
                {activeBadgeType === 'alpha' ? 'Alpha Host ♂️' : 'Aurora Host ♀️'}
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                Alpha & Aurora
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-4 border-t border-gray-100 bg-white">
          <button
            onClick={() => setActiveTab('bonus')}
            className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bonus'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <SparkleIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>7-Day Host Bonus</span>
            {isApprovedHost && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('application')}
            className={`flex-1 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'application'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <CrownIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>{isApprovedHost ? 'Badge Info' : 'Apply for Host'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: 7-DAY PERFORMANCE BONUS DASHBOARD
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'bonus' && (
          <div className="space-y-4">
            {/* Top Cycle Banner & Countdown */}
            <div
              className={`rounded-3xl p-5 text-white shadow-xl relative overflow-hidden ${
                activeBadgeType === 'aurora'
                  ? 'bg-gradient-to-br from-[#240A1A] via-[#3F132E] to-[#1A0613]'
                  : 'bg-gradient-to-br from-[#0B1A30] via-[#102A4C] to-[#081224]'
              }`}
            >
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HostBadge badge={activeBadgeType} size="sm" />
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                        {activeBadgeType === 'alpha' ? 'Alpha Host (Male ♂️)' : 'Aurora Host (Female ♀️)'}
                      </h2>
                      <p className="text-[10px] text-white/70">
                        Cycle #{currentCycle?.cycleNumber || 1} · 7-Day Performance Window
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={refreshBonus}
                    disabled={refreshingBonus}
                    title="Refresh bonus progress"
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white/90"
                  >
                    <RefreshIcon className={`w-4 h-4 ${refreshingBonus ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Reward Banner */}
                <div className="rounded-2xl p-3 bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      7-Day Auto Bonus
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <DiamondIcon className="w-5 h-5 text-cyan-300 drop-shadow" />
                      <span className="text-xl font-black text-white tracking-tight">
                        {activeRule.bonusDiamonds.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-cyan-200">Diamonds</span>
                    </div>
                  </div>

                  <div className="text-right">
                    {currentCycle?.bonusAwarded ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                        <CheckIcon className="w-3.5 h-3.5" /> Awarded
                      </span>
                    ) : currentCycle?.isEligibleForBonus ? (
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 animate-pulse">
                        <SparkleIcon className="w-3.5 h-3.5" /> Ready to Award
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-[10px] font-bold uppercase tracking-wider">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>

                {/* Countdown Timer Block */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-white/80 mb-1.5">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5 text-cyan-300" /> Cycle Refresh Countdown:
                    </span>
                    <span className="text-[10px] text-white/60">Auto-refreshes every 7 days</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-black/30 rounded-xl py-1.5 border border-white/10">
                      <p className="text-base font-black tabular-nums text-white leading-tight">
                        {timeLeft.days}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Days</p>
                    </div>
                    <div className="bg-black/30 rounded-xl py-1.5 border border-white/10">
                      <p className="text-base font-black tabular-nums text-white leading-tight">
                        {String(timeLeft.hours).padStart(2, '0')}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Hours</p>
                    </div>
                    <div className="bg-black/30 rounded-xl py-1.5 border border-white/10">
                      <p className="text-base font-black tabular-nums text-white leading-tight">
                        {String(timeLeft.minutes).padStart(2, '0')}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Mins</p>
                    </div>
                    <div className="bg-black/30 rounded-xl py-1.5 border border-white/10">
                      <p className="text-base font-black tabular-nums text-cyan-300 leading-tight">
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-white/60 font-bold">Secs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* If user is not yet an approved host, show helpful hint */}
            {!isApprovedHost && (
              <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <InfoIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <p className="font-bold">Previewing Host Bonus Rules</p>
                  <p className="text-amber-700 mt-0.5">
                    You need to be an approved Alpha Host (♂️) or Aurora Host (♀️) to start earning this 7-day automated bonus. Submit your application below!
                  </p>
                  <button
                    onClick={() => setActiveTab('application')}
                    className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-sm active:scale-95 transition-all"
                  >
                    Go to Host Application →
                  </button>
                </div>
              </div>
            )}

            {/* Target 1: Total Live Streaming Hours (Capped Daily) */}
            <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <ClockIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-ink">
                      Live Hours: {activeRule.targetLiveHours}H in 7 Days
                    </h3>
                    <p className="text-[10px] text-ink-muted">
                      Daily Cap: Min {activeRule.minDailyHours}H, Max {activeRule.maxDailyHours}H counted per day
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black tabular-nums ${
                      currentCycle?.meetsLiveHours ? 'text-emerald-600' : 'text-indigo-600'
                    }`}
                  >
                    {currentCycle?.totalEligibleLiveHours ?? 0} / {activeRule.targetLiveHours} hrs
                  </span>
                  <p className="text-[9px] text-ink-muted">
                    {currentCycle?.meetsLiveHours ? '✓ Target Met' : 'Capped Live Time'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentCycle?.meetsLiveHours
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 to-sky-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((currentCycle?.totalEligibleLiveHours ?? 0) / activeRule.targetLiveHours) * 100
                      )
                    )}%`,
                  }}
                />
              </div>

              {/* Daily Capping Rule explanation callout */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5 text-slate-900">
                  <InfoIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  Daily Counting Rule ({activeRule.minDailyHours}H – {activeRule.maxDailyHours}H):
                </p>
                <p className="leading-relaxed text-[10.5px] text-slate-600">
                  {activeBadgeType === 'alpha' ? (
                    <>
                      You must stream a minimum of <strong>2 hours</strong> per day. A maximum of <strong>4 hours</strong> will be counted per day. Any live streaming time beyond 4 hours in a single day will not count toward the weekly bonus target.
                    </>
                  ) : (
                    <>
                      You must stream a minimum of <strong>3 hours</strong> per day. A maximum of <strong>5 hours</strong> will be counted per day. Any live streaming time beyond 5 hours in a single day will not count toward the weekly bonus target.
                    </>
                  )}
                </p>
              </div>

              {/* Day-by-Day (Day 1 to Day 7) Cards */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-ink flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                    7-Day Daily Breakdown:
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    Valid Days: <strong>{currentCycle?.validDaysCount ?? 0} / 7</strong>
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {(currentCycle?.dailyStats || []).map((d: any) => {
                    const isToday =
                      new Date().toISOString().slice(0, 10) === d.date;
                    return (
                      <div
                        key={d.dayIndex + d.date}
                        className={`p-1.5 rounded-xl border text-center transition-all ${
                          d.passedDailyRule
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                            : d.rawHours > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-gray-50 border-gray-100 text-gray-400'
                        } ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                      >
                        <p className="text-[9px] font-extrabold uppercase tracking-tight opacity-75">
                          D{d.dayIndex}
                        </p>
                        <p className="text-[10px] font-black tabular-nums mt-0.5 leading-tight">
                          {d.eligibleHours}h
                        </p>
                        <span className="text-[8px] font-bold block mt-0.5 truncate">
                          {d.passedDailyRule ? '✓' : d.rawHours > 0 ? '<min' : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target 2: Gift Coins Received (400k for Alpha, 500k for Aurora) */}
            <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <GiftIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-ink">
                      Gift Coins: {(activeRule.targetGiftCoins).toLocaleString()} in 7 Days
                    </h3>
                    <p className="text-[10px] text-ink-muted">
                      Receive gifts during streams & party rooms in this cycle
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black tabular-nums ${
                      currentCycle?.meetsGiftCoins ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {(currentCycle?.currentGiftCoins ?? 0).toLocaleString()} / {(activeRule.targetGiftCoins).toLocaleString()}
                  </span>
                  <p className="text-[9px] text-ink-muted">
                    {currentCycle?.meetsGiftCoins ? '✓ Target Met' : 'Gift Coins'}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentCycle?.meetsGiftCoins
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((currentCycle?.currentGiftCoins ?? 0) / activeRule.targetGiftCoins) * 100
                      )
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                <span>
                  Progress:{' '}
                  {Math.min(
                    100,
                    Math.round(
                      ((currentCycle?.currentGiftCoins ?? 0) / activeRule.targetGiftCoins) * 100
                    )
                  )}
                  %
                </span>
                <span>
                  {currentCycle?.meetsGiftCoins
                    ? '✓ Completed'
                    : `Remaining: ${Math.max(
                        0,
                        activeRule.targetGiftCoins - (currentCycle?.currentGiftCoins ?? 0)
                      ).toLocaleString()} Coins`}
                </span>
              </div>
            </div>

            {/* Past Cycles History */}
            <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <MedalIcon className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-extrabold text-ink">Cycle History & Past Payouts</h3>
                </div>
                <span className="text-[10px] text-ink-muted">Refreshes every 7 days</span>
              </div>

              {bonusData?.pastCycles && bonusData.pastCycles.length > 0 ? (
                <div className="space-y-2">
                  {bonusData.pastCycles.map((c: any) => (
                    <div
                      key={c._id}
                      className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-ink">Cycle #{c.cycleNumber}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              c.status === 'awarded'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {c.status === 'awarded' ? 'Awarded' : 'Missed'}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted mt-0.5">
                          {new Date(c.startDate).toLocaleDateString()} –{' '}
                          {new Date(c.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          Live: <strong>{c.totalEligibleLiveHours}h</strong> · Gifts:{' '}
                          <strong>{(c.currentGiftCoins || 0).toLocaleString()}</strong>
                        </p>
                      </div>

                      <div className="text-right">
                        {c.status === 'awarded' ? (
                          <div className="flex items-center gap-1 text-emerald-600 font-black">
                            <DiamondIcon className="w-3.5 h-3.5" />
                            <span>+{c.bonusDiamonds?.toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-bold text-[11px]">—</span>
                        )}
                        {c.awardedAt && (
                          <p className="text-[9px] text-gray-400 mt-0.5">
                            {new Date(c.awardedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-ink-muted">
                  <p>You are currently in your first 7-day bonus cycle.</p>
                  <p className="text-[10px] mt-1 text-gray-400">
                    Past cycle summaries and diamond payouts will appear here after cycle completion.
                  </p>
                </div>
              )}
            </div>

            {/* Official Bonus Comparison Scheme */}
            <div className="rounded-3xl p-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-purple-900/10 border border-indigo-100 space-y-2.5">
              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <CrownIcon className="w-4 h-4 text-amber-500" />
                Alpha vs Aurora Host Bonus Scheme
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Alpha */}
                <div className="p-3 rounded-2xl bg-white border border-blue-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-blue-900">Alpha Host</span>
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">♂️ Male</span>
                  </div>
                  <p className="text-[10px] text-gray-600">Duration: <strong>7 Days</strong></p>
                  <p className="text-[10px] text-gray-600">Total Live: <strong>15 Hours</strong></p>
                  <p className="text-[10px] text-gray-600">Daily: <strong>2H – 4H cap</strong></p>
                  <p className="text-[10px] text-gray-600">Gifts: <strong>400,000 Coins</strong></p>
                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between font-black text-indigo-600 text-[11px]">
                    <span>Bonus:</span>
                    <span className="flex items-center gap-0.5">
                      <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" /> 200,000
                    </span>
                  </div>
                </div>

                {/* Aurora */}
                <div className="p-3 rounded-2xl bg-white border border-rose-100 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-900">Aurora Host</span>
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded">♀️ Female</span>
                  </div>
                  <p className="text-[10px] text-gray-600">Duration: <strong>7 Days</strong></p>
                  <p className="text-[10px] text-gray-600">Total Live: <strong>20 Hours</strong></p>
                  <p className="text-[10px] text-gray-600">Daily: <strong>3H – 5H cap</strong></p>
                  <p className="text-[10px] text-gray-600">Gifts: <strong>500,000 Coins</strong></p>
                  <div className="pt-1 border-t border-gray-100 flex items-center justify-between font-black text-rose-600 text-[11px]">
                    <span>Bonus:</span>
                    <span className="flex items-center gap-0.5">
                      <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" /> 300,000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: APPLICATION & INITIAL ELIGIBILITY
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'application' && (
          <div className="space-y-4">
            {/* Host Badges Showcase Card */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0F1E36] via-[#162744] to-[#0A1324] p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <CrownIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300">
                    Official Host Verification
                  </span>
                </div>
                <h2 className="text-xl font-black tracking-tight leading-snug">
                  Apply for Alpha & Aurora Host
                </h2>
                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  Unlock prestigious official host privileges, 200k/300k weekly diamonds performance bonuses, and distinguished profile crown badges.
                </p>

                {/* Badges preview row */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
                  {/* Alpha Host (Male) */}
                  <div
                    onClick={() => !isPending && !isApprovedHost && setHostType('alpha')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      hostType === 'alpha'
                        ? 'bg-blue-950/60 border-blue-400/80 shadow-md ring-1 ring-blue-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <HostBadge badge="alpha" size="sm" />
                      <span className="text-[10px] font-bold text-blue-300 px-1.5 py-0.5 rounded bg-blue-500/20">
                        Male ♂️
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-2">Alpha Host</p>
                    <p className="text-[10px] text-white/60">Bonus: 200k 💎 / 7 days</p>
                  </div>

                  {/* Aurora Host (Female) */}
                  <div
                    onClick={() => !isPending && !isApprovedHost && setHostType('aurora')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      hostType === 'aurora'
                        ? 'bg-rose-950/60 border-rose-400/80 shadow-md ring-1 ring-rose-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <HostBadge badge="aurora" size="sm" />
                      <span className="text-[10px] font-bold text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/20">
                        Female ♀️
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-2">Aurora Host</p>
                    <p className="text-[10px] text-white/60">Bonus: 300k 💎 / 7 days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Application Status Alert */}
            {isApprovedHost ? (
              <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <CheckIcon className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-extrabold text-sm">Congratulations! You are an Official Host</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your {activeBadgeType === 'alpha' ? 'Alpha Host' : 'Aurora Host'} badge is active. Your 7-day performance bonus cycle is running!
                  </p>
                  <button
                    onClick={() => setActiveTab('bonus')}
                    className="mt-2.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <SparkleIcon className="w-3.5 h-3.5" /> View Active Bonus Progress →
                  </button>
                </div>
              </div>
            ) : isPending ? (
              <div className="rounded-2xl p-4 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <HourglassIcon className="w-6 h-6 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm">Application Under Review</h3>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your application for {latestApp?.hostType === 'alpha' ? 'Alpha Host' : 'Aurora Host'} has been received and is being verified by Admin.
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    Submitted on: {new Date(latestApp?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : isRejected ? (
              <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                <WarningIcon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-extrabold text-sm">Application Needs Attention</h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Reason: {latestApp?.rejectionReason || 'Requirements not met at review time.'}
                  </p>
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    You can submit a new application once your 7-day requirements are fully met.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Requirements & Unlock Conditions for Initial Application */}
            <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-sm text-ink">Application Criteria (Past 7 Days)</h3>
                </div>
                {isEligible ? (
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="text-xs font-black text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                    <LockIcon className="w-3.5 h-3.5" /> Locked
                  </span>
                )}
              </div>

              <p className="text-xs text-ink-muted">
                To unlock the application form, you must meet all three requirements within the last 7 days:
              </p>

              {/* Condition 1: Live Time: 14 hours in 7 days */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        criteria?.liveTime?.passed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <ClockIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-ink">Live Time: 14 Hours in 7 Days</h4>
                      <p className="text-[11px] text-ink-muted">Stream for at least 14 total hours</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-black tabular-nums ${
                        criteria?.liveTime?.passed ? 'text-emerald-600' : 'text-ink'
                      }`}
                    >
                      {criteria?.liveTime?.currentHours ?? 0} / 14 hrs
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      criteria?.liveTime?.passed ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${criteria?.liveTime?.percent ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Progress: {criteria?.liveTime?.percent ?? 0}%</span>
                  <span>{criteria?.liveTime?.passed ? '✓ Completed' : 'Pending'}</span>
                </div>
              </div>

              {/* Condition 2: Daily Rules: Live at least 5 days, min 1.5h/day */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        criteria?.dailyRules?.passed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-ink">Daily Rules: Live at Least 5 Days</h4>
                      <p className="text-[11px] text-ink-muted">Stream at least 1.5 hours per day</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-black tabular-nums ${
                        criteria?.dailyRules?.passed ? 'text-emerald-600' : 'text-ink'
                      }`}
                    >
                      {criteria?.dailyRules?.currentDays ?? 0} / 5 Days
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      criteria?.dailyRules?.passed ? 'bg-emerald-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${criteria?.dailyRules?.percent ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Progress: {criteria?.dailyRules?.percent ?? 0}%</span>
                  <span>{criteria?.dailyRules?.passed ? '✓ Completed' : 'Pending'}</span>
                </div>
              </div>

              {/* Condition 3: Gifts: 80,000 Coins in 7 Days */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        criteria?.giftCoins?.passed
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      <GiftIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-ink">Gifts: 80,000 Coins in 7 Days</h4>
                      <p className="text-[11px] text-ink-muted">Earn at least 80k gift coins</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-black tabular-nums ${
                        criteria?.giftCoins?.passed ? 'text-emerald-600' : 'text-ink'
                      }`}
                    >
                      {(criteria?.giftCoins?.currentCoins ?? 0).toLocaleString()} / 80k
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      criteria?.giftCoins?.passed ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${criteria?.giftCoins?.percent ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-muted">
                  <span>Progress: {criteria?.giftCoins?.percent ?? 0}%</span>
                  <span>{criteria?.giftCoins?.passed ? '✓ Completed' : 'Pending'}</span>
                </div>
              </div>
            </div>

            {/* Application Form */}
            {!isApprovedHost && !isPending && (
              <div
                className={`rounded-3xl p-5 shadow-2xs border transition-all ${
                  isEligible
                    ? 'bg-white border-emerald-200 ring-2 ring-emerald-500/20'
                    : 'bg-white/60 border-gray-200 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <SparkleIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="font-extrabold text-sm text-ink">Host Application Form</h3>
                  </div>
                  {!isEligible && (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <LockIcon className="w-3.5 h-3.5" /> Unlocks when requirements are met
                    </span>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Host Type Selection */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Host Type</label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={!isEligible}
                        onClick={() => setHostType('alpha')}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          hostType === 'alpha'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">Alpha Host</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            Male ♂️
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">200k 💎 weekly bonus</p>
                      </button>

                      <button
                        type="button"
                        disabled={!isEligible}
                        onClick={() => setHostType('aurora')}
                        className={`p-3 rounded-2xl text-left border transition-all ${
                          hostType === 'aurora'
                            ? 'bg-pink-50 border-pink-500 text-pink-900 shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">Aurora Host</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">
                            Female ♀️
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">300k 💎 weekly bonus</p>
                      </button>
                    </div>
                  </div>

                  {/* Real Name */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Real Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      disabled={!isEligible}
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      placeholder="Enter your real/official name"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      disabled={!isEligible}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      WhatsApp Number (Optional)
                    </label>
                    <input
                      type="tel"
                      disabled={!isEligible}
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="WhatsApp number (for direct contact)"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Bio & Streaming Experience
                    </label>
                    <textarea
                      rows={2}
                      disabled={!isEligible}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Briefly describe your talents and streaming experience..."
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
                    />
                  </div>

                  {/* Social Link */}
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      Social Media Link (Facebook / Instagram / TikTok)
                    </label>
                    <input
                      type="url"
                      disabled={!isEligible}
                      value={socialLink}
                      onChange={(e) => setSocialLink(e.target.value)}
                      placeholder="https://facebook.com/yourprofile"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!isEligible || submitting}
                    className={`w-full h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                      isEligible
                        ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white hover:brightness-105'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <Loading size="sm" />
                    ) : isEligible ? (
                      <>
                        <SendIcon className="w-4 h-4" />
                        <span>Submit Application</span>
                      </>
                    ) : (
                      <>
                        <LockIcon className="w-4 h-4" />
                        <span>Complete Requirements to Unlock</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
