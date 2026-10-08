import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PiSealCheckFill as BadgeCheck,
  PiCarFill as Car,
  PiFireFill as Flame,
  PiHeadphonesFill as Headphones,
  PiCreditCardFill as CreditCard,
  PiPlusBold as Plus,
  PiTShirtFill as Shirt,
  PiSparkleFill as Sparkles,
  PiTrophyFill as Trophy,
  PiUserSquareFill as UserSquare2,
  PiMedalFill as Medal,
  PiXBold as CloseIcon,
  PiCheckBold as CheckIcon,
  PiCrownFill as Crown,
  PiBackpackFill as BackpackIcon,
} from 'react-icons/pi';
import { storeApi, type StoreCategory, type StoreItem } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, PillTabs, EmptyState, PendingApiNotice } from '../components/common';
import { Loading } from '../components/ui';
import { CoinIcon, DiamondIcon } from '../components/ui/CurrencyIcon';
import { EquippedBadge } from '../components/user';
import { compactNumber, initial } from '../lib/time';

const CATEGORIES: { key: StoreCategory; label: string; Icon: any; tint: string }[] = [
  { key: 'badge', label: 'Badges', Icon: Medal, tint: 'text-[#F59E0B] bg-[#FFFBEB]' },
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

/** Ticket icon — optional legacy currency. */
const TicketIcon = ({ className = '' }: { className?: string }) => (
  <span className={`inline-block leading-none ${className}`} aria-hidden="true">
    🎟️
  </span>
);

export const Store = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const showToast = useUIStore((s) => s.showToast);

  const initialCategory = (searchParams.get('category') as StoreCategory) || 'badge';
  const [category, setCategory] = useState<StoreCategory>(initialCategory);
  const [sort, setSort] = useState<'hot' | 'latest'>('hot');
  const [items, setItems] = useState<StoreItem[]>([]);
  const [honorLevel, setHonorLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  // Selected item modal for choosing payment method (Coin / Diamond)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);

  useEffect(() => {
    const catFromParam = searchParams.get('category') as StoreCategory;
    if (catFromParam && CATEGORIES.some((c) => c.key === catFromParam) && catFromParam !== category) {
      setCategory(catFromParam);
    }
  }, [searchParams]);

  const handleSelectCategory = (cat: StoreCategory) => {
    setCategory(cat);
    setSearchParams({ category: cat });
  };

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

  const openPurchaseModal = (item: StoreItem) => {
    setSelectedItem(item);
  };

  const handleConfirmBuy = async (item: StoreItem, payWith: 'coins' | 'diamonds' | 'tickets') => {
    setBuying(item._id);
    try {
      const res = await optional(storeApi.buy(item._id, payWith));
      if (res === null) {
        showToast('The store is not connected yet', 'info');
        return;
      }
      if (res.success) {
        showToast(`${item.name} purchased & equipped!`, 'success');
        setSelectedItem(null);
        await fetchProfile().catch(() => {});
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
  const isBadge = category === 'badge';

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      <ScreenHeader
        title="Store"
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/bag')}
              aria-label="My Bag"
              title="My Bag"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 active:scale-95 transition-transform"
            >
              <BackpackIcon className="w-4 h-4 text-indigo-600" />
              <span>Bag</span>
            </button>
            <button
              onClick={() => navigate('/rankings?board=rich')}
              aria-label="Ranking"
              className="w-8 h-8 flex items-center justify-center"
            >
              <Trophy className="w-5 h-5 text-role-seller" />
            </button>
          </div>
        }
      >
        {/* Category strip — icon above label */}
        <div className="flex gap-5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(({ key, label, Icon, tint }) => {
            const active = key === category;
            return (
              <button
                key={key}
                onClick={() => handleSelectCategory(key)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[58px] active:scale-95 transition-transform"
              >
                <span
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                    active ? tint + ' ring-2 ring-amber-400/50 shadow-sm' : 'bg-surface-sunken text-ink-ghost'
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

      {/* Honor level row */}
      {isHonor && (
        <div className="mx-3 mt-3 rounded-card bg-[#F3EDFF] px-4 py-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
            {initial(user?.nickname)}
          </span>
          <span className="flex-1 font-bold text-ink">
            Level: {honorLevel ?? '—'}
          </span>
          <button className="h-8 px-3.5 rounded-full bg-white text-sm font-semibold text-ink shadow-card">
            Details
          </button>
        </div>
      )}

      {/* Badge Banner Header */}
      {isBadge && (
        <div className="mx-3 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white shadow-md">
              <Medal className="w-6 h-6" />
            </span>
            <div>
              <p className="text-xs font-black text-ink tracking-tight">Nameplate Badge Store</p>
              <p className="text-[11px] text-ink-muted">Buy and wear exclusive badges beside your name!</p>
            </div>
          </div>
          {user?.equippedBadge && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] text-ink-muted font-semibold">Currently Equipped:</span>
              <EquippedBadge badge={user.equippedBadge} size="sm" />
            </div>
          )}
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
        /* Honor items */
        <div className="px-3 pt-3 space-y-2.5">
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => openPurchaseModal(item)}
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
            Level {items[0]?.requiredHonorLevel ?? 1} or above to purchase.
          </p>
        </div>
      ) : (
        /* Standard 3-column grid */
        <div className="grid grid-cols-3 gap-2.5 px-3 pt-3">
          {items.map((item) => {
            const isEmoji = item.image && !item.image.startsWith('http') && !item.image.startsWith('data:');
            const isItemEquipped = user?.equippedBadge?._id === item._id || user?.equippedBadge?.name === item.name;

            return (
              <button
                key={item._id}
                onClick={() => openPurchaseModal(item)}
                disabled={buying === item._id}
                className={`relative bg-white rounded-card overflow-hidden text-left active:scale-[0.98] transition-transform disabled:opacity-60 border ${
                  isItemEquipped ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-line/60'
                }`}
              >
                <div className="relative aspect-square bg-[#F5F0FF] flex items-center justify-center p-2">
                  {item.category === 'rare_id' ? (
                    <span className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#2A1B05] to-[#4A3410] text-[#FFD277] text-[11px] font-bold">
                      ID:{item.displayId}
                    </span>
                  ) : item.category === 'badge' ? (
                    <div className="scale-110 flex items-center justify-center">
                      <EquippedBadge
                        badge={{
                          name: item.name,
                          image: item.image,
                          preview: item.preview,
                          rarity: item.rarity,
                        }}
                        size="sm"
                        showLabel={false}
                      />
                    </div>
                  ) : isEmoji ? (
                    <span className="text-4xl select-none">{item.image}</span>
                  ) : item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <Sparkles className="w-6 h-6 text-ink-ghost" />
                  )}

                  {isItemEquipped && (
                    <span className="absolute top-1.5 left-1.5 h-[17px] px-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                      <CheckIcon className="w-2.5 h-2.5" /> Equipped
                    </span>
                  )}

                  {!isItemEquipped && item.badge && (
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
                      className={`absolute top-1.5 right-1.5 h-[17px] px-1.5 rounded-full text-[9px] font-black uppercase flex items-center border ${
                        item.rarity === 'SSR' || item.rarity === 'legendary' || item.rarity === 'vip'
                          ? 'text-[#FF4D00] border-[#FF4D00] bg-orange-50'
                          : 'text-[#F5A623] border-[#F5A623] bg-amber-50'
                      }`}
                    >
                      {item.rarity}
                    </span>
                  )}
                </div>

                <div className="p-2">
                  <p className="text-[12px] font-bold text-ink truncate">{item.name}</p>

                  {/* Pricing row supporting Coins, Diamonds, and Tickets */}
                  <div className="mt-1 space-y-0.5">
                    {item.priceCoins != null && item.priceCoins > 0 && (
                      <p className="text-[11px] font-bold text-yellow-600 flex items-center gap-1 tabular-nums">
                        <CoinIcon className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                        <span>{compactNumber(item.priceCoins)}</span>
                      </p>
                    )}

                    {item.priceDiamonds != null && item.priceDiamonds > 0 && (
                      <p className="text-[11px] font-bold text-cyan-600 flex items-center gap-1 tabular-nums">
                        <DiamondIcon className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span>{compactNumber(item.priceDiamonds)}</span>
                      </p>
                    )}

                    {item.priceTickets != null && item.priceTickets > 0 && !item.priceCoins && !item.priceDiamonds && (
                      <p className="text-[11px] font-bold text-ink-soft flex items-center gap-1 tabular-nums">
                        <TicketIcon className="text-[10px]" />
                        <span>{item.priceTickets}</span>
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Purchase / Confirmation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-black"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="min-w-[100px] h-20 px-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700 flex items-center justify-center mb-3 shadow-inner">
                {selectedItem.category === 'badge' ? (
                  <EquippedBadge
                    badge={{
                      name: selectedItem.name,
                      image: selectedItem.image,
                      preview: selectedItem.preview,
                      rarity: selectedItem.rarity,
                    }}
                    size="md"
                  />
                ) : selectedItem.image && !selectedItem.image.startsWith('http') && !selectedItem.image.startsWith('data:') ? (
                  <span className="text-4xl select-none">{selectedItem.image}</span>
                ) : selectedItem.image ? (
                  <img src={selectedItem.image} alt={selectedItem.name} className="w-14 h-14 object-contain" />
                ) : (
                  <Medal className="w-10 h-10 text-amber-500" />
                )}
              </div>

              <h3 className="text-lg font-black text-ink">{selectedItem.name}</h3>
              {selectedItem.description && (
                <p className="text-xs text-ink-muted mt-1 px-4">{selectedItem.description}</p>
              )}

              <p className="text-xs text-ink-muted mt-2">
                Validity:{' '}
                <span className="font-bold text-ink">
                  {selectedItem.durationDays ? `${selectedItem.durationDays} Days` : 'Permanent'}
                </span>
              </p>
            </div>

            {/* Payment Options */}
            <div className="mt-5 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
                Choose Payment Method
              </p>

              {/* Pay with Coins Button */}
              {selectedItem.priceCoins != null && selectedItem.priceCoins > 0 && (
                <button
                  onClick={() => handleConfirmBuy(selectedItem, 'coins')}
                  disabled={buying === selectedItem._id || (user?.coins ?? 0) < selectedItem.priceCoins}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <CoinIcon className="w-5 h-5 text-yellow-200" />
                    <span>Pay with Coins</span>
                  </span>
                  <span>{selectedItem.priceCoins.toLocaleString()} Coins</span>
                </button>
              )}

              {/* Pay with Diamonds Button */}
              {selectedItem.priceDiamonds != null && selectedItem.priceDiamonds > 0 && (
                <button
                  onClick={() => handleConfirmBuy(selectedItem, 'diamonds')}
                  disabled={buying === selectedItem._id || (user?.diamonds ?? 0) < selectedItem.priceDiamonds}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <DiamondIcon className="w-5 h-5 text-cyan-200" />
                    <span>Pay with Diamonds</span>
                  </span>
                  <span>{selectedItem.priceDiamonds.toLocaleString()} Diamonds</span>
                </button>
              )}

              {/* Pay with Tickets (fallback) */}
              {selectedItem.priceTickets != null &&
                selectedItem.priceTickets > 0 &&
                !selectedItem.priceCoins &&
                !selectedItem.priceDiamonds && (
                  <button
                    onClick={() => handleConfirmBuy(selectedItem, 'tickets')}
                    disabled={buying === selectedItem._id}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-sm flex items-center justify-between shadow-md active:scale-98 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <TicketIcon />
                      <span>Pay with Tickets</span>
                    </span>
                    <span>{selectedItem.priceTickets.toLocaleString()} Tickets</span>
                  </button>
                )}

              {/* Insufficient balance hint */}
              {selectedItem.priceCoins != null &&
                selectedItem.priceCoins > (user?.coins ?? 0) &&
                selectedItem.priceDiamonds != null &&
                selectedItem.priceDiamonds > (user?.diamonds ?? 0) && (
                  <div className="text-center pt-1">
                    <p className="text-xs text-rose-500 font-semibold">Insufficient coins or diamonds</p>
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        navigate('/top-up');
                      }}
                      className="text-xs font-bold text-accent-600 underline mt-0.5"
                    >
                      Top up now
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed balance bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-line safe-bottom z-30 shadow-lg">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {/* Coins balance */}
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs font-bold text-ink tabular-nums">
                <CoinIcon className="w-4 h-4 text-yellow-500" />
                {compactNumber(user?.coins ?? 0)}
              </span>
              <button
                onClick={() => navigate('/top-up')}
                aria-label="Buy coins"
                className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center active:scale-90"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>

            {/* Diamonds balance */}
            <div className="flex items-center gap-1.5 ml-2">
              <span className="flex items-center gap-1 text-xs font-bold text-ink tabular-nums">
                <DiamondIcon className="w-4 h-4 text-cyan-500" />
                {compactNumber(user?.diamonds ?? 0)}
              </span>
              <button
                onClick={() => navigate('/top-up')}
                aria-label="Buy diamonds"
                className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center active:scale-90"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              </button>
            </div>
          </div>

          <button
            onClick={() => navigate('/settings')}
            aria-label="Support"
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink-muted active:scale-95"
          >
            <Headphones className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
