import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiSealCheckFill as BadgeCheck, PiCarFill as Car, PiFireFill as Flame, PiHeadphonesFill as Headphones, PiCreditCardFill as CreditCard, PiPlusBold as Plus, PiTShirtFill as Shirt, PiSparkleFill as Sparkles, PiTrophyFill as Trophy, PiUserSquareFill as UserSquare2 } from 'react-icons/pi';
import { storeApi, type StoreCategory, type StoreItem } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { CoinIcon } from '../components/ui/CurrencyIcon';
import { compactNumber, initial } from '../lib/time';

/**
 * Store — requirements #45, #46, #47, #48, #49 and #51.
 *
 * All six screens in the documents are the same page with a different category
 * tab, so this is one screen rather than six. The grid, price row and bottom
 * balance bar are shared; only the card body changes for Rare ID.
 *
 * `/store/items` is specified in BACKEND-GUIDE.md §4.0 and not built yet — the
 * grid stays empty with an explicit notice rather than showing invented items.
 */

const CATEGORIES: { key: StoreCategory; label: string; Icon: typeof Flame; tint: string }[] = [
  { key: 'popular', label: 'Popular', Icon: Flame, tint: 'text-[#FF4D4D] bg-[#FFECEC]' },
  { key: 'honor', label: 'Honor', Icon: BadgeCheck, tint: 'text-[#F5A623] bg-[#FFF3E0]' },
  { key: 'rare_id', label: 'Rare ID', Icon: CreditCard, tint: 'text-[#E5342F] bg-[#FFECEC]' },
  { key: 'ride', label: 'Ride', Icon: Car, tint: 'text-[#8B5CF6] bg-[#F3EDFF]' },
  { key: 'profile_card', label: 'Profile Card', Icon: UserSquare2, tint: 'text-[#8B5CF6] bg-[#F3EDFF]' },
  { key: 'avatar_frame', label: 'Avatar Frame', Icon: Sparkles, tint: 'text-[#00BFA5] bg-[#E6FAF6]' },
  { key: 'party_theme', label: 'Party Theme', Icon: Shirt, tint: 'text-[#00BFA5] bg-[#E6FAF6]' },
  { key: 'chat_bubble', label: 'Chat Bubble', Icon: Sparkles, tint: 'text-[#FF6EC7] bg-[#FFECF7]' },
];

const SORTS = [
  { key: 'hot' as const, label: 'Hot Picks' },
  { key: 'latest' as const, label: 'Latest' },
];

/** Ticket icon — the store's second currency. */
const TicketIcon = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block leading-none ${className}`} aria-hidden="true">
    🎟️
  </span>
);

export const Store = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [category, setCategory] = useState<StoreCategory>('popular');
  const [sort, setSort] = useState<'hot' | 'latest'>('hot');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [honorLevel, setHonorLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (category === 'honor') {
        const res = await optional(storeApi.getHonor()).catch(() => null);
        if (cancelled) return;
        if (res?.success && res.data) {
          setHonorLevel(res.data.honorLevel);
          setItems(res.data.items || []);
          setLive(true);
        } else {
          setHonorLevel(null);
          setItems([]);
          setLive(false);
        }
        return;
      }

      const res = await optional(storeApi.getItems({ category, sort })).catch(() => null);
      if (cancelled) return;
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data);
        setLive(true);
      } else {
        setItems([]);
        setLive(false);
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [category, sort]);

  const handleBuy = async (item: StoreItem) => {
    setBuying(item._id);
    try {
      const payWith = item.priceCoins != null ? 'coins' : 'tickets';
      const res = await optional(storeApi.buy(item._id, payWith));
      if (res === null) {
        showToast('The store is not connected yet', 'info');
        return;
      }
      if (res.success) {
        showToast(`${item.name} purchased`, 'success');
      } else {
        showToast(res.error || 'Purchase failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Purchase failed', 'error');
    } finally {
      setBuying(null);
    }
  };

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0],
    [category]
  );

  const isHonor = category === 'honor';

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      <ScreenHeader
        title="Store"
        right={
          <button
            onClick={() => navigate('/rankings?board=rich')}
            aria-label="Ranking"
            className="w-8 h-8 flex items-center justify-center"
          >
            <Trophy className="w-5 h-5 text-role-seller" />
          </button>
        }
      >
        {/* Category strip — icon above label, matching the reference */}
        <div className="flex gap-5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(({ key, label, Icon, tint }) => {
            const active = key === category;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[58px]"
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                    active ? tint : 'bg-surface-sunken text-ink-ghost'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span
                  className={`text-[11px] text-center leading-tight ${
                    active ? 'text-ink font-bold' : 'text-ink-faint'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </ScreenHeader>

      {/* Honor level row (#51.2) */}
      {isHonor && (
        <div className="mx-3 mt-3 rounded-card bg-[#F3EDFF] px-4 py-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
            {initial(user?.nickname)}
          </span>
          <span className="flex-1 font-bold text-ink">
            Honor Level: {honorLevel ?? '—'}
          </span>
          <button className="h-8 px-3.5 rounded-full bg-white text-sm font-semibold text-ink shadow-card">
            Details
          </button>
        </div>
      )}

      {!isHonor && (
        <PillTabs
          tabs={SORTS.map((s) => ({ key: s.key, label: s.label }))}
          active={sort}
          onChange={setSort}
          className="px-4 pt-3"
        />
      )}

      {loading ? (
        <Loading className="pt-16" size="lg" />
      ) : items.length === 0 ? (
        <>
          <EmptyState
            icon={<activeCategory.Icon className="w-6 h-6" />}
            title={live ? `No ${activeCategory.label.toLowerCase()} items yet` : 'Store not connected'}
            hint={
              live
                ? 'Nothing is on sale in this category right now.'
                : undefined
            }
          />
          {!live && <PendingApiNotice section="§4.0" what="Store items" />}
        </>
      ) : isHonor ? (
        /* #51 — honor items are full-width gold rows, not a grid */
        <div className="px-3 pt-3 space-y-2.5">
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => handleBuy(item)}
              disabled={buying === item._id}
              className="w-full flex items-center gap-3 p-3 rounded-card bg-gradient-to-r from-[#FFF8B0] to-[#FFE680] text-left disabled:opacity-60"
            >
              <span className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center overflow-hidden shrink-0">
                {item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles className="w-5 h-5 text-[#B4771A]" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#6B4A0F] text-sm leading-snug">{item.name}</p>
                <p className="text-xs text-[#8B6414] mt-0.5 flex items-center gap-1">
                  <TicketIcon />
                  {(item.priceTickets ?? item.priceCoins ?? 0).toLocaleString()}
                </p>
              </div>
              {item.dailyLimit != null && (
                <span className="text-[11px] text-[#8B6414] shrink-0">
                  Limit: {item.soldToday ?? 0}/{item.dailyLimit}
                </span>
              )}
            </button>
          ))}
          <p className="text-[11px] text-ink-faint text-center pt-1">
            Honor Level {items[0]?.requiredHonorLevel ?? 1} or above to purchase.
          </p>
        </div>
      ) : (
        /* Standard 3-column grid (#45–#49) */
        <div className="grid grid-cols-3 gap-2.5 px-3 pt-3">
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => handleBuy(item)}
              disabled={buying === item._id}
              className="relative bg-white rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <div className="relative aspect-square bg-[#F5F0FF] flex items-center justify-center">
                {item.category === 'rare_id' ? (
                  <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#2A1B05] to-[#4A3410] text-[#FFD277] text-[11px] font-bold">
                    ID:{item.displayId}
                  </span>
                ) : item.image ? (
                  <img src={item.image} alt="" className="w-full h-full object-contain p-2" />
                ) : (
                  <Sparkles className="w-6 h-6 text-ink-ghost" />
                )}

                {item.badge && (
                  <span
                    className={`absolute top-1.5 left-1.5 h-[17px] px-1.5 rounded text-[9px] font-bold text-white flex items-center ${
                      item.badge === 'HOT' ? 'bg-[#FF4D4D]' : 'bg-[#FF6EC7]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.rarity && (
                  <span
                    className={`absolute top-1.5 right-1.5 h-[17px] px-1.5 rounded-full text-[9px] font-bold flex items-center border ${
                      item.rarity === 'SSR'
                        ? 'text-[#FF4D00] border-[#FF4D00]'
                        : 'text-[#F5A623] border-[#F5A623]'
                    }`}
                  >
                    {item.rarity}
                  </span>
                )}
              </div>

              <div className="p-2">
                <p className="text-[12px] font-semibold text-ink truncate">{item.name}</p>
                <p className="text-[12px] text-ink-soft flex items-center gap-1 mt-0.5 tabular-nums">
                  {item.priceCoins != null ? (
                    <>
                      <CoinIcon className="w-3.5 h-3.5 text-coin" />
                      {compactNumber(item.priceCoins)}
                    </>
                  ) : (
                    <>
                      <TicketIcon className="text-[11px]" />
                      {item.priceTickets}
                    </>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fixed balance bar (#45.7) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-line safe-bottom z-30">
        <div className="flex items-center gap-3 px-4 h-14">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink tabular-nums">
            <CoinIcon className="w-5 h-5 text-coin" />
            {compactNumber(user?.coins ?? 0)}
          </span>
          <button
            onClick={() => navigate('/top-up')}
            aria-label="Buy coins"
            className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
          </button>

          <span className="flex items-center gap-1.5 text-sm font-bold text-ink tabular-nums ml-2">
            <TicketIcon />
            {compactNumber((user as any)?.tickets ?? 0)}
          </span>
          <button
            onClick={() => navigate('/top-up')}
            aria-label="Buy tickets"
            className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center"
          >
            <Plus className="w-4 h-4" strokeWidth={3} />
          </button>

          <button
            onClick={() => navigate('/settings')}
            aria-label="Support"
            className="ml-auto w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted"
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
