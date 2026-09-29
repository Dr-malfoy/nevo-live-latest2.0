import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PiBackspaceFill as Delete, PiLockFill as Lock, PiShieldCheckFill as ShieldCheck } from 'react-icons/pi';
import { securityApi, type AssetPasswordState } from '../api/economy.api';
import { optional } from '../api/pending';
import { useUIStore } from '../stores';
import { ScreenHeader, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';

/**
 * Asset password — requirement #6.
 *
 * Four digits, required before any withdrawal, point transfer or rare-ID
 * purchase. Three wrong attempts lock the account for 30 minutes.
 *
 * The lock is enforced **server-side** (BACKEND-GUIDE.md §4.2) — the countdown
 * here only tells the user what's happening. A client-side lock would be
 * bypassed by reopening the app, so this screen never decides the outcome.
 */

type Mode = 'set' | 'verify' | 'change' | 'reset';

const LENGTH = 4;

/** Set → confirm; change → current, new, confirm. */
const STEP_LABEL: Record<string, { title: string; hint: string }> = {
  set: { title: 'Set your asset password', hint: 'Choose 4 digits you will remember.' },
  set_confirm: { title: 'Confirm your asset password', hint: 'Enter the same 4 digits again.' },
  verify: { title: 'Enter your asset password', hint: 'Required before money leaves your account.' },
  change_current: { title: 'Enter your current password', hint: '' },
  change_new: { title: 'Enter a new password', hint: 'Choose 4 digits you will remember.' },
  change_confirm: { title: 'Confirm your new password', hint: 'Enter the same 4 digits again.' },
};

export const AssetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const showToast = useUIStore((s) => s.showToast);

  const requestedMode = (params.get('mode') as Mode) || 'verify';
  const returnTo = params.get('returnTo');

  const [state, setState] = useState<AssetPasswordState | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<string>('verify');
  const [digits, setDigits] = useState('');
  const [firstEntry, setFirstEntry] = useState('');
  const [currentEntry, setCurrentEntry] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    optional(securityApi.getAssetPasswordState())
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? null;
        setState(data);

        // Someone with no password set can only set one, whatever was asked for.
        if (data && !data.isSet) setStep('set');
        else if (requestedMode === 'change') setStep('change_current');
        else if (requestedMode === 'set') setStep(data?.isSet ? 'change_current' : 'set');
        else setStep('verify');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedMode]);

  // Tick only while a lock is actually counting down.
  const lockedUntil = state?.lockedUntil ? new Date(state.lockedUntil).getTime() : 0;
  const isLocked = lockedUntil > now;

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const lockRemaining = useMemo(() => {
    if (!isLocked) return '';
    const total = Math.ceil((lockedUntil - now) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }, [isLocked, lockedUntil, now]);

  const finish = (message: string) => {
    showToast(message, 'success');
    if (returnTo) navigate(returnTo, { replace: true });
    else navigate(-1);
  };

  const submit = async (value: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);

    try {
      /* ── Set ──────────────────────────────────────────────────── */
      if (step === 'set') {
        setFirstEntry(value);
        setDigits('');
        setStep('set_confirm');
        return;
      }

      if (step === 'set_confirm') {
        if (value !== firstEntry) {
          showToast("Those didn't match — start again", 'error');
          setFirstEntry('');
          setDigits('');
          setStep('set');
          return;
        }
        const res = await optional(securityApi.setAssetPassword(value));
        if (res === null) {
          showToast('Asset password is not available yet', 'info');
          return;
        }
        if (res.success) finish('Asset password set');
        else showToast(res.error || 'Could not set the password', 'error');
        return;
      }

      /* ── Change ───────────────────────────────────────────────── */
      if (step === 'change_current') {
        setCurrentEntry(value);
        setDigits('');
        setStep('change_new');
        return;
      }

      if (step === 'change_new') {
        setFirstEntry(value);
        setDigits('');
        setStep('change_confirm');
        return;
      }

      if (step === 'change_confirm') {
        if (value !== firstEntry) {
          showToast("Those didn't match — start again", 'error');
          setFirstEntry('');
          setDigits('');
          setStep('change_new');
          return;
        }
        const res = await optional(securityApi.changeAssetPassword(currentEntry, value));
        if (res === null) {
          showToast('Asset password is not available yet', 'info');
          return;
        }
        if (res.success) finish('Asset password changed');
        else showToast(res.error || 'Could not change the password', 'error');
        return;
      }

      /* ── Verify ───────────────────────────────────────────────── */
      const res = await optional(securityApi.verifyAssetPassword(value));
      if (res === null) {
        showToast('Asset password is not available yet', 'info');
        return;
      }
      if (res.success && res.data?.token) {
        // Short-lived; every value-moving call re-sends it and the server re-checks.
        sessionStorage.setItem('asset-token', res.data.token);
        finish('Verified');
      } else {
        showToast(res.error || 'Wrong password', 'error');
        setState((prev) =>
          prev ? { ...prev, failCount: (prev.failCount ?? 0) + 1 } : prev
        );
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      setDigits('');
      setBusy(false);
      submittingRef.current = false;
    }
  };

  const press = (digit: string) => {
    if (isLocked || busy) return;
    const next = (digits + digit).slice(0, LENGTH);
    setDigits(next);
    if (next.length === LENGTH) submit(next);
  };

  const backspace = () => setDigits((d) => d.slice(0, -1));

  const copy = STEP_LABEL[step] ?? STEP_LABEL.verify;
  const attemptsLeft = 3 - (state?.failCount ?? 0);

  return (
    <div className="min-h-screen bg-white">
      <ScreenHeader title="Security Password" />

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <div className="px-6 pt-6">
          <div className="flex flex-col items-center text-center">
            <span className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center text-ink">
              {isLocked ? <Lock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </span>
            <h2 className="text-lg font-bold text-ink mt-4">
              {isLocked ? 'Temporarily locked' : copy.title}
            </h2>
            <p className="text-sm text-ink-muted mt-1 leading-relaxed">
              {isLocked
                ? `Too many wrong attempts. Try again in ${lockRemaining}.`
                : copy.hint}
            </p>
          </div>

          {/* Digit boxes */}
          <div className="flex justify-center gap-3 mt-8">
            {Array.from({ length: LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
                  i < digits.length ? 'border-ink bg-surface-sunken text-ink' : 'border-line'
                }`}
              >
                {i < digits.length ? '•' : ''}
              </span>
            ))}
          </div>

          {!isLocked && step === 'verify' && attemptsLeft < 3 && attemptsLeft > 0 && (
            <p className="text-center text-sm text-role-host mt-3">
              {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left before a 30-minute lock
            </p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                onClick={() => press(d)}
                disabled={isLocked || busy}
                className="h-14 rounded-xl bg-surface-sunken text-2xl font-semibold text-ink active:bg-line-strong disabled:opacity-40"
              >
                {d}
              </button>
            ))}
            <span />
            <button
              onClick={() => press('0')}
              disabled={isLocked || busy}
              className="h-14 rounded-xl bg-surface-sunken text-2xl font-semibold text-ink active:bg-line-strong disabled:opacity-40"
            >
              0
            </button>
            <button
              onClick={backspace}
              disabled={isLocked || busy}
              aria-label="Delete"
              className="h-14 rounded-xl flex items-center justify-center text-ink-muted active:bg-surface-sunken disabled:opacity-40"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {step === 'verify' && (
            <button
              onClick={() => navigate('/asset-password/reset')}
              className="w-full text-center text-sm font-semibold text-accent-500 mt-8"
            >
              Forgot your password?
            </button>
          )}

          {!state && <PendingApiNotice section="§4.2" what="The asset password" />}

          <p className="text-[11px] text-ink-faint text-center mt-6 leading-relaxed">
            Resetting requires email OTP, phone OTP and your NID if one is on file.
          </p>
        </div>
      )}
    </div>
  );
};
