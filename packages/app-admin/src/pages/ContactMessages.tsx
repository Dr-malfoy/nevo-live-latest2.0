import React, { useEffect, useState } from 'react';
import { adminApi } from '../api';
import { DataTable } from '../components/DataTable';

interface TelegramConfig {
  channelUrl: string;
  supportUrl: string;
  groupUrl: string;
}

export const ContactMessages: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'telegram'>('tickets');

  // Tickets state
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected Ticket for Reply Section Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<string>('resolved');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');

  // Telegram Config state
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    channelUrl: 'https://t.me/nevolive_official',
    supportUrl: 'https://t.me/nevolive_support',
    groupUrl: 'https://t.me/nevolive_group',
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');

  // Load tickets
  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (status) params.status = status;
      if (categoryFilter) params.category = categoryFilter;
      const { data } = await adminApi.getContactMessages(params);
      if (data.success) {
        setMessages(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Telegram config
  const loadTelegramConfig = async () => {
    setLoadingConfig(true);
    try {
      const { data } = await adminApi.getTelegramConfig();
      if (data.success && data.data) {
        setTelegramConfig({
          channelUrl: data.data.channelUrl || 'https://t.me/nevolive_official',
          supportUrl: data.data.supportUrl || 'https://t.me/nevolive_support',
          groupUrl: data.data.groupUrl || 'https://t.me/nevolive_group',
        });
      }
    } catch (err: any) {
      console.error('Failed to load telegram config', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    } else {
      loadTelegramConfig();
    }
  }, [page, status, categoryFilter, activeTab]);

  // Open Reply Modal
  const openReplyModal = (ticket: any) => {
    setSelectedTicket(ticket);
    setReplyMessage('');
    setReplyStatus(ticket.status === 'resolved' ? 'resolved' : 'resolved');
    setReplyError('');
    setReplySuccess('');
  };

  // Submit Admin Reply
  const handleSendReply = async (customStatus?: string) => {
    if (!selectedTicket) return;
    const targetStatus = customStatus || replyStatus || 'resolved';

    if (!replyMessage.trim() && !customStatus) {
      setReplyError('Please write a reply message or select a status.');
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
        setReplySuccess(`Reply sent & ticket marked as ${targetStatus}!`);
        setSelectedTicket(data.data);
        setReplyMessage('');
        loadTickets();
        setTimeout(() => {
          setReplySuccess('');
        }, 3000);
      }
    } catch (err: any) {
      setReplyError(err.response?.data?.error || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Quick Preset Replies
  const applyPreset = (preset: string) => {
    setReplyMessage((prev) => (prev ? `${prev}\n${preset}` : preset));
  };

  // Save Telegram Config
  const handleSaveTelegramConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSuccess('');
    setConfigError('');

    try {
      const { data } = await adminApi.updateTelegramConfig(telegramConfig);
      if (data.success) {
        setConfigSuccess('Telegram links updated successfully! All users will see the updated links immediately.');
        setTelegramConfig(data.data);
        setTimeout(() => setConfigSuccess(''), 4000);
      }
    } catch (err: any) {
      setConfigError(err.response?.data?.error || 'Failed to update telegram configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const statuses = ['', 'pending', 'in_progress', 'resolved', 'closed'];

  const columns = [
    {
      key: 'ticketId',
      label: 'Ticket ID',
      render: (r: any) => (
        <span className="font-mono text-xs font-bold text-primary-400 bg-primary-950/60 border border-primary-800/50 px-2 py-0.5 rounded">
          {r.ticketId || `TK-${r._id.slice(-6).toUpperCase()}`}
        </span>
      ),
    },
    {
      key: 'userId',
      label: 'User',
      render: (r: any) =>
        typeof r.userId === 'object' ? (
          <div>
            <p className="font-medium text-sm text-dark-100">{r.userId?.nickname || '—'}</p>
            <p className="text-[11px] text-dark-400">UID: {r.userId?.uid || '—'}</p>
            {r.userId?.phone && <p className="text-[10px] text-dark-500">{r.userId.phone}</p>}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (r: any) => (
        <span className="text-xs bg-dark-700 text-dark-300 px-2 py-0.5 rounded border border-dark-600">
          {r.category || 'General'}
        </span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (r: any) => <span className="font-medium text-sm text-dark-200">{r.subject}</span>,
    },
    {
      key: 'message',
      label: 'Message',
      render: (r: any) => <span className="text-xs text-dark-400 max-w-[240px] truncate block">{r.message}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (r: any) => {
        let badgeClass = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
        if (r.status === 'in_progress') badgeClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
        if (r.status === 'resolved') badgeClass = 'bg-green-500/20 text-green-400 border border-green-500/30';
        if (r.status === 'closed') badgeClass = 'bg-dark-600 text-dark-400 border border-dark-500';
        return (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${badgeClass}`}>
            {r.status || 'pending'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (r: any) => (
        <span className="text-xs text-dark-400 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</span>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (r: any) => (
        <button
          onClick={() => openReplyModal(r)}
          className="text-xs font-semibold px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors flex items-center gap-1 shadow-sm"
        >
          <span>Reply</span>
          {r.replies && r.replies.length > 0 && (
            <span className="bg-primary-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {r.replies.length}
            </span>
          )}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Support &amp; Help Center</h2>
          <p className="text-xs text-dark-400 mt-1">
            Manage user support tickets, respond to inquiries, and configure official Telegram links.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 bg-dark-800 p-1 rounded-xl border border-dark-700 shrink-0">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'tickets' ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-white'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'telegram' ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-white'
            }`}
          >
            <span>Telegram Settings</span>
            <span className="w-2 h-2 rounded-full bg-sky-400" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SUPPORT TICKETS LIST */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-800/80 p-3 rounded-xl border border-dark-700">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-dark-400 mr-1 font-medium">Status:</span>
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors font-medium ${
                    status === s
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600 hover:text-white'
                  }`}
                >
                  {s ? s.replace('_', ' ') : 'All Tickets'}
                </button>
              ))}
            </div>

            <button
              onClick={loadTickets}
              className="text-xs px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg transition"
            >
              Refresh
            </button>
          </div>

          <DataTable
            columns={columns}
            data={messages}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DYNAMIC TELEGRAM CONFIGURATION */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'telegram' && (
        <div className="max-w-2xl bg-dark-800 rounded-2xl border border-dark-700 p-6 space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-sky-400">Telegram</span> Dynamic Links Configuration
            </h3>
            <p className="text-xs text-dark-400 mt-1">
              Changes made here are applied in real-time across the user app (Help Center, Quick Chat, and Channel buttons).
            </p>
          </div>

          {configSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs font-medium">
              {configSuccess}
            </div>
          )}

          {configError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium">
              {configError}
            </div>
          )}

          {loadingConfig ? (
            <div className="py-8 text-center text-dark-400 text-xs">Loading telegram configuration...</div>
          ) : (
            <form onSubmit={handleSaveTelegramConfig} className="space-y-5">
              {/* Field 1: Telegram Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-200 flex items-center justify-between">
                  <span>Official Telegram Channel URL</span>
                  <span className="text-[10px] text-dark-400">Joined by users for platform news &amp; announcements</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={telegramConfig.channelUrl}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, channelUrl: e.target.value })}
                    required
                    placeholder="https://t.me/nevolive_official"
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                  />
                  <a
                    href={telegramConfig.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-xl text-xs font-semibold shrink-0"
                  >
                    Test Link
                  </a>
                </div>
              </div>

              {/* Field 2: Telegram Support Chat */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-200 flex items-center justify-between">
                  <span>Telegram 24/7 Support URL</span>
                  <span className="text-[10px] text-dark-400">Used for direct 24/7 customer support chat</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={telegramConfig.supportUrl}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, supportUrl: e.target.value })}
                    required
                    placeholder="https://t.me/nevolive_support"
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                  />
                  <a
                    href={telegramConfig.supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-xl text-xs font-semibold shrink-0"
                  >
                    Test Link
                  </a>
                </div>
              </div>

              {/* Field 3: Telegram Community Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-200 flex items-center justify-between">
                  <span>Telegram Community Group URL</span>
                  <span className="text-[10px] text-dark-400">Official discussion and streamer group</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={telegramConfig.groupUrl}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, groupUrl: e.target.value })}
                    placeholder="https://t.me/nevolive_group"
                    className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
                  />
                  {telegramConfig.groupUrl && (
                    <a
                      href={telegramConfig.groupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-xl text-xs font-semibold shrink-0"
                    >
                      Test Link
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 active:scale-95 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-md shadow-primary-900/30"
                >
                  {savingConfig ? 'Saving Settings...' : 'Save Telegram Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* REPLY SECTION MODAL & CONVERSATION THREAD */}
      {/* ══════════════════════════════════════════════════════════════ */}
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
                  <span className="text-xs text-dark-300 font-medium">
                    User: {selectedTicket.userId?.nickname || 'Unknown'} (UID: {selectedTicket.userId?.uid || '—'})
                  </span>
                  <span className="text-[11px] text-dark-500 block">
                    Category: {selectedTicket.category || 'General'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Feedback messages */}
              {replySuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-xs font-medium">
                  {replySuccess}
                </div>
              )}
              {replyError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium">
                  {replyError}
                </div>
              )}

              {/* Ticket Subject & Creation Date */}
              <div className="border-b border-dark-700/80 pb-3">
                <span className="text-[10px] text-dark-500 uppercase font-bold tracking-wider">Subject</span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedTicket.subject}</h3>
                <span className="text-[11px] text-dark-400">
                  Submitted on {new Date(selectedTicket.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Initial User Message Box */}
              <div className="p-4 bg-dark-900/90 rounded-xl border border-dark-700 space-y-1">
                <span className="text-[11px] font-bold text-amber-400 block uppercase tracking-wider">
                  Initial Issue Report
                </span>
                <p className="text-xs text-dark-200 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>

              {/* Conversation History Thread */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-dark-300 block">Conversation History</span>

                {/* Legacy single admin reply */}
                {selectedTicket.adminReply && (!selectedTicket.replies || selectedTicket.replies.length === 0) && (
                  <div className="p-3 bg-primary-950/40 border border-primary-800/40 rounded-xl space-y-1 ml-4">
                    <div className="flex items-center justify-between text-[10px] text-primary-400">
                      <span className="font-bold">Official Support (Admin)</span>
                      <span>{new Date(selectedTicket.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-dark-200 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
                  </div>
                )}

                {/* Full thread */}
                {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((reply: any, idx: number) => {
                    const isStaff = reply.sender === 'admin' || reply.sender === 'support';
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isStaff
                            ? 'bg-primary-950/40 border-primary-800/50 ml-4'
                            : 'bg-dark-700/80 border-dark-600 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-bold ${isStaff ? 'text-primary-400' : 'text-dark-300'}`}>
                            {isStaff ? 'Official Support (Admin)' : reply.senderName || 'User'}
                          </span>
                          <span className="text-dark-500">
                            {reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-dark-100 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    );
                  })
                ) : (
                  !selectedTicket.adminReply && (
                    <p className="text-xs text-dark-500 italic">No replies recorded in this thread yet.</p>
                  )
                )}
              </div>

              {/* Quick Reply Presets */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] text-dark-400 font-semibold">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Your issue has been verified and resolved. Thank you for your patience!',
                    'Please provide your payment transaction ID or screenshot so we can investigate.',
                    'Your account verification is under review and will be updated shortly.',
                    'Coins have been credited to your balance.',
                  ].map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-[11px] px-2.5 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white rounded-lg transition"
                    >
                      {preset.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Reply Input Box */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-dark-200 block">Write Support Reply:</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your response to the user here..."
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-primary-500 resize-none"
                />

                {/* Status selector */}
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
                      onClick={() => handleSendReply('resolved')}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      {submittingReply ? 'Sending...' : 'Send Reply & Resolve'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-dark-700 bg-dark-900 flex justify-end">
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

export default ContactMessages;
