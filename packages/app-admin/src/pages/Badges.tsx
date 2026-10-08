import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  Award,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Gem,
  Coins,
} from 'lucide-react';
import { adminApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

interface BadgeItem {
  _id: string;
  category: 'badge';
  name: string;
  description?: string;
  image: string;
  preview: string;
  priceCoins: number;
  priceDiamonds: number;
  durationDays?: number | null;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'vip' | string | null;
  badge?: string | null;
  order?: number;
  isActive?: boolean;
  createdAt?: string;
}

const DEFAULT_FORM = {
  name: '',
  description: '',
  image: '',
  preview: '',
  priceCoins: 0,
  priceDiamonds: 0,
  durationDays: 0, // 0 = permanent
  rarity: 'epic',
  order: 0,
  isActive: true,
};

const RARITIES = [
  { value: 'common', label: 'Common', color: 'bg-zinc-700/60 text-zinc-300 border-zinc-500/40' },
  { value: 'rare', label: 'Rare', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { value: 'epic', label: 'Epic', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { value: 'legendary', label: 'Legendary', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { value: 'vip', label: 'VIP / Exclusive', color: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border-yellow-400/50' },
];

const PRESET_ICONS = [
  { label: '👑 King Crown', value: '👑' },
  { label: '💎 Diamond VIP', value: '💎' },
  { label: '🔥 Fire Pro', value: '🔥' },
  { label: '⚡ Bolt Star', value: '⚡' },
  { label: '🌟 Super Star', value: '🌟' },
  { label: '🛡️ Guardian Shield', value: '🛡️' },
  { label: '🦅 Alpha Eagle', value: '🦅' },
  { label: '🚀 Cosmic Rocket', value: '🚀' },
  { label: '🏆 Champion Cup', value: '🏆' },
  { label: '🐉 Dragon Lord', value: '🐉' },
  { label: '🌸 Sakura Elite', value: '🌸' },
  { label: '⚜️ Royal Fleur', value: '⚜️' },
];

export const Badges = () => {
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getBadges();
      if (data.success) {
        setBadges(data.data || []);
      }
    } catch {
      setBadges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateModal = () => {
    setEditingBadge(null);
    setForm({
      ...DEFAULT_FORM,
      image: '👑',
      preview: '👑',
    });
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (badge: BadgeItem) => {
    setEditingBadge(badge);
    setForm({
      name: badge.name || '',
      description: badge.description || '',
      image: badge.image || badge.preview || '',
      preview: badge.preview || badge.image || '',
      priceCoins: badge.priceCoins || 0,
      priceDiamonds: badge.priceDiamonds || 0,
      durationDays: badge.durationDays || 0,
      rarity: badge.rarity || 'epic',
      order: badge.order ?? 0,
      isActive: badge.isActive !== false,
    });
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Badge name is required.');
      return;
    }
    if (!form.image.trim()) {
      setError('Badge icon or image URL is required.');
      return;
    }
    if (form.priceCoins <= 0 && form.priceDiamonds <= 0) {
      setError('Please set a price in either Coins or Diamonds (or both).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image.trim(),
        preview: form.preview.trim() || form.image.trim(),
        priceCoins: Number(form.priceCoins) || 0,
        priceDiamonds: Number(form.priceDiamonds) || 0,
        durationDays: form.durationDays > 0 ? Number(form.durationDays) : null,
        rarity: form.rarity,
        order: Number(form.order) || 0,
        isActive: form.isActive,
      };

      if (editingBadge) {
        await adminApi.updateBadge(editingBadge._id, payload);
        setSuccessMsg('Badge updated successfully!');
      } else {
        await adminApi.createBadge(payload);
        setSuccessMsg('New badge added to store successfully!');
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
        load();
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save badge.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (badge: BadgeItem) => {
    try {
      const newStatus = !badge.isActive;
      await adminApi.updateBadge(badge._id, { isActive: newStatus });
      setBadges((prev) =>
        prev.map((b) => (b._id === badge._id ? { ...b, isActive: newStatus } : b))
      );
    } catch {
      alert('Failed to update badge status.');
    }
  };

  const handleDelete = async (badge: BadgeItem) => {
    if (!window.confirm(`Are you sure you want to delete badge "${badge.name}"? Users with this badge will no longer have it available in the store.`)) {
      return;
    }
    try {
      await adminApi.deleteBadge(badge._id);
      setBadges((prev) => prev.filter((b) => b._id !== badge._id));
    } catch {
      alert('Failed to delete badge.');
    }
  };

  const filteredBadges = badges.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'active' && b.isActive === false) return false;
    if (statusFilter === 'inactive' && b.isActive !== false) return false;
    if (rarityFilter !== 'all' && (b.rarity || 'epic') !== rarityFilter) return false;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-800/80 border border-dark-700/60 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Award className="w-7 h-7 text-amber-400" />
              Badge Store Management
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {badges.length} Badges
            </span>
          </div>
          <p className="text-sm text-dark-300 mt-1">
            Create and manage wearable profile badges for the store. Set prices in Coins, Diamonds, or both, and manage validity periods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl text-dark-300 hover:text-white transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-900 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Badge</span>
          </button>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-950/30 via-dark-800 to-dark-800 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <CoinIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">Coin Pricing</p>
            <p className="text-sm font-bold text-white mt-0.5">Users can purchase using Coins</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-950/30 via-dark-800 to-dark-800 border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <DiamondIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Diamond Pricing</p>
            <p className="text-sm font-bold text-white mt-0.5">Users can purchase using Diamonds</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-950/30 via-dark-800 to-dark-800 border border-purple-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Profile Display</p>
            <p className="text-sm font-bold text-white mt-0.5">Badges display beside username everywhere</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-dark-800/60 border border-dark-700/60 p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-dark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search badges by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-900/80 border border-dark-700 text-white text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-dark-900/80 border border-dark-700 text-dark-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="bg-dark-900/80 border border-dark-700 text-dark-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Rarities</option>
            {RARITIES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="text-center py-16 bg-dark-800/40 border border-dashed border-dark-700/60 rounded-3xl">
          <Award className="w-12 h-12 text-dark-500 mx-auto mb-3" />
          <p className="text-base font-bold text-dark-200">No badges found</p>
          <p className="text-xs text-dark-400 mt-1 max-w-sm mx-auto">
            {badges.length === 0
              ? 'Click "Add New Badge" above to create badges that users can buy and wear beside their names.'
              : 'Try changing your search or filters.'}
          </p>
          {badges.length === 0 && (
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-amber-500 text-dark-900 font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors"
            >
              Add First Badge
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => {
            const isEmoji = !badge.image.startsWith('http') && !badge.image.startsWith('data:');
            const rarityInfo = RARITIES.find((r) => r.value === badge.rarity) || RARITIES[2];

            return (
              <div
                key={badge._id}
                className={`bg-dark-800/80 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 ${
                  badge.isActive === false ? 'opacity-60 border-dark-700/40' : 'border-dark-700/60'
                }`}
              >
                {/* Header: Rarity & Status */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${rarityInfo.color}`}>
                      {rarityInfo.label}
                    </span>
                    <button
                      onClick={() => handleToggleActive(badge)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors ${
                        badge.isActive !== false
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                      title="Click to toggle active status"
                    >
                      {badge.isActive !== false ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5" /> Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5" /> Inactive
                        </>
                      )}
                    </button>
                  </div>

                  {/* Badge Icon & Name */}
                  <div className="flex flex-col items-center text-center my-3">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-dark-700/80 to-dark-900 border border-dark-600 flex items-center justify-center shadow-inner mb-3 overflow-hidden">
                      {isEmoji ? (
                        <span className="text-3xl select-none">{badge.image || '👑'}</span>
                      ) : (
                        <img
                          src={badge.image}
                          alt={badge.name}
                          className="w-12 h-12 object-contain"
                          onError={(e: any) => {
                            e.target.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png';
                          }}
                        />
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-white tracking-wide">{badge.name}</h3>
                    {badge.description && (
                      <p className="text-xs text-dark-300 mt-1 line-clamp-2">{badge.description}</p>
                    )}

                    {/* Nameplate Live Preview */}
                    <div className="mt-3 px-3 py-1.5 rounded-xl bg-dark-900/80 border border-dark-700/80 flex items-center gap-1.5 text-xs text-zinc-300">
                      <span className="font-semibold text-white">UserName</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                        {isEmoji ? <span>{badge.image}</span> : <img src={badge.image} className="w-3 h-3 object-contain" />}
                        <span>{badge.name}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Actions */}
                <div className="mt-4 pt-3 border-t border-dark-700/60 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-dark-400">Duration:</span>
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-dark-400" />
                      {badge.durationDays ? `${badge.durationDays} Days` : 'Permanent'}
                    </span>
                  </div>

                  {/* Prices */}
                  <div className="bg-dark-900/60 rounded-xl p-2 flex items-center justify-around gap-2 text-xs">
                    {badge.priceCoins > 0 ? (
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <CoinIcon className="w-3.5 h-3.5" />
                        <span>{badge.priceCoins.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-dark-500 text-[11px]">No Coins</span>
                    )}

                    <span className="text-dark-600">|</span>

                    {badge.priceDiamonds > 0 ? (
                      <div className="flex items-center gap-1 text-cyan-400 font-bold">
                        <DiamondIcon className="w-3.5 h-3.5" />
                        <span>{badge.priceDiamonds.toLocaleString()}</span>
                      </div>
                    ) : (
                      <span className="text-dark-500 text-[11px]">No Diamonds</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(badge)}
                      className="flex-1 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(badge)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors"
                      title="Delete Badge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-800 border border-dark-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-dark-400 hover:text-white p-1 rounded-xl bg-dark-700/50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingBadge ? 'Edit Store Badge' : 'Add New Store Badge'}
                </h3>
                <p className="text-xs text-dark-300">Set badge visuals, pricing in coins/diamonds and validity.</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Badge Name */}
              <div>
                <label className="block text-xs font-bold text-dark-200 mb-1.5">
                  Badge Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Star, Golden Dragon, Top Supporter"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-dark-200 mb-1.5">
                  Description <span className="text-dark-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exclusive badge for top diamond spenders and supporters"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Badge Icon / Image */}
              <div>
                <label className="block text-xs font-bold text-dark-200 mb-1.5">
                  Badge Icon or Image URL <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Emoji (e.g. 👑) or image URL (https://...)"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value, preview: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />

                {/* Preset Emojis / Icons */}
                <div className="mt-2">
                  <span className="text-[11px] text-dark-400">Quick Select:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PRESET_ICONS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, image: p.value, preview: p.value })}
                        className={`px-2 py-1 text-xs rounded-lg border transition-all ${
                          form.image === p.value
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-dark-900/60 border-dark-700 text-dark-300 hover:border-dark-500'
                        }`}
                      >
                        {p.value} {p.label.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-2xl bg-dark-900/90 border border-dark-700 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-dark-400 uppercase tracking-wider">Preview:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">ExampleUser</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border border-amber-500/50 text-xs font-bold text-amber-300 shadow-sm">
                    {!form.image.startsWith('http') && !form.image.startsWith('data:') ? (
                      <span>{form.image || '👑'}</span>
                    ) : (
                      <img src={form.image} alt="icon" className="w-3.5 h-3.5 object-contain" />
                    )}
                    <span>{form.name || 'Badge Name'}</span>
                  </span>
                </div>
              </div>

              {/* Pricing Section (Coins & Diamonds) */}
              <div className="p-4 bg-dark-900/50 rounded-2xl border border-dark-700/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-dark-200">
                    Store Price Settings
                  </span>
                </div>
                <p className="text-[11px] text-dark-400">
                  Set prices in Coins, Diamonds, or both. Users will be able to choose their payment method when buying.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Coin Price */}
                  <div>
                    <label className="block text-xs font-bold text-yellow-400 mb-1 flex items-center gap-1">
                      <CoinIcon className="w-3.5 h-3.5" /> Price in Coins
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0 (Free / Disabled)"
                      value={form.priceCoins}
                      onChange={(e) => setForm({ ...form, priceCoins: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-yellow-300 font-bold focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Diamond Price */}
                  <div>
                    <label className="block text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1">
                      <DiamondIcon className="w-3.5 h-3.5" /> Price in Diamonds
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0 (Free / Disabled)"
                      value={form.priceDiamonds}
                      onChange={(e) => setForm({ ...form, priceDiamonds: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Duration & Rarity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-200 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-dark-400" /> Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Permanent"
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-dark-400 mt-0.5 block">0 means permanent badge</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-200 mb-1.5">Rarity Tier</label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status & Order */}
              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block text-xs font-bold text-dark-200 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="badgeActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-dark-900 border-dark-700"
                  />
                  <label htmlFor="badgeActive" className="text-xs font-bold text-white cursor-pointer select-none">
                    Active in Store
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-dark-900 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving Badge...' : editingBadge ? 'Update Badge' : 'Create & Publish Badge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
