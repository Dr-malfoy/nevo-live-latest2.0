import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Radio, ArrowLeftRight, Building2, UserPlus, Handshake, ShoppingBag, Plane, Dices, CircleDot, Headphones, ArrowRight, MessageSquare, CheckCircle, Send, X } from 'lucide-react';
import { adminApi } from '../api';
import { StatsCard } from '../components/StatsCard';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [teenPattiStats, setTeenPattiStats] = useState<any>(null);
  const [rouletteStats, setRouletteStats] = useState<any>(null);
  const [aviatorStats, setAviatorStats] = useState<any>(null);

  // Quick ticket review state
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('resolved');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState('');
  const [replyError, setReplyError] = useState('');

  const loadData = () => {
    adminApi.getDashboard().then(({ data }) => data.success && setStats(data.data));
    adminApi.getTeenPattiStats().then(({ data }) => data.success && setTeenPattiStats(data.data)).catch(() => {});
    adminApi.getRouletteStats().then(({ data }) => data.success && setRouletteStats(data.data)).catch(() => {});
    adminApi.getAviatorStats().then(({ data }) => data.success && setAviatorStats(data.data)).catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  const openReviewModal = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyMessage('');
    setReplyStatus('resolved');
    setReplyError('');
    setReplySuccess('');
  };

  const handleSendReply = async (customStatus?: string) => {
    if (!selectedTicket) return;
    const targetStatus = customStatus || replyStatus || 'resolved';

    if (!replyMessage.trim() && !customStatus) {
      setReplyError('Please write a reply message for the user.');
      return;
    }

    setSubmittingReply(true);
    setReplyError('');
    setReplySuccess('');

    try {
      const { data } = await adminApi.replyContactMessage(selectedTicket._id, {
        reply: replyMessage.trim() || undefined,
        status: targetStatus,
      });

      if (data.success) {
        setReplySuccess(`Reply sent and delivered directly to user's Messenger! Ticket marked as ${targetStatus}.`);
        setReplyMessage('');
        loadData();
        setTimeout(() => {
          setSelectedTicket(null);
          setReplySuccess('');
        }, 2000);
      }
    } catch (err: any) {
      setReplyError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-xs text-dark-400 mt-1">Platform overview, system statistics, and pending action items.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard label="Total Users" value={stats?.totalUsers ?? '...'} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
        <StatsCard label="Pending Tickets" value={stats?.pendingTickets ?? 0} icon={<Headphones className="w-5 h-5" />} color="text-amber-400" />
        <StatsCard label="Total Agents" value={stats?.totalAgents ?? '...'} icon={<Building2 className="w-5 h-5" />} color="text-green-400" />
        <StatsCard label="Total Hosts" value={stats?.totalHosts ?? '...'} icon={<UserPlus className="w-5 h-5" />} color="text-purple-400" />
        <StatsCard label="Active Streams" value={stats?.activeStreams ?? '...'} icon={<Radio className="w-5 h-5" />} color="text-red-400" />
        <StatsCard label="Diamond Inventory" value={stats?.diamondInventory?.toLocaleString() ?? '...'} icon={<DiamondIcon className="w-5 h-5" />} color="text-cyan-400" />
        <StatsCard label="Coin Inventory" value={stats?.coinInventory?.toLocaleString() ?? '...'} icon={<CoinIcon className="w-5 h-5" />} color="text-yellow-400" />
        <StatsCard label="Pending Transactions" value={stats?.pendingTransactions ?? '...'} icon={<ArrowLeftRight className="w-5 h-5" />} color="text-orange-400" />
        <StatsCard label="Pending Withdrawals" value={stats?.pendingWithdrawals ?? '...'} icon={<Handshake className="w-5 h-5" />} color="text-pink-400" />
        <StatsCard label="Pending Agent Orders" value={stats?.pendingAgentOrders ?? '...'} icon={<ShoppingBag className="w-5 h-5" />} color="text-teal-400" />
        <StatsCard label="TP Bets" value={teenPattiStats?.totalBets ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-amber-400" />
        <StatsCard label="TP Wins" value={teenPattiStats?.totalWins ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-lime-400" />
        <StatsCard label="TP Rounds" value={teenPattiStats?.rounds ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-teal-400" />
        <StatsCard label="Aviator Bets" value={aviatorStats?.totalBets ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-indigo-400" />
        <StatsCard label="Aviator Wins" value={aviatorStats?.totalWins ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-emerald-400" />
        <StatsCard label="Aviator Rounds" value={aviatorStats?.rounds ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-fuchsia-400" />
        <StatsCard label="Roulette Bets" value={rouletteStats?.totalBets ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-rose-400" />
        <StatsCard label="Roulette Wins" value={rouletteStats?.totalWins ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-red-400" />
        <StatsCard label="Roulette Rounds" value={rouletteStats?.rounds ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-pink-400" />
      </div>

      {/* ── Recent Support Tickets Section ────────────────────────────── */}
      <div className="bg-dark-850 rounded-2xl border border-dark-700/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Recent Support Tickets &amp; Inquiries</h3>
              <p className="text-xs text-dark-400">Review tickets submitted from Navo Live and reply straight to user Messenger.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/contact-messages')}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 transition"
          >
            <span>View All Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recentTickets && stats.recentTickets.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-dark-700 bg-dark-900/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-800 text-dark-400 font-semibold border-b border-dark-700">
                <tr>
                  <th className="p-3">Ticket ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Subject &amp; Message</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {stats.recentTickets.map((t: any) => {
                  let badge = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
                  if (t.status === 'in_progress') badge = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                  if (t.status === 'resolved') badge = 'bg-green-500/20 text-green-400 border border-green-500/30';
                  if (t.status === 'closed') badge = 'bg-dark-700 text-dark-400 border border-dark-600';

                  return (
                    <tr key={t._id} className="hover:bg-dark-800/40 transition">
                      <td className="p-3 font-mono font-bold text-primary-400">
                        {t.ticketId || `TK-${t._id.slice(-6).toUpperCase()}`}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-dark-100">{t.userId?.nickname || 'Unknown'}</div>
                        <div className="text-[11px] text-dark-400">UID: {t.userId?.uid || '—'}</div>
                      </td>
                      <td className="p-3">
                        <span className="bg-dark-800 text-dark-300 px-2 py-0.5 rounded border border-dark-700">
                          {t.category || 'General'}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-semibold text-dark-200 truncate">{t.subject}</div>
                        <div className="text-[11px] text-dark-400 truncate mt-0.5">{t.message}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${badge}`}>
                          {t.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-3 text-dark-400 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => openReviewModal(t)}
                          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ml-auto shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Review &amp; Reply</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-dark-400 text-xs bg-dark-900/40 rounded-xl border border-dark-800">
            No support tickets yet. New user tickets from Help Center will appear here in real time.
          </div>
        )}
      </div>

      {/* ── Quick Ticket Review Modal ─────────────────────────────────── */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-dark-800 border border-dark-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-dark-700 bg-dark-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-primary-400 bg-primary-950/60 border border-primary-800/50 px-2.5 py-1 rounded-lg">
                  {selectedTicket.ticketId || `TK-${selectedTicket._id.slice(-6).toUpperCase()}`}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Review Ticket &amp; Send Messenger Reply</h4>
                  <p className="text-[11px] text-dark-400">
                    User: {selectedTicket.userId?.nickname || 'Unknown'} (UID: {selectedTicket.userId?.uid || '—'}) • Category: {selectedTicket.category || 'General'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {replySuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{replySuccess}</span>
                </div>
              )}
              {replyError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium">
                  {replyError}
                </div>
              )}

              {/* Subject */}
              <div className="border-b border-dark-700/80 pb-3">
                <span className="text-[10px] text-dark-500 uppercase font-bold tracking-wider">Ticket Subject</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedTicket.subject}</h3>
                <span className="text-[11px] text-dark-400">Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}</span>
              </div>

              {/* User Initial Message */}
              <div className="p-4 bg-dark-900/90 rounded-xl border border-dark-700 space-y-1">
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                  User Issue Details
                </span>
                <p className="text-xs text-dark-200 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Previous Replies Thread */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-dark-300 block">Conversation History:</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedTicket.replies.map((r: any, idx: number) => {
                      const isStaff = r.sender === 'admin' || r.sender === 'support';
                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                            isStaff ? 'bg-primary-950/40 border-primary-800/50 ml-4' : 'bg-dark-700/80 border-dark-600 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${isStaff ? 'text-primary-400' : 'text-dark-300'}`}>
                              {isStaff ? 'Official Support (Admin)' : r.senderName || 'User'}
                            </span>
                            <span className="text-dark-500">
                              {r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}
                            </span>
                          </div>
                          <p className="text-dark-100 whitespace-pre-wrap">{r.message}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Reply Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-dark-400 font-semibold">Quick Reply Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Your asset password has been reset. Please verify and change it in Profile > Settings.',
                    'Your issue has been verified and resolved. Thank you for contacting Navo Live Support!',
                    'Please provide your transaction ID or screenshot so our billing team can verify.',
                    'Coins have been credited to your wallet balance. Please pull down to refresh.',
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyMessage((prev) => (prev ? `${prev}\n${preset}` : preset))}
                      className="text-[11px] px-2.5 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg transition"
                    >
                      {preset.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Reply Box */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-dark-200 block flex items-center justify-between">
                  <span>Write Reply to User:</span>
                  <span className="text-[11px] text-emerald-400 font-normal">
                    💬 Message will be delivered directly to User's Messenger
                  </span>
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your reply to the user... (This will appear in their Messenger chat)"
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary-500 resize-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-400 font-semibold">Set Status:</span>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value)}
                      className="bg-dark-900 border border-dark-600 text-xs text-dark-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={submittingReply}
                      onClick={() => handleSendReply('closed')}
                      className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-xs font-semibold transition"
                    >
                      Close Ticket
                    </button>
                    <button
                      type="button"
                      disabled={submittingReply}
                      onClick={() => handleSendReply()}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingReply ? 'Sending...' : 'Send to Messenger & Update'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-dark-700 bg-dark-900 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl text-xs font-semibold"
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
