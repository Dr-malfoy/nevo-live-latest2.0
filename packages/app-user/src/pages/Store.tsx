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
  PiArrowRightBold as ArrowRightIcon,
  PiWarningCircleFill as WarningIcon,
  PiPhoneCallFill as PhoneCall,
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
  { key: 'subscription', label: '1:1 Pass', Icon: PhoneCall, tint: 'text-[#EC4899] bg-[#FDF2F8]' },
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
  const updateUser = useAuthStore((s) => s.updateUser);
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

  // Confirmation state before executing purchase
  const [confirmingPurchase, setConfirmingPurchase] = useState<{
    item: StoreItem;
    payWith: 'coins' | 'diamonds' | 'tickets';
    price: number;
  } | null>(null);

  // Success dialog state after item is added to bag
  const [purchasedSuccess, setPurchasedSuccess] = useState<{
    item: StoreItem;
  } | null>(null);

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

  const handleInitiatePurchase = (item: StoreItem, payWith: 'coins' | 'diamonds' | 'tickets', price: number) => {
    setConfirmingPurchase({ item, payWith, price });
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
        showToast(`${item.name} added to your bag!`, 'success');
        setConfirmingPurchase(null);
        setSelectedItem(null);
        setPurchasedSuccess({ item });
        const balances = (res as any).data?.balances || (res as any).balances;
        if (balances) {
          const updates: any = {};
          if (typeof balances.coins === 'number') updates.coins = balances.coins;
          if (typeof balances.diamonds === 'number') updates.diamonds = balances.diamonds;
          if (typeof balances.tickets === 'number') updates.tickets = balances.tickets;
          updateUser(updates);
        }
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
  const isSubscription = category === 'subscription';

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

      {/* 1:1 Subscription Banner Header */}
      {isSubscription && (
        <div className="mx-3 mt-3 p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-pink-500/20 border border-pink-400/40 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center text-white shadow-md">
                <PhoneCall className="w-6 h-6" />
              </span>
              <div>
                <p className="text-xs font-black text-ink tracking-tight flex items-center gap-1.5">
                  <span>1:1 Match VIP Pass</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-pink-500 text-white">VIP</span>
                </p>
                <p className="text-[11px] text-ink-muted">100 Gender Filter Matches + 5 Free 1-Min Calls (7 Days)</p>
              </div>
            </div>
            {user?.matchSubscription?.active && user?.matchSubscription?.expiresAt && new Date(user.matchSubscription.expiresAt) > new Date() && (
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">Active</span>
                <p className="text-[9px] text-ink-muted mt-0.5">
                  {user.matchSubscription.filterMatchesRemaining} matches left
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-pink-200/50">
            <div className="p-2.5 rounded-xl bg-white/70 border border-pink-100">
              <p className="text-[10px] text-pink-700 font-bold uppercase tracking-wider">Filter Quota</p>
              <p className="text-xs font-black text-ink mt-0.5">100 Matchmakings / Wk</p>
              <p className="text-[9px] text-ink-muted">Filter Boy / Girl in 1:1 match</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 border border-pink-100">
              <p className="text-[10px] text-pink-700 font-bold uppercase tracking-wider">Free Calls</p>
              <p className="text-xs font-black text-ink mt-0.5">5 Calls (1st Min Free)</p>
              <p className="text-[9px] text-ink-muted">No coins charged under 1 min</p>
            </div>
          </div>
        </div>
      )}

      {!isHonor && (
        <PillTabs
          tabs={SORTS.map((s) => ({ key: s.key, label: s.label }))}
          active={sort}
          onChange={(key) => setSort(key as 'hot' | 'latest')}
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
                  ) : item.category === 'subscription' ? (
                    <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500 flex flex-col items-center justify-center text-white shadow-md p-1.5 text-center">
                      <PhoneCall className="w-7 h-7 mb-1 drop-shadow" />
                      <span className="text-[10px] font-black uppercase tracking-wider">1:1 Pass</span>
                      <span className="text-[8px] opacity-90 font-medium">100 Match • 5 Calls</span>
                    </div>
                  ) : item.category === 'badge' ? (
                    <div className="w-full h-full flex items-center justify-center p-1 overflow-hidden">
                      <EquippedBadge
                        badge={{
                          name: item.name,
                          image: item.image,
                          preview: item.preview,
                          rarity: (item.rarity || undefined) as any,
                        }}
                        size="xs"
                        showLabel={true}
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
                {selectedItem.category === 'subscription' ? (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500 flex flex-col items-center justify-center text-white shadow-md">
                    <PhoneCall className="w-7 h-7 drop-shadow" />
                    <span className="text-[9px] font-black uppercase tracking-wider">1:1 Pass</span>
                  </div>
                ) : selectedItem.category === 'badge' ? (
                  <EquippedBadge
                    badge={{
                      name: selectedItem.name,
                      image: selectedItem.image,
                      preview: selectedItem.preview,
                      rarity: (selectedItem.rarity || undefined) as any,
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
                  onClick={() => handleInitiatePurchase(selectedItem, 'coins', selectedItem.priceCoins!)}
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
                  onClick={() => handleInitiatePurchase(selectedItem, 'diamonds', selectedItem.priceDiamonds!)}
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
                    onClick={() => handleInitiatePurchase(selectedItem, 'tickets', selectedItem.priceTickets!)}
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

      {/* Confirmation Modal — Direct purchase prevented, user confirms and item adds to bag */}
      {confirmingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setConfirmingPurchase(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-black transition-colors"
              aria-label="Close"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Destination badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black mb-3">
                <BackpackIcon className="w-4 h-4 text-indigo-600" />
                <span>Destination: My Bag</span>
              </div>

              <h3 className="text-lg font-black text-ink">Confirm Purchase</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Review payment details before adding to bag
              </p>

              {/* Item Card */}
              <div className="w-full mt-3.5 p-3 rounded-2xl bg-surface-sunken flex items-center gap-3 text-left">
                <div className="w-14 h-14 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {confirmingPurchase.item.category === 'subscription' ? (
                    <div className="w-full h-full rounded-xl bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500 flex flex-col items-center justify-center text-white">
                      <PhoneCall className="w-6 h-6" />
                    </div>
                  ) : confirmingPurchase.item.category === 'badge' ? (
                    <EquippedBadge
                      badge={{
                        name: confirmingPurchase.item.name,
                        image: confirmingPurchase.item.image,
                        preview: confirmingPurchase.item.preview,
                        rarity: (confirmingPurchase.item.rarity || undefined) as any,
                      }}
                      size="sm"
                    />
                  ) : confirmingPurchase.item.image &&
                    !confirmingPurchase.item.image.startsWith('http') &&
                    !confirmingPurchase.item.image.startsWith('data:') ? (
                    <span className="text-2xl select-none">{confirmingPurchase.item.image}</span>
                  ) : confirmingPurchase.item.image ? (
                    <img
                      src={confirmingPurchase.item.image}
                      alt={confirmingPurchase.item.name}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Medal className="w-7 h-7 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-ink text-sm truncate">{confirmingPurchase.item.name}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Validity: <span className="font-semibold text-ink">{confirmingPurchase.item.durationDays ? `${confirmingPurchase.item.durationDays} Days` : 'Permanent'}</span>
                  </p>
                </div>
              </div>

              {/* Cost & Balance Breakdown */}
              <div className="w-full mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Price:</span>
                  <span className="font-extrabold flex items-center gap-1 text-ink">
                    {confirmingPurchase.payWith === 'coins' ? (
                      <CoinIcon className="w-4 h-4 text-yellow-500" />
                    ) : confirmingPurchase.payWith === 'diamonds' ? (
                      <DiamondIcon className="w-4 h-4 text-cyan-500" />
                    ) : (
                      <TicketIcon />
                    )}
                    <span>{confirmingPurchase.price.toLocaleString()}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Your Current Balance:</span>
                  <span className="font-bold flex items-center gap-1 text-slate-700">
                    {confirmingPurchase.payWith === 'coins' ? (
                      <CoinIcon className="w-3.5 h-3.5 text-yellow-500" />
                    ) : confirmingPurchase.payWith === 'diamonds' ? (
                      <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
                    ) : (
                      <TicketIcon />
                    )}
                    <span>
                      {(
                        confirmingPurchase.payWith === 'coins'
                          ? user?.coins ?? 0
                          : confirmingPurchase.payWith === 'diamonds'
                          ? user?.diamonds ?? 0
                          : (user as any)?.tickets ?? 0
                      ).toLocaleString()}
                    </span>
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Remaining Balance:</span>
                  <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                    {confirmingPurchase.payWith === 'coins' ? (
                      <CoinIcon className="w-3.5 h-3.5 text-yellow-500" />
                    ) : confirmingPurchase.payWith === 'diamonds' ? (
                      <DiamondIcon className="w-3.5 h-3.5 text-cyan-500" />
                    ) : (
                      <TicketIcon />
                    )}
                    <span>
                      {Math.max(
                        0,
                        (confirmingPurchase.payWith === 'coins'
                          ? user?.coins ?? 0
                          : confirmingPurchase.payWith === 'diamonds'
                          ? user?.diamonds ?? 0
                          : (user as any)?.tickets ?? 0) - confirmingPurchase.price
                      ).toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>

              {/* Informational Callout */}
              {confirmingPurchase.item.category === 'subscription' ? (
                <div className="w-full mt-3 p-3 rounded-xl bg-pink-50/90 border border-pink-200/80 flex items-start gap-2.5 text-left">
                  <PhoneCall className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-pink-950 leading-relaxed font-medium">
                    <p className="font-extrabold text-pink-900">1:1 VIP Benefits Included:</p>
                    <p>• <strong>100 Gender Filter Matches</strong> for 1 week</p>
                    <p>• <strong>5 Calls with 1st Min FREE</strong> (charge starts after 1 min)</p>
                    <p>• Stored and managed in your <strong>Bag</strong></p>
                  </div>
                </div>
              ) : (
                <div className="w-full mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/70 flex items-start gap-2 text-left">
                  <BackpackIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-900 leading-tight">
                    This item will be added to your <strong>Bag</strong>. You can wear or equip it anytime from your Bag.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full mt-4 flex items-center gap-2">
                <button
                  onClick={() => setConfirmingPurchase(null)}
                  disabled={buying === confirmingPurchase.item._id}
                  className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmBuy(confirmingPurchase.item, confirmingPurchase.payWith)}
                  disabled={buying === confirmingPurchase.item._id}
                  className="w-2/3 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  {buying === confirmingPurchase.item._id ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Confirm & Add to Bag</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Success Modal */}
      {purchasedSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
              <BackpackIcon className="w-8 h-8 text-emerald-600" />
            </div>

            <h3 className="text-lg font-black text-ink">Added to Your Bag!</h3>
            <p className="text-xs text-ink-muted mt-1 px-2">
              <strong className="text-ink">{purchasedSuccess.item.name}</strong> is now available in your Bag.
            </p>

            <div className="mt-5 space-y-2">
              <button
                onClick={() => {
                  setPurchasedSuccess(null);
                  navigate('/bag');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all"
              >
                <BackpackIcon className="w-4 h-4" />
                <span>Open My Bag</span>
              </button>
              <button
                onClick={() => setPurchasedSuccess(null)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-98 transition-all"
              >
                Continue Shopping
              </button>
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
