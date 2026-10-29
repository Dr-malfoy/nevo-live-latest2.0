import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiCheckCircleFill as CheckIcon,
  PiClockFill as ClockIcon,
  PiHourglassFill as HourglassIcon,
  PiWarningCircleFill as WarningIcon,
  PiPaperPlaneRightFill as SendIcon,
  PiArrowsClockwiseBold as RefreshIcon,
  PiShieldCheckFill as ShieldIcon,
  PiLockKeyFill as LockIcon,
  PiSparkleFill as SparkleIcon,
  PiWalletFill as WalletIcon,
} from 'react-icons/pi';
import { IoDiamond } from 'react-icons/io5';
import { diamondSellerApi, type DiamondSellerEligibility } from '../api/diamondSeller.api';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { SellerBadge } from '../components/user/SellerBadge';

export const DiamondSellerApply = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [eligibility, setEligibility] = useState<DiamondSellerEligibility | null>(null);

  // Form states
  const [realName, setRealName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [bkash, setBkash] = useState(user?.paymentInfo?.bkash?.number || '');
  const [nagad, setNagad] = useState(user?.paymentInfo?.nagad?.number || '');
  const [rocket, setRocket] = useState(user?.paymentInfo?.rocket?.number || '');
  const [binance, setBinance] = useState(user?.paymentInfo?.binance?.walletAddress || '');
  const [bybit, setBybit] = useState(user?.paymentInfo?.bybit?.walletAddress || '');

  const loadEligibility = async () => {
    try {
      const { data } = await diamondSellerApi.getEligibility();
      if (data.success && data.data) {
        setEligibility(data.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to load eligibility details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEligibility();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEligibility();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realName.trim()) {
      showToast('Please enter your real legal name', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Please enter your contact phone number', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await diamondSellerApi.submitApplication({
        realName: realName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethods: {
          bkash: bkash.trim() || undefined,
          nagad: nagad.trim() || undefined,
          rocket: rocket.trim() || undefined,
          binance: binance.trim() || undefined,
          bybit: bybit.trim() || undefined,
        },
      });

      if (data.success) {
        showToast('Application submitted successfully! Admin will review shortly.', 'success');
        await loadEligibility();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loading size="lg" />
        <p className="text-xs text-slate-500 font-semibold mt-2">Checking Diamond Seller requirements...</p>
      </div>
    );
  }

  const currentDiamonds = eligibility?.currentDiamonds ?? (user?.diamonds || 0);
  const requiredDiamonds = eligibility?.requiredDiamonds || 5000000;
  const progressPercent = eligibility?.progressPercent ?? Math.min(100, Math.round((currentDiamonds / requiredDiamonds) * 100));
  const isEligible = eligibility?.isEligible ?? (currentDiamonds >= requiredDiamonds);
  const isDiamondSeller = eligibility?.isDiamondSeller || user?.sellerType === 'diamond_seller' || user?.role === 'diamond_seller';
  const hasPending = eligibility?.hasPendingApplication;
  const latestApp = eligibility?.latestApplication;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans select-none">
      {/* ── Sticky Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight flex items-center gap-1.5">
              <span>Diamond Seller Application</span>
              <IoDiamond className="w-4 h-4 text-cyan-500" />
            </h1>
            <p className="text-[11px] font-medium text-slate-500">Official Certified Seller Program</p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-all active:scale-95"
          title="Refresh"
        >
          <RefreshIcon className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
        </button>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* ── Hero Banner ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 p-5 text-white shadow-xl border border-cyan-500/30">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-black tracking-wide uppercase mb-2">
                <SparkleIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Certified Merchant</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">Become a Diamond Seller</h2>
              <p className="text-xs text-cyan-100/80 mt-1 leading-relaxed">
                Hold 5,000,000+ diamonds to unlock the official Diamond Seller badge and list your accounts directly on the platform wallet recharge gateway!
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
              <IoDiamond className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </div>
          </div>

          {/* Progress to 5,000,000 */}
          <div className="mt-5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
              <span className="text-cyan-200">Required Diamonds</span>
              <span className="font-extrabold text-white">
                {currentDiamonds.toLocaleString()} / {requiredDiamonds.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-200 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1.5 text-cyan-300/80">
              <span>Progress: {progressPercent}%</span>
              <span>{isEligible ? '✅ Target Met' : `${(requiredDiamonds - currentDiamonds).toLocaleString()} diamonds needed`}</span>
            </div>
          </div>
        </div>

        {/* ── Status View 1: Already an Approved Diamond Seller ────────── */}
        {isDiamondSeller && (
          <div className="p-5 rounded-3xl bg-white border border-cyan-200 shadow-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                <ShieldIcon className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>Certified Diamond Seller</span>
                  <SellerBadge sellerType="diamond_seller" showLabel={true} />
                </h3>
                <p className="text-xs text-slate-500 font-medium">Your Diamond Seller badge is active on your profile and ID!</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 text-xs text-cyan-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-cyan-600" />
                Active in Platform Wallet Gateway
              </p>
              <p className="text-cyan-700 leading-relaxed text-[11px]">
                Users purchasing diamonds via the Recharge page will see your payment accounts and can directly contact you.
              </p>
            </div>
          </div>
        )}

        {/* ── Status View 2: Application is Currently Pending ─────────── */}
        {!isDiamondSeller && hasPending && (
          <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-md space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <HourglassIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Application Under Review</h3>
                <p className="text-xs text-slate-500 font-medium">Your request is currently awaiting admin verification</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-700">Verified Balance Snapshot:</span>
                <span className="font-black text-amber-900">{latestApp?.diamondsAtApplication?.toLocaleString()} 💎</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-700">Applicant:</span>
                <span className="font-bold text-amber-900">{latestApp?.realName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-700">Contact:</span>
                <span className="font-mono text-amber-900">{latestApp?.phone}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center font-medium">
              You will receive an in-app notification as soon as the Admin team reviews your application.
            </p>
          </div>
        )}

        {/* ── Status View 3: Rejected Previously ──────────────────────── */}
        {!isDiamondSeller && !hasPending && latestApp?.status === 'rejected' && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <WarningIcon className="w-4 h-4 text-rose-600" />
              <span>Previous Application Rejected</span>
            </div>
            <p className="text-rose-700 text-[11px]">
              Reason: {latestApp?.rejectionReason || 'Requirements not met or profile incomplete.'}
            </p>
            {isEligible && (
              <p className="text-emerald-700 font-bold text-[11px] pt-1">
                You meet the 5,000,000 diamonds requirement. You may update your info and submit again below.
              </p>
            )}
          </div>
        )}

        {/* ── Status View 4: Not Eligible (< 5,000,000 diamonds) ───────── */}
        {!isDiamondSeller && !hasPending && !isEligible && (
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <LockIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">5,000,000 Diamonds Balance Required</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Only accounts holding a minimum balance of 5,000,000 diamonds can apply to become verified Diamond Sellers.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Your Current Balance</span>
                <span className="text-base font-extrabold text-slate-900">{currentDiamonds.toLocaleString()} 💎</span>
              </div>
              <button
                onClick={() => navigate('/recharge')}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-xs"
              >
                Recharge Diamonds
              </button>
            </div>
          </div>
        )}

        {/* ── Status View 5: Application Form (Eligible & Not Pending) ──── */}
        {!isDiamondSeller && !hasPending && isEligible && (
          <form onSubmit={handleSubmit} className="p-5 rounded-3xl bg-white border border-cyan-200 shadow-md space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-emerald-500" />
                <span>You Are Eligible to Apply!</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in your legal and contact details to request your Diamond Seller role and badge.
              </p>
            </div>

            {/* Real Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Real / Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter your full name"
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Contact Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +88017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +88018XXXXXXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              />
            </div>

            {/* Payment Methods Section */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <WalletIcon className="w-3.5 h-3.5 text-cyan-600" />
                <span>Your Payment Accounts (For Diamond Buyers):</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                These accounts will be shown to users who purchase diamonds from you in the recharge wallet.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="bKash Personal / Merchant Number"
                  value={bkash}
                  onChange={(e) => setBkash(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Nagad Number"
                  value={nagad}
                  onChange={(e) => setNagad(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Rocket Number"
                  value={rocket}
                  onChange={(e) => setRocket(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Binance BEP20 Address / Pay ID"
                  value={binance}
                  onChange={(e) => setBinance(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Bybit TRC20 Address"
                  value={bybit}
                  onChange={(e) => setBybit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Note for Admin <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Active hours, service regions, or past experience..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-500 hover:from-cyan-700 hover:to-sky-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <SendIcon className="w-4 h-4" />
              <span>{submitting ? 'Submitting Application...' : 'Submit Application for Review'}</span>
            </button>
          </form>
        )}

        {/* ── Perks & Terms Card ──────────────────────────────────────── */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2.5 text-xs">
          <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <SparkleIcon className="w-4 h-4 text-cyan-500" />
            <span>Diamond Seller Privileges</span>
          </h4>
          <ul className="space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">✓</span>
              <span>Exclusive <strong>DIAMOND SELLER</strong> badge displayed on your ID and profile.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">✓</span>
              <span>Featured on the <strong>Wallet & Recharge</strong> agent gateway for users buying diamonds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 font-bold">✓</span>
              <span>Role upgraded to certified <strong>Diamond Seller</strong> with agent transfer privileges.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
