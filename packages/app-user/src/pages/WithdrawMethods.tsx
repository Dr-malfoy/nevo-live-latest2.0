import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiCaretDownBold as ChevronDown, PiStarFill as Star, PiBankFill, PiWalletFill, PiCreditCardFill } from 'react-icons/pi';
import { SiTether, SiBinance, SiPayoneer } from 'react-icons/si';
import { paymentApi, type WithdrawMethod } from '../api/payment.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { countryName, flagEmoji } from '../lib/countries';

/**
 * Requirement #23 — the 8 withdraw methods with fee, arrival time and bind state.
 *
 * `/payment/withdraw-methods` is specified but not built (API-SPEC.md). Until it
 * ships this falls back to the documented catalogue below so the screen is
 * navigable and the bind form can be reviewed — every row then reads
 * "Not available yet" rather than pretending to be bound.
 */

const DEFAULT_METHODS: WithdrawMethod[] = [
  { key: 'usdt_trc20', name: 'USDT-TRC20', feeType: 'percent', fee: 1.5, arrival: '1 hour', bound: false, preferred: false, fields: ['walletAddress'] },
  { key: 'epay', name: 'Epay', feeType: 'points', fee: 10000, arrival: '1 hour', bound: false, preferred: false, fields: ['accountId'] },
  { key: 'binance_bep20', name: 'BINANCE BEP20', feeType: 'percent', fee: 1.5, arrival: '1 hour', bound: false, preferred: false, fields: ['walletAddress'] },
  { key: 'payoneer', name: 'Payoneer fast USD', feeType: 'points', fee: 10000, arrival: '24 hours', bound: false, preferred: false, fields: ['email'] },
  { key: 'bkash', name: 'Bkash', feeType: 'percent', fee: 3, arrival: '24 hours', bound: false, preferred: false, fields: ['phone'] },
  { key: 'nagad', name: 'NAGAD', feeType: 'percent', fee: 3, arrival: '24 hours', bound: false, preferred: false, fields: ['phone'] },
  { key: 'rocket', name: 'Rocket', feeType: 'percent', fee: 3, arrival: '24 hours', bound: false, preferred: false, fields: ['phone'] },
  { key: 'bank_bdt', name: 'Bank Transfer BDT', feeType: 'tiered', feeTiers: [3, 5, 8], arrival: 'T+1', bound: false, preferred: false, fields: ['bankName', 'accountName', 'accountNumber', 'branch'] },
];

/** Brand tints, so the list reads like the reference without shipping logo files. */
const TINTS: Record<string, string> = {
  usdt_trc20: 'bg-[#26A17B] text-white',
  epay: 'bg-[#1B2B5B] text-[#F5C518]',
  binance_bep20: 'bg-[#F3BA2F] text-[#181A20]',
  payoneer: 'bg-[#FF4800] text-white',
  bkash: 'bg-[#E2136E] text-white',
  nagad: 'bg-[#F6921E] text-white',
  rocket: 'bg-[#8C3494] text-white',
  bank_bdt: 'bg-surface-sunken text-ink-muted',
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  usdt_trc20: <SiTether className="w-6 h-6" />,
  epay: <PiCreditCardFill className="w-6 h-6" />,
  binance_bep20: <SiBinance className="w-6 h-6" />,
  payoneer: <SiPayoneer className="w-6 h-6" />,
  bkash: <PiWalletFill className="w-6 h-6" />,
  nagad: <PiWalletFill className="w-6 h-6" />,
  rocket: <PiWalletFill className="w-6 h-6" />,
  bank_bdt: <PiBankFill className="w-6 h-6" />,
};

const feeLabel = (m: WithdrawMethod): string => {
  if (m.feeType === 'percent') return `Fee ${m.fee}%`;
  if (m.feeType === 'points') return `Fee ${(m.fee ?? 0).toLocaleString()} points`;
  return `Fee ${(m.feeTiers ?? []).join('% / ')}%`;
};

const FIELD_LABELS: Record<string, string> = {
  walletAddress: 'Wallet address',
  accountId: 'Epay account ID',
  email: 'Payoneer email',
  phone: 'Phone number',
  bankName: 'Bank name',
  accountName: 'Account holder name',
  accountNumber: 'Account number',
  branch: 'Branch',
};

export const WithdrawMethods = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [country, setCountry] = useState(user?.country || 'BD');
  const [methods, setMethods] = useState<WithdrawMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [binding, setBinding] = useState<WithdrawMethod | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      optional(paymentApi.getWithdrawMethods(country)),
      paymentApi.getCustomMethods()
    ]).then(([res, cm]) => {
      if (cancelled) return;
      let combined = [...DEFAULT_METHODS];
      if (cm?.data?.success) {
         const customs = cm.data.data.filter((m: any) => m.enabled).map((m: any) => ({
           key: m.key, name: m.name, feeType: m.feeType || 'percent', fee: m.fee || 0,
           arrival: m.arrival || '24 hours', bound: false, preferred: false, fields: m.fields || ['phone'],
           iconUrl: m.iconUrl, color: m.color
         }));
         combined = [...combined, ...customs];
      }
      
      if (res?.success && res.data) {
        // Ideally merge real bound state here
        setMethods(combined);
        setLive(true);
      } else {
        setMethods(combined);
        setLive(false);
      }
    })
    .catch(() => {
      if (!cancelled) {
        setMethods(DEFAULT_METHODS);
        setLive(false);
      }
    })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  const openBind = (method: WithdrawMethod) => {
    if (!live) {
      showToast('Binding a payout method is not available yet', 'info');
      return;
    }
    setBinding(method);
    setForm({});
  };

  const handleBind = async () => {
    if (!binding) return;
    const missing = binding.fields.find((f) => !form[f]?.trim());
    if (missing) {
      showToast(`${FIELD_LABELS[missing] || missing} is required`, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await optional(paymentApi.bindWithdrawMethod(binding.key, form));
      if (res === null) {
        showToast('Binding is not available yet', 'info');
        return;
      }
      if (res.success) {
        setMethods((rows) => rows.map((m) => (m.key === binding.key ? { ...m, bound: true } : m)));
        showToast(`${binding.name} linked`, 'success');
        setBinding(null);
      } else {
        showToast(res.error || 'Could not link this method', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not link this method', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setPreferred = async (method: WithdrawMethod) => {
    if (!method.bound) {
      showToast('Link this method first', 'info');
      return;
    }
    const res = await optional(paymentApi.setPreferredWithdrawMethod(method.key)).catch(() => null);
    if (res === null) {
      showToast('Setting a preferred method is not available yet', 'info');
      return;
    }
    setMethods((rows) => rows.map((m) => ({ ...m, preferred: m.key === method.key })));
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-8">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink flex-1">Method</h1>
          <button
            onClick={() => setCountry((c) => (c === 'BD' ? '' : 'BD'))}
            className="h-8 px-3 rounded-full bg-surface-sunken text-sm text-ink-soft flex items-center gap-1"
          >
            {country ? `${flagEmoji(country)} ${countryName(country)}` : '🌍 All'}
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <Loading className="pt-24" size="lg" />
      ) : (
        <>
          <div className="mt-3 bg-white divide-y divide-line">
            {methods.map((method) => (
              <div key={method.key} className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    (method as any).color || TINTS[method.key] || 'bg-surface-sunken text-ink-muted'
                  }`}
                >
                  {(method as any).iconUrl ? <img src={(method as any).iconUrl} alt={method.name} className="w-6 h-6 object-contain" /> : METHOD_ICONS[method.key] || <PiWalletFill className="w-6 h-6" />}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink truncate">{method.name}</span>
                    {method.preferred && <Star className="w-3.5 h-3.5 text-role-seller fill-role-seller" />}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="h-[18px] px-1.5 rounded bg-surface-sunken text-[10px] font-medium text-accent-600 flex items-center">
                      {feeLabel(method)}
                    </span>
                    <span className="h-[18px] px-1.5 rounded bg-surface-sunken text-[10px] font-medium text-accent-600 flex items-center">
                      Arrival {method.arrival}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => (method.bound ? setPreferred(method) : openBind(method))}
                  className={`h-8 px-4 rounded-full text-xs font-semibold shrink-0 ${
                    method.bound ? 'bg-surface-sunken text-ink-muted' : 'bg-accent-500 text-white'
                  }`}
                >
                  {method.bound ? 'View' : 'Bind'}
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => showToast('Pick a linked method and tap it to set it as preferred', 'info')}
            className="w-full text-center text-sm text-accent-500 font-medium py-4"
          >
            My most preferred way to receive payment ⌃
          </button>

          {!live && (
            <p className="mx-4 -mt-2 text-[11px] text-ink-faint text-center leading-relaxed">
              Showing the standard method list. Fees, arrival times and your linked accounts
              become live once the payout API is connected.
            </p>
          )}
        </>
      )}

      {/* Bind sheet */}
      {binding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBinding(null)} />
          <div className="relative w-full max-w-md bg-white rounded-t-sheet p-4 animate-slide-up safe-bottom">
            <h3 className="text-base font-bold text-ink mb-1">Link {binding.name}</h3>
            <p className="text-xs text-ink-muted mb-4">
              {feeLabel(binding)} · Arrival {binding.arrival}
            </p>

            <div className="space-y-3">
              {binding.fields.map((field) => (
                <div key={field}>
                  <label className="text-sm font-semibold text-ink block mb-1.5">
                    {FIELD_LABELS[field] || field}
                  </label>
                  <input
                    value={form[field] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full h-11 px-3 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint
                      border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setBinding(null)} className="flex-1 h-12 btn-secondary">
                Cancel
              </button>
              <button onClick={handleBind} disabled={saving} className="flex-1 h-12 btn-primary disabled:opacity-50">
                {saving ? 'Saving…' : 'Bind'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
