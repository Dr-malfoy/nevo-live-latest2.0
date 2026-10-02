import { useEffect, useState } from 'react';
import { Search, BadgeCheck, Coins, Send, X, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';
import { HostBadge } from '../components/HostBadge';

const SELLER_TYPES = [
  { value: 'none', label: 'None', icon: null },
  { value: 'official', label: 'Official', icon: BadgeCheck, cls: 'text-sky-400' },
  { value: 'paylor', label: 'Paylor', icon: Coins, cls: 'text-amber-400' },
];

const HOST_BADGES = [
  { value: 'none', label: 'None' },
  { value: 'alpha', label: 'Alpha Host' },
  { value: 'aurora', label: 'Aurora Host' },
];

export const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  // Quick send modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalCurrency, setModalCurrency] = useState<'diamond' | 'coin'>('diamond');
  const [modalAmount, setModalAmount] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [modalErr, setModalErr] = useState('');

  const load = async (p: number, s: string) => {
    setLoading(true);
    try {
      const { data } = await adminApi.getUsers({ page: p, limit: 20, search: s });
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, search);
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    load(1, search);
  };

  const handleSellerType = async (id: string, sellerType: 'none' | 'official' | 'paylor') => {
    await adminApi.setSellerType(id, sellerType);
    load(page, search);
  };

  const handleHostBadge = async (id: string, hostBadge: 'alpha' | 'aurora' | 'none') => {
    await adminApi.setHostBadge(id, hostBadge);
    load(page, search);
  };

  const openSendModal = (user: any) => {
    setSelectedUser(user);
    setModalCurrency('diamond');
    setModalAmount('');
    setModalMsg('');
    setModalErr('');
  };

  const handleQuickSend = async () => {
    if (!selectedUser) return;
    const numAmount = parseInt(modalAmount, 10);
    if (!numAmount || numAmount <= 0) {
      setModalErr('Please enter a valid amount');
      return;
    }

    setModalSaving(true);
    setModalMsg('');
    setModalErr('');
    try {
      await adminApi.transferCurrency({
        targetId: selectedUser.uid || selectedUser._id,
        currency: modalCurrency,
        amount: numAmount,
      });
      setModalMsg(`Sent ${numAmount.toLocaleString()} ${modalCurrency}s to ${selectedUser.nickname}!`);
      setModalAmount('');
      load(page, search);
    } catch (e: any) {
      setModalErr(e.response?.data?.error || 'Transfer failed');
    } finally {
      setModalSaving(false);
    }
  };

  const columns = [
    { key: 'uid', label: 'UID' },
    { key: 'nickname', label: 'Nickname' },
    { key: 'phone', label: 'Phone' },
    { key: 'level', label: 'Level' },
    {
      key: 'diamonds',
      label: 'Diamonds',
      render: (r: any) => (
        <span className="font-mono text-cyan-400 flex items-center gap-1">
          <DiamondIcon className="w-3.5 h-3.5" />
          {r.diamonds?.toLocaleString() ?? 0}
        </span>
      ),
    },
    {
      key: 'coins',
      label: 'Coins',
      render: (r: any) => (
        <span className="font-mono text-yellow-400 flex items-center gap-1">
          <CoinIcon className="w-3.5 h-3.5" />
          {r.coins?.toLocaleString() ?? 0}
        </span>
      ),
    },
    { key: 'isAgent', label: 'Agent', render: (r: any) => (r.isAgent ? '✓' : '—') },
    {
      key: 'isBanned',
      label: 'Banned',
      render: (r: any) => (
        <span className={r.isBanned ? 'text-red-400' : 'text-green-400'}>
          {r.isBanned ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'sellerType',
      label: 'Seller Badge',
      render: (r: any) => (
        <select
          value={r.sellerType || 'none'}
          onChange={(e) => handleSellerType(r._id, e.target.value as any)}
          className={`bg-dark-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none ${
            r.sellerType === 'official'
              ? 'text-sky-400'
              : r.sellerType === 'paylor'
              ? 'text-amber-400'
              : 'text-dark-300'
          }`}
          aria-label={`Seller badge for ${r.nickname}`}
        >
          {SELLER_TYPES.map(({ value, label }) => (
            <option key={value} value={value} className="text-white">
              {label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'hostBadge',
      label: 'Host Badge',
      render: (r: any) => (
        <select
          value={r.hostBadge || 'none'}
          onChange={(e) => handleHostBadge(r._id, e.target.value as any)}
          className={`bg-dark-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none ${
            r.hostBadge === 'alpha'
              ? 'text-yellow-300 border border-yellow-500/40'
              : r.hostBadge === 'aurora'
              ? 'text-pink-300 border border-pink-500/40'
              : 'text-dark-300'
          }`}
          aria-label={`Host badge for ${r.nickname}`}
        >
          {HOST_BADGES.map(({ value, label }) => (
            <option key={value} value={value} className="text-white">
              {label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: any) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openSendModal(r)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary-600/20 hover:bg-primary-600/40 text-primary-300 border border-primary-500/30 transition-colors"
            title="Send Diamonds or Coins"
          >
            <Send className="w-3 h-3" /> Send
          </button>
          <button
            onClick={() => adminApi.toggleBan(r._id).then(() => load(page, search))}
            className={`text-xs px-2 py-1 rounded ${r.isBanned ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {r.isBanned ? 'Unban' : 'Ban'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-xs text-dark-400 mt-0.5">Manage users, ban status, seller badges, and balance top-ups</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search UID / Name..."
            className="bg-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none w-48"
          />
          <button onClick={handleSearch} className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg">
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Quick Send Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-400" /> Send Currency
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient summary */}
            <div className="bg-dark-900 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">{selectedUser.nickname}</p>
                <p className="text-xs text-dark-400 font-mono">UID: {selectedUser.uid}</p>
              </div>
              <div className="text-right text-xs space-y-0.5">
                <p className="text-cyan-400 font-mono flex items-center justify-end gap-1">
                  <DiamondIcon className="w-3 h-3" /> {selectedUser.diamonds?.toLocaleString() ?? 0}
                </p>
                <p className="text-yellow-400 font-mono flex items-center justify-end gap-1">
                  <CoinIcon className="w-3 h-3" /> {selectedUser.coins?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>

            {/* Currency selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalCurrency('diamond')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  modalCurrency === 'diamond'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-dark-900 border-dark-700 text-dark-400'
                }`}
              >
                <DiamondIcon className="w-4 h-4 text-cyan-400" /> Diamond (💎)
              </button>
              <button
                type="button"
                onClick={() => setModalCurrency('coin')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  modalCurrency === 'coin'
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                    : 'bg-dark-900 border-dark-700 text-dark-400'
                }`}
              >
                <CoinIcon className="w-4 h-4 text-yellow-400" /> Coin (🪙)
              </button>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-1 block">
                Amount (Unlimited Admin Issuing)
              </label>
              <input
                type="number"
                min="1"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                placeholder="Enter amount (e.g. 50000)"
                className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 font-mono"
              />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[1000, 10000, 50000, 100000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      const cur = parseInt(modalAmount, 10) || 0;
                      setModalAmount(String(cur + val));
                    }}
                    className="px-2 py-0.5 bg-dark-700 hover:bg-dark-600 text-dark-300 text-xs rounded font-mono"
                  >
                    +{val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {modalErr && (
              <div className="bg-red-900/20 border border-red-500/40 text-red-300 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{modalErr}</span>
              </div>
            )}
            {modalMsg && (
              <div className="bg-green-900/20 border border-green-500/40 text-green-300 text-xs p-3 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span>{modalMsg}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleQuickSend}
                disabled={modalSaving || !modalAmount || parseInt(modalAmount, 10) <= 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary-600/20"
              >
                {modalSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" /> Send {modalCurrency === 'diamond' ? 'Diamonds' : 'Coins'}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
