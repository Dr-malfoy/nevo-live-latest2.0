import { useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiPlusBold as Plus, PiDownloadSimpleBold as ArrowDownToLine, PiFlagFill as Flag } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { Card, Loading } from '../components/ui';
import { useAuthStore } from '../stores';
import client from '../api/client';
import { paymentApi } from '../api/payment.api';
import { ReportModal } from '../components/report/ReportModal';
import { DiamondIcon, CoinIcon } from '../components/ui/CurrencyIcon';
import { DailyRewardCard } from '../components/reward/DailyRewardCard';
import type { Transaction } from '../types';

export const Wallet = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'withdraw' | 'history'>('orders');
  const [reportTarget, setReportTarget] = useState<{ type: 'transaction'; id: string } | null>(null);

  useEffect(() => {
    Promise.all([
      client.get('/transactions', { params: { limit: 50 } }),
      client.get('/payment/orders', { params: { limit: 50 } }),
      paymentApi.getWithdrawals({ limit: 50 }),
      client.get('/users/me'),
    ]).then(([t, o, s, u]) => {
      if (t.data.success) setTransactions(t.data.data || []);
      if (o.data.success) setOrders(o.data.data || []);
      if (s.data.success) setWithdrawals(s.data.data || []);
      if (u.data.success && u.data.data) updateUser(u.data.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Wallet</h1>
      </div>

      {/* Balance */}
      <div className="flex gap-4 p-4">
        <Card className="flex-1 text-center">
          <DiamondIcon className="w-6 h-6 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{user?.diamonds?.toLocaleString() || 0}</p>
          <p className="text-xs text-ink-muted">Diamonds</p>
        </Card>
        <Card className="flex-1 text-center">
          <CoinIcon className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{user?.coins?.toLocaleString() || 0}</p>
          <p className="text-xs text-ink-muted">Coins</p>
        </Card>
      </div>

      {/* Daily Count Reward */}
      <div className="px-4 mb-4">
        <DailyRewardCard />
      </div>

      {/* Action buttons */}
      <div className="px-4 mb-4 flex gap-2">
        <button onClick={() => navigate('/recharge')} className="flex-1 py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 transition-transform">
          <Plus className="w-4 h-4" /> Buy
        </button>
        <button onClick={() => navigate('/withdraw')} className={`flex-1 py-3 bg-yellow-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95 transition-transform ${user?.agencyId ? '' : 'opacity-50'}`}>
          <ArrowDownToLine className="w-4 h-4" /> Withdraw
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 mb-4">
        {(['orders', 'withdraw', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-black text-white' : 'text-ink-muted hover:text-ink'}`}>
            {/* The old label map tested for a 'sell' tab that does not exist,
                so 'withdraw' and 'history' both rendered as "History". */}
            {t === 'orders' ? 'Purchase Orders' : t === 'withdraw' ? 'Withdrawals' : 'History'}
          </button>
        ))}
      </div>

      {/* Purchase Orders Tab */}
      {tab === 'orders' && (
        orders.length === 0 ? <p className="text-ink-faint text-sm text-center py-8">No purchase orders</p> : (
          <div className="px-4 space-y-2">
            {orders.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                <div>
                  <p className="text-sm">৳{o.amountBdt} {o.diamonds > 0 ? <span className="inline-flex items-center gap-0.5"><DiamondIcon />{o.diamonds}</span> : o.coins > 0 ? <span className="inline-flex items-center gap-0.5"><CoinIcon />{o.coins}</span> : ''}</p>
                  <p className="text-xs text-ink-muted capitalize">{o.paymentMethod} · {new Date(o.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {o.status === 'pending' && (
                    <button onClick={() => setReportTarget({ type: 'transaction', id: o._id })} className="text-ink-faint hover:text-red-400 transition-colors" aria-label="Report">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${o.status === 'confirmed' ? 'bg-green-600' : o.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Withdrawal Requests Tab */}
      {tab === 'withdraw' && (
        withdrawals.length === 0 ? <p className="text-ink-faint text-sm text-center py-8">No withdrawal requests</p> : (
          <div className="px-4 space-y-2">
            {withdrawals.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                <div>
                  <p className="text-sm">{r.amount?.toLocaleString()} {r.currency} → ৳{r.amountBdt?.toLocaleString()}</p>
                  <p className="text-xs text-ink-muted capitalize">{r.method} · {new Date(r.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'pending' && (
                    <button onClick={() => setReportTarget({ type: 'transaction', id: r._id })} className="text-ink-faint hover:text-red-400 transition-colors" aria-label="Report">
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${r.status === 'paid' ? 'bg-green-600' : r.status === 'approved' ? 'bg-blue-600' : r.status === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Transaction history */}
      {tab === 'history' && (
        <div className="px-4">
          {loading ? (
            <Loading />
          ) : transactions.length === 0 ? (
            <p className="text-ink-faint text-sm text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg">
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                    {tx.description && <p className="text-xs text-ink-muted">{tx.description}</p>}
                    <p className="text-xs text-ink-muted">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'gift_send' || tx.type === 'withdraw' || tx.type === 'coin_sale' ? 'text-red-400' : 'text-green-400'}`}>
                    {tx.type === 'gift_send' || tx.type === 'withdraw' || tx.type === 'coin_sale' ? '-' : '+'}{tx.amount}
                    <span className="text-[10px] ml-1">{tx.currency}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {reportTarget && (
        <ReportModal
          targetType="transaction"
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};
