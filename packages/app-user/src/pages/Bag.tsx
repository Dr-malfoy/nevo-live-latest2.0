import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiSealCheckFill as BadgeCheck,
  PiCarFill as Car,
  PiCreditCardFill as CreditCard,
  PiTShirtFill as Shirt,
  PiSparkleFill as Sparkles,
  PiMedalFill as Medal,
  PiChatCircleDotsFill as ChatBubble,
  PiStorefrontFill as StoreIcon,
  PiCheckBold as CheckIcon,
  PiXBold as CloseIcon,
  PiClockFill as Clock,
  PiPackageFill as PackageIcon,
  PiCrownFill as Crown,
  PiArrowRightBold as ArrowRight,
  PiPhoneCallFill as PhoneCall,
} from 'react-icons/pi';
import { storeApi, type BagItem, type StoreCategory } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { Loading } from '../components/ui';
import { Avatar, EquippedBadge, RoleTags } from '../components/user';
import { getMediaUrl } from '../lib/media';

interface CategoryOption {
  key: string;
  label: string;
  Icon: any;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'all', label: 'All Items', Icon: PackageIcon },
  { key: 'badge', label: 'Badges', Icon: Medal },
  { key: 'avatar_frame', label: 'Avatar Frames', Icon: Sparkles },
  { key: 'subscription', label: '1:1 Pass', Icon: PhoneCall },
  { key: 'ride', label: 'Rides', Icon: Car },
  { key: 'chat_bubble', label: 'Chat Bubbles', Icon: ChatBubble },
  { key: 'profile_card', label: 'Profile Cards', Icon: CreditCard },
  { key: 'party_theme', label: 'Party Themes', Icon: Shirt },
];

type SourceFilter = 'all' | 'equipped' | 'purchased' | 'earned';

export const Bag = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const showToast = useUIStore((s) => s.showToast);

  const initialCategory = searchParams.get('category') || 'all';
  const initialFilter = (searchParams.get('filter') as SourceFilter) || 'all';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initialFilter);
  const [items, setItems] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<BagItem | null>(null);

  const loadBag = async () => {
    setLoading(true);
    try {
      const res = await optional(storeApi.getBag()).catch(() => null);
      if (res?.success && res.data) {
        setItems(res.data.items || []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBag();
    fetchProfile().catch(() => {});
  }, []);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (cat === 'all') next.delete('category');
      else next.set('category', cat);
      return next;
    });
  };

  const handleFilterChange = (filter: SourceFilter) => {
    setSourceFilter(filter);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (filter === 'all') next.delete('filter');
      else next.set('filter', filter);
      return next;
    });
  };

  // Resolution of equipped items from inventory or user profile
  const equippedBadgeItem = useMemo(
    () =>
      items.find(
        (i) =>
          i.category === 'badge' &&
          (i.equipped ||
            (user?.equippedBadge?.name &&
              (i.name === user.equippedBadge.name || i.itemId === user.equippedBadge._id)))
      ),
    [items, user?.equippedBadge]
  );

  const equippedFrameItem = useMemo(
    () =>
      items.find(
        (i) =>
          i.category === 'avatar_frame' &&
          (i.equipped ||
            (user?.equippedFrame?.name &&
              (i.name === user.equippedFrame.name || i.itemId === user.equippedFrame._id)))
      ),
    [items, user?.equippedFrame]
  );

  const activeBadge = useMemo(() => {
    if (equippedBadgeItem && (equippedBadgeItem.equipped || user?.equippedBadge?.name)) {
      return {
        _id: equippedBadgeItem.itemId,
        name: equippedBadgeItem.name,
        image: equippedBadgeItem.image,
        preview: equippedBadgeItem.preview,
        rarity: equippedBadgeItem.rarity || undefined,
      };
    }
    if (user?.equippedBadge?.name) {
      return user.equippedBadge;
    }
    return null;
  }, [equippedBadgeItem, user?.equippedBadge]);

  const activeFrame = useMemo(() => {
    if (equippedFrameItem && (equippedFrameItem.equipped || user?.equippedFrame?.name)) {
      return {
        _id: equippedFrameItem.itemId,
        name: equippedFrameItem.name,
        image: equippedFrameItem.image,
        preview: equippedFrameItem.preview,
        rarity: equippedFrameItem.rarity || undefined,
      };
    }
    if (user?.equippedFrame?.name) {
      return user.equippedFrame;
    }
    return null;
  }, [equippedFrameItem, user?.equippedFrame]);

  const handleToggleEquip = async (item: BagItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (togglingId) return;

    const isCurrentlyEquipped = Boolean(
      item.equipped ||
        (item.category === 'badge' &&
          activeBadge?.name &&
          (activeBadge.name === item.name || activeBadge._id === item.itemId)) ||
        (item.category === 'avatar_frame' &&
          activeFrame?.name &&
          (activeFrame.name === item.name || activeFrame._id === item.itemId))
    );
    const willEquip = !isCurrentlyEquipped;
    setTogglingId(item._id);

    try {
      const res = await optional(storeApi.equip(item._id, willEquip));
      if (res === null) {
        showToast('Bag service not reachable', 'error');
        return;
      }

      if (res.success) {
        showToast(
          willEquip ? `Equipped ${item.name}` : `Unequipped ${item.name}`,
          'success'
        );

        // Update local items state
        setItems((prev) =>
          prev.map((it) => {
            if (it._id === item._id) {
              return { ...it, equipped: willEquip };
            }
            // If equipping, unequip others in same category
            if (willEquip && it.category === item.category) {
              return { ...it, equipped: false };
            }
            return it;
          })
        );

        if (previewItem && previewItem._id === item._id) {
          setPreviewItem({ ...previewItem, equipped: willEquip });
        }

        // Instant optimistic update for auth store
        const currentBadge = willEquip && item.category === 'badge'
          ? {
              _id: item.itemId,
              name: item.name,
              image: item.image,
              preview: item.preview,
              rarity: item.rarity || undefined,
            }
          : (!willEquip && item.category === 'badge'
              ? null
              : (res.data?.equippedBadge || user?.equippedBadge || null));

        const currentFrame = willEquip && item.category === 'avatar_frame'
          ? {
              _id: item.itemId,
              name: item.name,
              image: item.image,
              preview: item.preview,
              rarity: item.rarity || undefined,
            }
          : (!willEquip && item.category === 'avatar_frame'
              ? null
              : (res.data?.equippedFrame || user?.equippedFrame || null));

        useAuthStore.getState().updateUser({
          equippedBadge: currentBadge as any,
          equippedFrame: currentFrame as any,
        });

        // Refresh global user state in background
        await fetchProfile().catch(() => {});
      } else {
        showToast(res.error || 'Failed to update item equipment', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to equip item', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // Filtered items based on category and source filter, with equipped items shown first
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      const isEquipped =
        item.equipped ||
        (item.category === 'badge' &&
          activeBadge?.name &&
          (item.name === activeBadge.name || item.itemId === activeBadge._id)) ||
        (item.category === 'avatar_frame' &&
          activeFrame?.name &&
          (item.name === activeFrame.name || item.itemId === activeFrame._id));

      // Source / Status filter
      if (sourceFilter === 'equipped') {
        return isEquipped;
      }
      if (sourceFilter === 'purchased') {
        return item.source === 'purchased' || item.source === 'store';
      }
      if (sourceFilter === 'earned') {
        return (
          item.source === 'earned' ||
          item.source === 'reward' ||
          item.source === 'gift' ||
          item.source === 'exclusive'
        );
      }

      return true;
    });

    // Equipped items first, then others
    return [...list].sort((a, b) => {
      const aEquipped =
        a.equipped ||
        (a.category === 'badge' &&
          activeBadge?.name &&
          (a.name === activeBadge.name || a.itemId === activeBadge._id)) ||
        (a.category === 'avatar_frame' &&
          activeFrame?.name &&
          (a.name === activeFrame.name || a.itemId === activeFrame._id));
      const bEquipped =
        b.equipped ||
        (b.category === 'badge' &&
          activeBadge?.name &&
          (b.name === activeBadge.name || b.itemId === activeBadge._id)) ||
        (b.category === 'avatar_frame' &&
          activeFrame?.name &&
          (b.name === activeFrame.name || b.itemId === activeFrame._id));

      if (aEquipped && !bEquipped) return -1;
      if (!aEquipped && bEquipped) return 1;
      return 0;
    });
  }, [items, selectedCategory, sourceFilter, activeBadge, activeFrame]);

  const equippedCount = useMemo(() => {
    const count = items.filter((i) => i.equipped).length;
    if (count > 0) return count;
    let fallback = 0;
    if (activeBadge) fallback++;
    if (activeFrame) fallback++;
    return fallback;
  }, [items, activeBadge, activeFrame]);

  const purchasedCount = useMemo(
    () => items.filter((i) => i.source === 'purchased' || i.source === 'store').length,
    [items]
  );
  const earnedCount = useMemo(
    () =>
      items.filter(
        (i) =>
          i.source === 'earned' ||
          i.source === 'reward' ||
          i.source === 'gift' ||
          i.source === 'exclusive'
      ).length,
    [items]
  );

  const formatExpiry = (expiresAt?: string | null) => {
    if (!expiresAt) return 'Permanent';
    const exp = new Date(expiresAt);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days === 1) return 'Expires today';
    return `${days} days left`;
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-line shadow-xs">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-1 -ml-1 text-ink active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-base font-extrabold text-ink">My Bag</h1>
          </div>

          <button
            onClick={() => navigate('/store')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
          >
            <StoreIcon className="w-3.5 h-3.5" />
            <span>Store</span>
          </button>
        </div>

        {/* Status / Source Filter Tabs */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-line/60 bg-surface-base/50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              sourceFilter === 'all'
                ? 'bg-ink text-white shadow-sm'
                : 'bg-surface-sunken text-ink-muted hover:text-ink'
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => handleFilterChange('equipped')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              sourceFilter === 'equipped'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <CheckIcon className="w-3 h-3" />
            <span>Equipped ({equippedCount})</span>
          </button>
          <button
            onClick={() => handleFilterChange('purchased')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              sourceFilter === 'purchased'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            Purchased ({purchasedCount})
          </button>
          <button
            onClick={() => handleFilterChange('earned')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              sourceFilter === 'earned'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            Earned ({earnedCount})
          </button>
        </div>

        {/* Category Scroll Strip */}
        <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar border-t border-line/40 bg-white">
          {CATEGORY_OPTIONS.map(({ key, label, Icon }) => {
            const active = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-brand/10 text-brand border border-brand/30'
                    : 'bg-surface-soft text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-brand' : 'text-ink-ghost'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Equipped Profile Card Preview */}
      {user && (
        <div className="mx-4 mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <Avatar
                src={user.avatar}
                nickname={user.nickname || 'User'}
                size="lg"
                frame={activeFrame || undefined}
                className="ring-2 ring-amber-400/40"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-extrabold text-sm truncate">{user.nickname}</p>
                  {activeBadge && (
                    <EquippedBadge badge={activeBadge} size="xs" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">ID: {user.uid}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-amber-300 font-medium">
                  <span className="flex items-center gap-1">
                    <CheckIcon className="w-3 h-3 text-emerald-400" />
                    <span>{equippedCount} Item{equippedCount === 1 ? '' : 's'} Equipped</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/store')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span>Get More</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Currently Equipped Equipment Showcase */}
      <div className="mx-4 mt-3 bg-white rounded-2xl p-3.5 border border-line/80 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-ink uppercase tracking-wider">Active Equipment</h2>
              <p className="text-[10px] text-ink-muted">Easily equip or unequip your active badge and avatar frame</p>
            </div>
          </div>
          <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            {equippedCount} Equipped
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Active Badge Slot */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeBadge
                ? 'bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-transparent border-amber-300/60 shadow-xs'
                : 'bg-surface-soft/60 border-dashed border-line'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-ink-muted tracking-wider flex items-center gap-1">
                <Medal className="w-3 h-3 text-amber-500" />
                <span>Active Badge</span>
              </span>
              {activeBadge?.rarity && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  {activeBadge.rarity}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 my-1.5 min-h-[46px]">
              {activeBadge ? (
                <>
                  <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border border-amber-400/40 shadow-xs">
                    <EquippedBadge badge={activeBadge} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-ink truncate leading-tight">{activeBadge.name}</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active on profile
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-ink-muted py-1">
                  <div className="w-10 h-10 rounded-xl border border-dashed border-line flex items-center justify-center shrink-0 text-ink-ghost">
                    <Medal className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-muted">No badge</p>
                    <p className="text-[10px] text-ink-ghost">Tap to choose</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-line/40">
              {equippedBadgeItem ? (
                <button
                  onClick={() => handleToggleEquip(equippedBadgeItem)}
                  disabled={togglingId === equippedBadgeItem._id}
                  className="w-full py-1.5 rounded-lg text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  {togglingId === equippedBadgeItem._id ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      <CloseIcon className="w-3 h-3" />
                      <span>Unequip</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleCategoryChange('badge')}
                  className="w-full py-1.5 rounded-lg text-xs font-black bg-surface-soft hover:bg-surface-sunken text-ink flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <span>Choose Badge</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Frame Slot */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
              activeFrame
                ? 'bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-transparent border-indigo-300/60 shadow-xs'
                : 'bg-surface-soft/60 border-dashed border-line'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase text-ink-muted tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-500" />
                <span>Active Frame</span>
              </span>
              {activeFrame?.rarity && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                  {activeFrame.rarity}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 my-1.5 min-h-[46px]">
              {activeFrame ? (
                <>
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <Avatar
                      src={user?.avatar}
                      nickname={user?.nickname || 'Me'}
                      size="sm"
                      frame={activeFrame}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-ink truncate leading-tight">{activeFrame.name}</p>
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active on avatar
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-ink-muted py-1">
                  <div className="w-10 h-10 rounded-xl border border-dashed border-line flex items-center justify-center shrink-0 text-ink-ghost">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-muted">No frame</p>
                    <p className="text-[10px] text-ink-ghost">Tap to choose</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-line/40">
              {equippedFrameItem ? (
                <button
                  onClick={() => handleToggleEquip(equippedFrameItem)}
                  disabled={togglingId === equippedFrameItem._id}
                  className="w-full py-1.5 rounded-lg text-xs font-black bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  {togglingId === equippedFrameItem._id ? (
                    <Loading size="sm" />
                  ) : (
                    <>
                      <CloseIcon className="w-3 h-3" />
                      <span>Unequip</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleCategoryChange('avatar_frame')}
                  className="w-full py-1.5 rounded-lg text-xs font-black bg-surface-soft hover:bg-surface-sunken text-ink flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <span>Choose Frame</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Bag Content */}
      <main className="px-4 pt-3.5">
        {loading ? (
          <div className="pt-16">
            <Loading size="lg" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-sunken flex items-center justify-center mb-3 text-ink-ghost shadow-inner">
              <PackageIcon className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-ink">
              {sourceFilter === 'equipped'
                ? 'No items currently equipped'
                : sourceFilter === 'purchased'
                ? 'No purchased items yet'
                : sourceFilter === 'earned'
                ? 'No earned items yet'
                : 'Your bag is empty'}
            </h2>
            <p className="text-xs text-ink-muted mt-1 max-w-xs">
              {sourceFilter === 'equipped'
                ? 'Select an item from your bag and tap Equip to wear it.'
                : 'Explore the Store and participate in platform activities to collect badges, avatar frames, rides, and more!'}
            </p>
            <button
              onClick={() => navigate('/store')}
              className="mt-5 px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-extrabold text-sm shadow-md active:scale-95 transition-transform"
            >
              Browse Store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const rawSrc = item.icon || item.preview || item.image || '';
              const isEmoji = rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:') && !rawSrc.startsWith('/') && !rawSrc.includes('.');
              const isPurchased = item.source === 'purchased' || item.source === 'store';
              const isEquipped = Boolean(
                item.equipped ||
                (item.category === 'badge' && activeBadge?.name && (activeBadge.name === item.name || activeBadge._id === item.itemId)) ||
                (item.category === 'avatar_frame' && activeFrame?.name && (activeFrame.name === item.name || activeFrame._id === item.itemId))
              );
              const isToggling = togglingId === item._id;

              return (
                <div
                  key={item._id}
                  onClick={() => setPreviewItem(item)}
                  className={`relative bg-white rounded-2xl overflow-hidden border p-3 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] ${
                    isEquipped
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-line/70 shadow-2xs hover:border-ink-ghost'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {/* Source tag */}
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                        isPurchased
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isPurchased ? 'Purchased' : 'Earned'}
                    </span>

                    {/* Rarity */}
                    {item.rarity && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {item.rarity}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Container */}
                  <div className="relative aspect-square w-full rounded-xl bg-gradient-to-br from-surface-soft to-surface-sunken flex items-center justify-center p-3 mb-2 overflow-visible">
                    {item.category === 'avatar_frame' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Avatar
                          src={user?.avatar}
                          nickname={user?.nickname || 'Me'}
                          size="lg"
                          frame={item}
                        />
                      </div>
                    ) : item.category === 'badge' ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <EquippedBadge badge={item as any} size="sm" />
                      </div>
                    ) : item.category === 'subscription' ? (
                      <div className="w-full h-full rounded-xl bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500 flex flex-col items-center justify-center text-white">
                        <PhoneCall className="w-8 h-8 mb-1 drop-shadow" />
                        <span className="text-[10px] font-black uppercase tracking-wider">1:1 Pass</span>
                      </div>
                    ) : isEmoji ? (
                      <span className="text-4xl select-none drop-shadow-sm">{rawSrc}</span>
                    ) : rawSrc ? (
                      <img
                        src={getMediaUrl(rawSrc)}
                        alt={item.name}
                        className="w-full h-full object-contain drop-shadow-sm"
                      />
                    ) : (
                      <Sparkles className="w-8 h-8 text-ink-ghost" />
                    )}

                    {/* Equipped Badge Overlay */}
                    {isEquipped && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center gap-1 shadow-sm">
                        <CheckIcon className="w-2.5 h-2.5" />
                        <span>Equipped</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-ink truncate">{item.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-ink-muted mt-0.5">
                      <Clock className="w-3 h-3 text-ink-ghost shrink-0" />
                      <span className="truncate">{formatExpiry(item.expiresAt)}</span>
                    </div>
                  </div>

                  {/* Equip / Unequip or Action Button */}
                  <div className="mt-3">
                    {item.category === 'subscription' ? (
                      <button
                        onClick={() => navigate('/match')}
                        className="w-full py-1.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm flex items-center justify-center gap-1 active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Go to Match</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleToggleEquip(item, e)}
                        disabled={isToggling}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 ${
                          isEquipped
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm'
                        }`}
                      >
                        {isToggling ? (
                          <Loading size="sm" />
                        ) : isEquipped ? (
                          <>
                            <CloseIcon className="w-3 h-3" />
                            <span>Unequip</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon className="w-3 h-3" />
                            <span>Equip</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Item Detail / Preview Modal */}
      {previewItem && (() => {
        const previewIsEquipped = Boolean(
          previewItem.equipped ||
          (previewItem.category === 'badge' && activeBadge?.name && (activeBadge.name === previewItem.name || activeBadge._id === previewItem.itemId)) ||
          (previewItem.category === 'avatar_frame' && activeFrame?.name && (activeFrame.name === previewItem.name || activeFrame._id === previewItem.itemId))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-black active:scale-90 transition-transform"
              >
                <CloseIcon className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 border border-amber-200 flex items-center justify-center mb-3 shadow-inner relative overflow-visible">
                  {previewItem.category === 'avatar_frame' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar
                        src={user?.avatar}
                        nickname={user?.nickname || 'Me'}
                        size="xl"
                        frame={previewItem}
                      />
                    </div>
                  ) : previewItem.category === 'badge' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <EquippedBadge badge={previewItem as any} size="md" />
                    </div>
                  ) : (() => {
                    const rawSrc = previewItem.icon || previewItem.preview || previewItem.image || '';
                    const isEmoji = rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('data:') && !rawSrc.startsWith('/') && !rawSrc.includes('.');
                    if (isEmoji) {
                      return <span className="text-5xl select-none">{rawSrc}</span>;
                    }
                    if (rawSrc) {
                      return <img src={getMediaUrl(rawSrc)} alt={previewItem.name} className="w-16 h-16 object-contain" />;
                    }
                    return <Sparkles className="w-12 h-12 text-amber-500" />;
                  })()}

                  {previewIsEquipped && (
                    <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                      <CheckIcon className="w-3 h-3" />
                      <span>Equipped</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-ink">{previewItem.name}</h3>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {previewItem.category.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      previewItem.source === 'purchased' || previewItem.source === 'store'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {previewItem.source === 'purchased' || previewItem.source === 'store' ? 'Purchased from Store' : 'Earned Item'}
                  </span>
                  {previewItem.rarity && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      {previewItem.rarity}
                    </span>
                  )}
                </div>

                {previewItem.description && (
                  <p className="text-xs text-ink-muted mt-2.5 px-4">{previewItem.description}</p>
                )}

                <div className="w-full bg-surface-soft rounded-xl p-2.5 mt-4 text-xs text-ink flex items-center justify-between">
                  <span className="text-ink-muted font-medium">Status & Validity:</span>
                  <span className="font-bold text-ink flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-ink-ghost" />
                    {formatExpiry(previewItem.expiresAt)}
                  </span>
                </div>
              </div>

              {/* Equip / Unequip CTA */}
              <div className="mt-5">
                <button
                  onClick={() => handleToggleEquip(previewItem)}
                  disabled={togglingId === previewItem._id}
                  className={`w-full py-3 px-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all disabled:opacity-50 ${
                    previewIsEquipped
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  }`}
                >
                  {togglingId === previewItem._id ? (
                    <Loading size="sm" />
                  ) : previewIsEquipped ? (
                    <>
                      <CloseIcon className="w-4 h-4" />
                      <span>Unequip Item</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      <span>Equip Item</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
