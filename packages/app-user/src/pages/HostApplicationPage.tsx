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
} from 'react-icons/pi';
import { usersApi } from '../api';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { HostBadge } from '../components/user';

export const HostApplicationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  // Form states
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio] = useState('');
  const [socialLink, setSocialLink] = useState('');
  const [hostType, setHostType] = useState<'alpha' | 'aurora'>(
    user?.gender === 'female' ? 'aurora' : 'alpha'
  );

  const loadEligibility = async () => {
    try {
      setLoading(true);
      const { data } = await usersApi.getHostEligibility();
      if (data.success) {
        setEligibilityData(data.data);
        if (data.data?.targetHostType) {
          setHostType(data.data.targetHostType);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load host requirements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligibility();
  }, []);

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
        loadEligibility();
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
  const isApproved =
    latestApp?.status === 'approved' ||
    user?.hostBadge === 'alpha' ||
    user?.hostBadge === 'aurora';
  const isRejected = latestApp?.status === 'rejected';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
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
            <h1 className="text-base font-extrabold text-ink">Host Application</h1>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
            Alpha & Aurora
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
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
              Unlock prestigious official host privileges, +5% extra revenue share bonus, and distinguished profile crown badges.
            </p>

            {/* Badges preview row */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10">
              {/* Alpha Host (Male) */}
              <div
                onClick={() => !isPending && !isApproved && setHostType('alpha')}
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
                <p className="text-[10px] text-white/60">ছেলেদের জন্য নির্ধারিত</p>
              </div>

              {/* Aurora Host (Female) */}
              <div
                onClick={() => !isPending && !isApproved && setHostType('aurora')}
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
                <p className="text-[10px] text-white/60">মেয়েদের জন্য নির্ধারিত</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Application Status Alert */}
        {isApproved ? (
          <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckIcon className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-sm">Congratulations! You are an Official Host</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your {user?.hostBadge === 'alpha' ? 'Alpha Host' : 'Aurora Host'} badge is active. Continue streaming to retain your verification.
              </p>
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

        {/* Requirements & Unlock Conditions */}
        <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm text-ink">যোগ্যতার শর্তাবলী (7-Day Rules)</h3>
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
            হোস্ট আবেদনের জন্য বিগত ৭ দিনে নিচের তিনটি শর্ত একসাথে পূরণ করতে হবে:
          </p>

          {/* Condition 1: সময়: ৭ দিনে ১৪ ঘন্টা লাইভ */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  criteria?.liveTime?.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <ClockIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">সময়: ৭ দিনে ১৪ ঘন্টা লাইভ</h4>
                  <p className="text-[11px] text-ink-muted">কমপক্ষে ১৪ ঘন্টা লাইভ স্ট্রিম সম্পন্ন করতে হবে</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black tabular-nums ${
                  criteria?.liveTime?.passed ? 'text-emerald-600' : 'text-ink'
                }`}>
                  {criteria?.liveTime?.currentHours ?? 0} / 14 hrs
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  criteria?.liveTime?.passed ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${criteria?.liveTime?.percent ?? 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-muted">
              <span>অগ্রগতি: {criteria?.liveTime?.percent ?? 0}%</span>
              <span>{criteria?.liveTime?.passed ? '✓ শর্ত পূরণ হয়েছে' : 'বাকি আছে'}</span>
            </div>
          </div>

          {/* Condition 2: ডেইলি রুলস: কমপক্ষে ৫ দিন লাইভ করতে হবে, প্রতিদিন ১.৫ ঘন্টা minimum */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  criteria?.dailyRules?.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-100 text-purple-600'
                }`}>
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">ডেইলি রুলস: কমপক্ষে ৫ দিন লাইভ</h4>
                  <p className="text-[11px] text-ink-muted">প্রতিদিন কমপক্ষে ১.৫ ঘন্টা (৯০ মিনিট) স্ট্রিম</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black tabular-nums ${
                  criteria?.dailyRules?.passed ? 'text-emerald-600' : 'text-ink'
                }`}>
                  {criteria?.dailyRules?.currentDays ?? 0} / 5 Days
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  criteria?.dailyRules?.passed ? 'bg-emerald-500' : 'bg-purple-500'
                }`}
                style={{ width: `${criteria?.dailyRules?.percent ?? 0}%` }}
              />
            </div>

            {/* Day by Day breakdown chips */}
            {criteria?.dailyRules?.dailyBreakdown && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-ink-muted mb-1.5">বিগত ৭ দিনের লাইভ রেকর্ড:</p>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {criteria.dailyRules.dailyBreakdown.map((d: any) => (
                    <div
                      key={d.date}
                      className={`shrink-0 px-2 py-1 rounded-xl text-[10px] font-bold border text-center ${
                        d.passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <p className="text-[9px] opacity-75">{d.date.slice(5)}</p>
                      <p className="tabular-nums mt-0.5">{d.hours}h {d.passed ? '✓' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-ink-muted">
              <span>অগ্রগতি: {criteria?.dailyRules?.percent ?? 0}%</span>
              <span>{criteria?.dailyRules?.passed ? '✓ শর্ত পূরণ হয়েছে' : 'বাকি আছে'}</span>
            </div>
          </div>

          {/* Condition 3: গিফট: ৭ দিনে ৮০,০০০ কয়েন রিসিভ করতে হবে */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  criteria?.giftCoins?.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <GiftIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">গিফট: ৭ দিনে ৮০,০০০ কয়েন</h4>
                  <p className="text-[11px] text-ink-muted">স্ট্রিম ও পার্টি থেকে ৮০k কয়েন গিফট অর্জন</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs font-black tabular-nums ${
                  criteria?.giftCoins?.passed ? 'text-emerald-600' : 'text-ink'
                }`}>
                  {(criteria?.giftCoins?.currentCoins ?? 0).toLocaleString()} / 80k
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  criteria?.giftCoins?.passed ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${criteria?.giftCoins?.percent ?? 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-muted">
              <span>অগ্রগতি: {criteria?.giftCoins?.percent ?? 0}%</span>
              <span>{criteria?.giftCoins?.passed ? '✓ শর্ত পূরণ হয়েছে' : 'বাকি আছে'}</span>
            </div>
          </div>
        </div>

        {/* Application Form — Unlocks ONLY when all criteria pass and user is not already pending/approved */}
        {!isApproved && !isPending && (
          <div className={`rounded-3xl p-5 shadow-2xs border transition-all ${
            isEligible
              ? 'bg-white border-emerald-200 ring-2 ring-emerald-500/20'
              : 'bg-white/60 border-gray-200 opacity-80'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SparkleIcon className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-ink">আবেদন ফর্ম (Host Form)</h3>
              </div>
              {!isEligible && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <LockIcon className="w-3.5 h-3.5" /> শর্ত পূরণ হলে আনলক হবে
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Host Type Selection */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  আবেদনের ধরণ (Host Type)
                </label>
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
                        ছেলেদের ♂️
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Royal Blue Crown Badge</p>
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
                        মেয়েদের ♀️
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Radiant Pink Diamond Badge</p>
                  </button>
                </div>
              </div>

              {/* Real Name */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  আসল নাম (Real Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={!isEligible}
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="আপনার এনআইডি/আসল নাম লিখুন"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  required
                />
              </div>

              {/* Phone / Contact */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  মোবাইল নম্বর (Phone Number) <span className="text-rose-500">*</span>
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
                  হোয়াটসঅ্যাপ নম্বর (WhatsApp - ঐচ্ছিক)
                </label>
                <input
                  type="tel"
                  disabled={!isEligible}
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="WhatsApp নম্বর (জরুরি যোগাযোগের জন্য)"
                  className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                />
              </div>

              {/* Bio / Talents */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  আপনার সম্পর্কে / প্রতিভা (Bio & Streaming Experience)
                </label>
                <textarea
                  rows={2}
                  disabled={!isEligible}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="গান, আড্ডা, কমেডি ইত্যাদি আপনার স্ট্রিমিং অভিজ্ঞতা সংক্ষেপে লিখুন..."
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 resize-none"
                />
              </div>

              {/* Social Media Link */}
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  সোশ্যাল মিডিয়া প্রোফাইল লিংক (Facebook/Instagram/TikTok)
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
                    <span>আবেদন জমা দিন (Submit Application)</span>
                  </>
                ) : (
                  <>
                    <LockIcon className="w-4 h-4" />
                    <span>শর্ত পূরণ করে আনলক করুন</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
