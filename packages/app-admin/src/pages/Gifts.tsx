import { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../api';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

interface GiftItem {
  _id: string;
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  order?: number;
  isActive?: boolean;
  animation?: string;
  animationUrl?: string;
  animationTier?: 'corner' | 'medium' | 'fullscreen';
}

const DEFAULT_FORM: {
  giftId: string;
  name: string;
  icon: string;
  priceDiamonds: number;
  order: number;
  isActive: boolean;
  animationTier: 'corner' | 'medium' | 'fullscreen';
} = {
  giftId: '',
  name: '',
  icon: '',
  priceDiamonds: 100,
  order: 0,
  isActive: true,
  animationTier: 'corner',
};

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 5000, 10000, 50000];

export const Gifts = () => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftItem | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Inline Edit state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<number>(0);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getGifts();
      if (data.success) {
        setGifts(data.data || []);
      }
    } catch {
      // Fallback
      try {
        const fallback = await adminApi.createGift({});
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateModal = () => {
    setEditingGift(null);
    setForm({
      ...DEFAULT_FORM,
      giftId: `gift_${Date.now().toString().slice(-4)}`,
    });
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (gift: GiftItem) => {
    setEditingGift(gift);
    setForm({
      giftId: gift.giftId || '',
      name: gift.name || '',
      icon: gift.icon || '',
      priceDiamonds: gift.priceDiamonds || 0,
      order: gift.order ?? 0,
      isActive: gift.isActive !== false,
      animationTier: gift.animationTier || 'corner',
    });
    setError('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.icon.trim()) {
      setError('Name and Icon / Emoji / URL are required.');
      return;
    }
    if (form.priceDiamonds < 1) {
      setError('Coin price must be at least 1 coin.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingGift) {
        await adminApi.updateGift(editingGift._id, form);
        setSuccessMsg('Gift updated successfully!');
      } else {
        await adminApi.createGift(form);
        setSuccessMsg('New gift created successfully!');
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
        load();
      }, 700);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save gift.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (gift: GiftItem) => {
    try {
      const newStatus = !gift.isActive;
      await adminApi.updateGift(gift._id, { isActive: newStatus });
      setGifts((prev) =>
        prev.map((g) => (g._id === gift._id ? { ...g, isActive: newStatus } : g))
      );
    } catch {
      alert('Failed to update gift status.');
    }
  };

  const handleDelete = async (gift: GiftItem) => {
    if (!window.confirm(`Are you sure you want to delete "${gift.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminApi.deleteGift(gift._id);
      setGifts((prev) => prev.filter((g) => g._id !== gift._id));
    } catch {
      alert('Failed to delete gift.');
    }
  };

  const handleStartInlineEdit = (gift: GiftItem) => {
    setInlineEditingId(gift._id);
    setInlinePrice(gift.priceDiamonds);
  };

  const handleSaveInlineEdit = async (giftId: string) => {
    if (inlinePrice < 1) return;
    try {
      await adminApi.updateGift(giftId, { priceDiamonds: inlinePrice });
      setGifts((prev) =>
        prev.map((g) => (g._id === giftId ? { ...g, priceDiamonds: inlinePrice } : g))
      );
      setInlineEditingId(null);
    } catch {
      alert('Failed to update price');
    }
  };

  const filteredGifts = gifts.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.giftId.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'active') return matchesSearch && g.isActive !== false;
    if (statusFilter === 'inactive') return matchesSearch && g.isActive === false;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-dark-800/80 border border-dark-700/60 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-white">Gift Management & Pricing</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30">
              {gifts.length} Total
            </span>
          </div>
          <p className="text-sm text-dark-300 mt-1">
            Configure gift catalogue prices, custom animations, and revenue yield rules (70% host / 30% admin).
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
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Gift</span>
          </button>
        </div>
      </div>

      {/* Revenue Split Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-950/40 via-dark-800 to-dark-800 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
            <CoinIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-yellow-300 uppercase tracking-wider">Sender Coin Cost</p>
            <p className="text-sm font-bold text-white mt-0.5">Fixed per Gift (Paid in Coins)</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-950/40 via-dark-800 to-dark-800 border border-cyan-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <DiamondIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Host Revenue (70%)</p>
            <p className="text-sm font-bold text-white mt-0.5">70 diamonds per 100 coins</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-950/40 via-dark-800 to-dark-800 border border-purple-500/30 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Platform Cut (30%)</p>
            <p className="text-sm font-bold text-white mt-0.5">30 diamonds per 100 coins</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-dark-800 p-3 rounded-xl border border-dark-700">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gifts by name or ID..."
            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder:text-dark-400 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === filter
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-dark-700 text-dark-300 hover:text-white hover:bg-dark-600'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Gifts Grid */}
      {loading ? (
        <div className="text-center py-16 bg-dark-800/40 rounded-2xl border border-dark-700/50">
          <RefreshCw className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
          <p className="text-dark-300 font-medium text-sm">Loading gifts catalogue...</p>
        </div>
      ) : filteredGifts.length === 0 ? (
        <div className="text-center py-16 bg-dark-800/40 rounded-2xl border border-dark-700/50">
          <p className="text-dark-400 font-medium text-sm">No gifts found matching criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredGifts.map((gift) => {
            const isEditingThis = inlineEditingId === gift._id;
            const hostShare = Math.floor(gift.priceDiamonds * 0.7);
            const adminShare = Math.floor(gift.priceDiamonds * 0.3);

            return (
              <div
                key={gift._id}
                className={`relative group bg-dark-800 border rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-dark-600 hover:shadow-xl ${
                  gift.isActive === false ? 'opacity-60 border-dark-700/40' : 'border-dark-700'
                }`}
              >
                {/* Status indicator badge */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      gift.isActive !== false
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {gift.isActive !== false ? 'Active' : 'Disabled'}
                  </span>

                  <span className="text-[10px] font-mono text-dark-400 bg-dark-900 px-1.5 py-0.5 rounded">
                    #{gift.order ?? 0}
                  </span>
                </div>

                {/* Gift Visual & Name */}
                <div className="text-center py-2">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-dark-900/90 border border-dark-700 flex items-center justify-center p-2 shadow-inner group-hover:scale-105 transition-transform">
                    {gift.icon?.startsWith('http') ? (
                      <img src={gift.icon} alt={gift.name} className="w-12 h-12 object-contain" />
                    ) : (
                      <span className="text-4xl select-none">{gift.icon || '🎁'}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-white truncate" title={gift.name}>
                    {gift.name}
                  </h3>
                  <p className="text-[11px] font-mono text-dark-400 truncate mt-0.5" title={gift.giftId}>
                    ID: {gift.giftId}
                  </p>
                </div>

                {/* Price Display & Quick Edit Section */}
                <div className="bg-dark-900/80 border border-dark-700/80 rounded-xl p-2.5 my-2">
                  {isEditingThis ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <CoinIcon className="w-4 h-4 text-yellow-400 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          autoFocus
                          value={inlinePrice}
                          onChange={(e) => setInlinePrice(parseInt(e.target.value) || 0)}
                          className="w-full bg-dark-800 border border-yellow-500/60 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveInlineEdit(gift._id)}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          onClick={() => setInlineEditingId(null)}
                          className="px-2 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded text-xs font-bold"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-dark-400 font-medium">Coin Price:</span>
                        <button
                          onClick={() => handleStartInlineEdit(gift)}
                          className="text-[10px] text-primary-400 hover:underline inline-flex items-center gap-0.5"
                          title="Quick edit price"
                        >
                          <Pencil className="w-2.5 h-2.5" /> Edit
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CoinIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-base font-black text-yellow-300">
                          {gift.priceDiamonds.toLocaleString()} Coins
                        </span>
                      </div>

                      {/* Revenue breakdown */}
                      <div className="border-t border-dark-700/60 mt-2 pt-1.5 flex items-center justify-between text-[10px]">
                        <span className="text-cyan-400 font-semibold" title="Host earns 70% in diamonds">
                          💎 Host: +{hostShare.toLocaleString()}
                        </span>
                        <span className="text-purple-400 font-semibold" title="Platform earns 30% in diamonds">
                          🛡️ Admin: +{adminShare.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-dark-700/60 mt-1">
                  <button
                    onClick={() => handleToggleActive(gift)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                      gift.isActive !== false
                        ? 'bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white'
                        : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                    }`}
                    title={gift.isActive !== false ? 'Deactivate gift' : 'Activate gift'}
                  >
                    {gift.isActive !== false ? (
                      <>
                        <ToggleRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3.5 h-3.5 text-rose-400" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openEditModal(gift)}
                    className="p-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg transition-colors"
                    title="Full edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(gift)}
                    className="p-1.5 bg-dark-700 hover:bg-rose-600/20 text-dark-300 hover:text-rose-400 rounded-lg transition-colors"
                    title="Delete gift"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-dark-800 border border-dark-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-dark-700 bg-dark-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center text-primary-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingGift ? 'Edit Gift & Price' : 'Create New Gift'}
                  </h3>
                  <p className="text-xs text-dark-400">
                    {editingGift ? 'Update gift parameters and diamond pricing' : 'Add a new gift to live & party rooms'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Gift Identifier & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Gift ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.giftId}
                    disabled={!!editingGift}
                    onChange={(e) => setForm({ ...form, giftId: e.target.value })}
                    placeholder="e.g., rocket, diamond_ring"
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white font-mono placeholder:text-dark-500 focus:outline-none focus:border-primary-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Display Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Space Rocket"
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Icon / Image URL with Preview */}
              <div>
                <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                  Icon (Emoji or Image URL) <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-dark-900 border border-dark-700 flex items-center justify-center shrink-0">
                    {form.icon?.startsWith('http') ? (
                      <img src={form.icon} alt="Preview" className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-2xl">{form.icon || '🎁'}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="Enter emoji (🚀, 👑) or https:// image link"
                    className="flex-1 bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Price Diamonds Input & Quick Buttons */}
              <div className="bg-dark-900/80 border border-dark-700/80 p-3.5 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CoinIcon className="w-4 h-4 text-yellow-400" />
                    Fixed Coin Price <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-dark-400">Cost in Coins to viewer on send</span>
                </div>

                <input
                  type="number"
                  required
                  min="1"
                  value={form.priceDiamonds}
                  onChange={(e) => setForm({ ...form, priceDiamonds: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 500"
                  className="w-full bg-dark-800 border border-yellow-500/50 rounded-xl px-3.5 py-2 text-lg font-black text-yellow-300 focus:outline-none focus:border-yellow-400"
                />

                {/* Quick Add Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-dark-400 font-semibold mr-1">Presets:</span>
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setForm({ ...form, priceDiamonds: amt })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                        form.priceDiamonds === amt
                          ? 'bg-yellow-500 text-black shadow-sm font-black'
                          : 'bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 border border-dark-700'
                      }`}
                    >
                      {amt >= 1000 ? `${amt / 1000}k` : amt}
                    </button>
                  ))}
                </div>

                {/* Live Split Preview Box */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-700/60 text-xs">
                  <div className="bg-dark-800/60 p-2 rounded-lg border border-dark-700">
                    <p className="text-[10px] text-dark-400 uppercase font-semibold">Host Earns (70%)</p>
                    <p className="text-sm font-black text-cyan-400 mt-0.5">
                      💎 {Math.floor(form.priceDiamonds * 0.7).toLocaleString()} Diamonds
                    </p>
                  </div>
                  <div className="bg-dark-800/60 p-2 rounded-lg border border-dark-700">
                    <p className="text-[10px] text-dark-400 uppercase font-semibold">Admin Cut (30%)</p>
                    <p className="text-sm font-black text-purple-400 mt-0.5">
                      🛡️ {Math.floor(form.priceDiamonds * 0.3).toLocaleString()} Diamonds
                    </p>
                  </div>
                </div>
              </div>

              {/* Order & Animation Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-300 uppercase tracking-wider mb-1">
                    Animation Style
                  </label>
                  <select
                    value={form.animationTier}
                    onChange={(e) => setForm({ ...form, animationTier: e.target.value as any })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="corner">Corner Pop</option>
                    <option value="medium">Medium Overlay</option>
                    <option value="fullscreen">Fullscreen Burst</option>
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between bg-dark-900/60 border border-dark-700 p-3 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Enable Gift in App</p>
                  <p className="text-xs text-dark-400">When enabled, this gift appears in live & party panels.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`p-1.5 rounded-lg transition-colors ${
                    form.isActive ? 'text-emerald-400 bg-emerald-500/20' : 'text-dark-400 bg-dark-800'
                  }`}
                >
                  {form.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-500/25 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingGift ? 'Save Changes' : 'Create Gift'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
