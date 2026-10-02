import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiPaperPlaneRightFill as Send,
  PiCheckCircleFill as CheckCircle,
  PiClockFill as Clock,
  PiChatsFill as ChatIcon,
  PiTelegramLogoFill as TelegramIcon,
  PiQuestionFill as QuestionMark,
  PiTicketFill as TicketIcon,
  PiMagnifyingGlassBold as SearchIcon,
  PiCaretDownBold as ChevronDown,
  PiCaretUpBold as ChevronUp,
  PiCopyBold as CopyIcon,
  PiXBold as CloseIcon,
  PiShieldCheckFill as ShieldCheck,
  PiArrowRightBold as ArrowRight,
  PiWarningCircleFill as AlertCircle,
  PiHeadphonesFill as Headphones,
  PiSparkleFill as Sparkle,
} from 'react-icons/pi';
import { contactApi, type SupportTicket } from '../api/contact.api';
import { useAuthStore, useUIStore } from '../stores';

const DEFAULT_TELEGRAM_CHANNEL = 'https://t.me/nevolive_official';
const DEFAULT_TELEGRAM_SUPPORT = 'https://t.me/nevolive_support';
const DEFAULT_TELEGRAM_GROUP = 'https://t.me/nevolive_group';


const FAQ_CATEGORIES = [
  'All',
  'Recharge & Coins',
  'Withdraw & Diamonds',
  'Account & Security',
  'Live & Party Rooms',
  'Levels & Rewards',
  'Safety & Rules',
] as const;

interface FAQItem {
  id: string;
  category: typeof FAQ_CATEGORIES[number];
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'f1',
    category: 'Recharge & Coins',
    question: 'How do I recharge or purchase Coins?',
    answer: 'Go to your Wallet or Profile page and tap "Recharge" or "Top-Up". Choose your desired coin package and select a payment method (bKash, Nagad, Card, or Crypto). Once payment is confirmed, coins are credited to your account instantly.',
  },
  {
    id: 'f2',
    category: 'Recharge & Coins',
    question: 'My payment was successful but coins are not showing in my wallet. What should I do?',
    answer: 'Transactions usually credit within a few seconds. If there is a slight delay, pull down on the Wallet screen to refresh. If coins do not appear within 10 minutes, please submit a Support Ticket with your transaction ID / payment receipt or message our 24/7 Telegram Support team.',
  },
  {
    id: 'f3',
    category: 'Withdraw & Diamonds',
    question: 'How do I withdraw my earnings (Diamonds)?',
    answer: 'Navigate to "Income" or "Withdraw" from your profile. Ensure your payout method (bKash, Nagad, Bank Account, or USDT) is configured under Payment Settings. You can request a withdrawal once you meet the minimum diamond balance requirement.',
  },
  {
    id: 'f4',
    category: 'Withdraw & Diamonds',
    question: 'How long do withdrawals take to process?',
    answer: 'Standard withdrawals are processed by the finance team within 24 to 48 hours on business days. You can track the status of your withdrawal anytime in your Transaction Details.',
  },
  {
    id: 'f5',
    category: 'Account & Security',
    question: 'How can I verify my account or become an Official Host?',
    answer: 'Go to Profile > Verification Center. Complete your identity verification by providing your details and ID documents. Once reviewed and approved by our team, you will receive official verification badge and host privileges.',
  },
  {
    id: 'f6',
    category: 'Account & Security',
    question: 'How do I change my password or set an Asset Password?',
    answer: 'Go to Profile > Settings > Change Password to update your login password. To secure your wallet transactions and coin transfers, go to Profile > Asset Password to create a 6-digit payment PIN.',
  },
  {
    id: 'f7',
    category: 'Live & Party Rooms',
    question: 'How do I start a Live Stream or host a Party Room?',
    answer: 'Tap the "+" or Go Live floating button at the bottom center of your screen. Choose whether to start a Single Live broadcast or an Audio Party room, set your title and cover, and tap "Start Live".',
  },
  {
    id: 'f8',
    category: 'Live & Party Rooms',
    question: 'What is PK Battle and how do I participate?',
    answer: 'During a live stream, tap the PK Battle icon on your host control bar. You can challenge random hosts or invite mutual friends to a timed 1v1 or team gift battle to entertain your viewers.',
  },
  {
    id: 'f9',
    category: 'Levels & Rewards',
    question: 'How do I increase my Wealth Level and Streamer Level?',
    answer: 'Sending gifts and recharging coins increases your Wealth Level. Broadcasting live, receiving gifts, and completing daily active missions increases your Streamer Level. Each tier unlocks exclusive badges, entrance animations, and room privileges.',
  },
  {
    id: 'f10',
    category: 'Safety & Rules',
    question: 'How do I report harassment or inappropriate content?',
    answer: 'You can tap the Report icon directly on any user\'s profile, livestream, moment, or chat message. Our moderation team reviews reports 24/7 and takes immediate action against policy violations.',
  },
];

const TICKET_CATEGORIES = [
  'Recharge & Payment',
  'Withdrawal & Income',
  'Account & Verification',
  'Live Stream & Rooms',
  'Gifts & Inventory',
  'Bug & Technical Issue',
  'Report User / Safety',
  'General Inquiry',
];

export const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showToast = useUIStore((s) => s.showToast);
  const { isAuthenticated } = useAuthStore();

  const initialTab = (searchParams.get('tab') as 'faq' | 'ticket' | 'my-tickets') || 'faq';
  const [activeTab, setActiveTab] = useState<'faq' | 'ticket' | 'my-tickets'>(initialTab);

  // FAQ state
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('f1');

  // Create Ticket state
  const [ticketCategory, setTicketCategory] = useState(TICKET_CATEGORIES[0]);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);
  const [ticketError, setTicketError] = useState('');

  // My Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Ticket Reply state
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

  // Dynamic Telegram config from admin
  const [telegramConfig, setTelegramConfig] = useState({
    channelUrl: DEFAULT_TELEGRAM_CHANNEL,
    supportUrl: DEFAULT_TELEGRAM_SUPPORT,
    groupUrl: DEFAULT_TELEGRAM_GROUP,
  });

  // Load dynamic Telegram links
  useEffect(() => {
    contactApi
      .getTelegramConfig()
      .then(({ data }) => {
        if (data.success && data.data) {
          setTelegramConfig({
            channelUrl: data.data.channelUrl || DEFAULT_TELEGRAM_CHANNEL,
            supportUrl: data.data.supportUrl || DEFAULT_TELEGRAM_SUPPORT,
            groupUrl: data.data.groupUrl || DEFAULT_TELEGRAM_GROUP,
          });
        }
      })
      .catch(() => {});
  }, []);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'ticket' || tab === 'my-tickets' || tab === 'faq') {
      setActiveTab(tab);
    }
  }, [searchParams]);


  const handleTabChange = (tab: 'faq' | 'ticket' | 'my-tickets') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load user tickets when on My Tickets tab
  const loadMyTickets = async () => {
    if (!isAuthenticated) return;
    setLoadingTickets(true);
    try {
      const { data } = await contactApi.getMyMessages({
        status: ticketStatusFilter === 'all' ? undefined : ticketStatusFilter,
        limit: 50,
      });
      if (data.success && data.data) {
        setTickets(data.data);
      }
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my-tickets' || createdTicket) {
      loadMyTickets();
    }
  }, [activeTab, ticketStatusFilter, isAuthenticated]);

  // Load single ticket details for modal view
  const openTicketDetails = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const { data } = await contactApi.getMessageById(ticket._id || ticket.ticketId);
      if (data.success && data.data) {
        setSelectedTicket(data.data);
      }
    } catch {
      // Keep selected ticket state as is
    }
  };

  // Submit Ticket Handler
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) {
      setTicketError('Please provide a subject for your issue.');
      return;
    }
    if (!ticketMessage.trim() || ticketMessage.trim().length < 10) {
      setTicketError('Please provide a detailed message (at least 10 characters).');
      return;
    }

    setTicketError('');
    setIsSubmitting(true);

    try {
      const { data } = await contactApi.sendMessage({
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        category: ticketCategory,
      });

      if (data.success && data.data) {
        setCreatedTicket(data.data);
        setTicketSubject('');
        setTicketMessage('');
        showToast('Support ticket submitted successfully!', 'success');
        loadMyTickets();
      } else {
        setTicketError(data.message || 'Failed to submit ticket. Please try again.');
      }
    } catch (err: any) {
      setTicketError(err.response?.data?.error || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Reply Handler
  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    setIsReplying(true);
    setReplyError('');

    try {
      const { data } = await contactApi.addReply(selectedTicket._id || selectedTicket.ticketId, {
        message: replyText.trim(),
      });

      if (data.success && data.data) {
        setSelectedTicket(data.data);
        setReplyText('');
        showToast('Reply sent', 'success');
        loadMyTickets();
      }
    } catch (err: any) {
      setReplyError(err.response?.data?.error || 'Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied Ticket ID: ${text}`, 'info');
  };

  // Filtered FAQs
  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCat = selectedFaqCategory === 'All' || item.category === selectedFaqCategory;
    const matchesSearch =
      faqSearch.trim() === '' ||
      item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">Pending</span>;
      case 'in_progress':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/30">In Progress</span>;
      case 'resolved':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">Resolved</span>;
      case 'closed':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/30">Closed</span>;
      default:
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f1117] text-slate-800 dark:text-slate-100 flex flex-col pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#161922]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
              <Headphones className="w-4 h-4 text-[#F5A623]" />
            </div>
            <h1 className="text-base font-bold">Help &amp; Support Center</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(telegramConfig.supportUrl, '_blank', 'noopener,noreferrer')}
            className="text-xs font-semibold text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition"
          >
            <TelegramIcon className="w-3.5 h-3.5" /> 24/7 Chat
          </button>
        </div>
      </header>

      <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* ── Telegram Contact Cards (Top Section) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Official Telegram Channel */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#229ED9]/15 to-[#0088cc]/5 border border-[#229ED9]/30 p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-[#229ED9]/30">
                  <TelegramIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#229ED9]/20 text-[#229ED9] px-2 py-0.5 rounded-full">
                  Official Channel
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Join Telegram Channel</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Stay updated with official news, live events, promo codes, and platform updates.
              </p>
            </div>
            <div className="mt-4">
              <a
                href={telegramConfig.channelUrl || telegramConfig.groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3.5 bg-[#229ED9] hover:bg-[#1d8dc3] active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <TelegramIcon className="w-4 h-4" /> Join Official Channel
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Telegram 24/7 Support */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30 p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                  <ChatIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 24/7 Online
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Telegram Support</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Need immediate help? Chat directly with our official customer support agents.
              </p>
            </div>
            <div className="mt-4">
              <a
                href={telegramConfig.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <TelegramIcon className="w-4 h-4" /> Chat on Telegram Support
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Main Navigation Tabs ── */}

        <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-800/80 p-1">
          <button
            onClick={() => handleTabChange('faq')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'faq'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QuestionMark className="w-4 h-4" /> FAQs
          </button>
          <button
            onClick={() => handleTabChange('ticket')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ticket'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TicketIcon className="w-4 h-4" /> Create Ticket
          </button>
          <button
            onClick={() => handleTabChange('my-tickets')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'my-tickets'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> My Tickets
            {tickets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-brand/20 text-brand text-[10px] rounded-full font-bold">
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: FAQ SECTION */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'faq' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* FAQ Search Bar */}
            <div className="relative">
              <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search questions, recharge, withdrawal, rules..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 transition placeholder:text-slate-400"
              />
              {faqSearch && (
                <button
                  onClick={() => setFaqSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFaqCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedFaqCategory === cat
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* FAQ Accordion List */}
            <div className="space-y-2.5">
              {filteredFaqs.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <QuestionMark className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No questions found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching for another keyword or submit a support ticket.
                  </p>
                  <button
                    onClick={() => handleTabChange('ticket')}
                    className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold"
                  >
                    Submit a Ticket
                  </button>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isOpen = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm"
                    >
                      <button
                        onClick={() => setExpandedFaqId(isOpen ? null : faq.id)}
                        className="w-full p-4 flex items-center justify-between text-left gap-3 focus:outline-none"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-brand font-bold text-xs mt-0.5">Q.</span>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <div className="text-slate-400 shrink-0">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-5 border-l-2 border-brand/30">
                            {faq.answer}
                          </p>
                          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                            <span>Category: {faq.category}</span>
                            <span>Was this helpful?</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Support Prompt */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand/10 to-amber-500/10 border border-brand/20 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Still have questions?</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Our team is ready to assist you.
                </p>
              </div>
              <button
                onClick={() => handleTabChange('ticket')}
                className="px-3.5 py-1.5 bg-brand text-white rounded-xl text-xs font-semibold shadow-sm shrink-0"
              >
                Create Ticket
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: CREATE SUPPORT TICKET */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ticket' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {createdTicket ? (
              <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 text-center shadow-sm space-y-4">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Support Ticket Created!</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Your request has been submitted. Our support team will review and reply within 24 hours.
                  </p>
                </div>

                {/* Generated Ticket ID Box */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3.5 max-w-xs mx-auto border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Ticket ID</span>
                    <p className="text-sm font-mono font-bold text-brand">{createdTicket.ticketId}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdTicket.ticketId)}
                    className="p-2 bg-white dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:text-brand transition shadow-xs"
                    title="Copy Ticket ID"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      openTicketDetails(createdTicket);
                      handleTabChange('my-tickets');
                    }}
                    className="flex-1 py-2.5 px-4 bg-brand text-white rounded-xl text-xs font-semibold shadow-sm hover:opacity-90 transition"
                  >
                    View Ticket Details
                  </button>
                  <button
                    onClick={() => setCreatedTicket(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
                  >
                    Create Another Ticket
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitTicket}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TicketIcon className="w-4 h-4 text-brand" /> Submit a Support Request
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Please provide details about your issue to help us resolve it quickly.
                  </p>
                </div>

                {ticketError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{ticketError}</span>
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Issue Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    {TICKET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Subject / Title <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">{ticketSubject.length}/150</span>
                  </div>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    maxLength={150}
                    placeholder="Briefly describe the issue (e.g. Recharge delay with bKash)"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Detailed Message <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">{ticketMessage.length}/3000</span>
                  </div>
                  <textarea
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    rows={5}
                    maxLength={3000}
                    placeholder="Provide full details: transaction ID, date, error message, or steps to reproduce..."
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brand hover:bg-brand/90 active:scale-[0.99] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generating Ticket...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Support Ticket
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MY TICKETS */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'my-tickets' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Status Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['all', 'pending', 'in_progress', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setTicketStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    ticketStatusFilter === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Ticket List */}
            {loadingTickets ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin mx-auto" />
                <p className="text-xs">Loading support tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3 shadow-sm">
                <TicketIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">No tickets found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    You haven't submitted any support tickets under this status.
                  </p>
                </div>
                <button
                  onClick={() => handleTabChange('ticket')}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <TicketIcon className="w-3.5 h-3.5" /> Submit New Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id || ticket.ticketId}
                    onClick={() => openTicketDetails(ticket)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand/50 rounded-2xl p-4 transition shadow-sm cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                          {ticket.ticketId || `TK-${ticket._id.slice(-6).toUpperCase()}`}
                        </span>
                        <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {ticket.category || 'General'}
                        </span>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {ticket.subject}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {ticket.message}
                      </p>
                    </div>

                    {ticket.adminReply && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-[10px] font-bold text-emerald-500 block mb-0.5 flex items-center gap-1">
                          <Sparkle className="w-3 h-3" /> Support Team Response:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-1">{ticket.adminReply}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/50">
                      <span>Submitted: {new Date(ticket.createdAt).toLocaleString()}</span>
                      <span className="font-semibold text-brand flex items-center gap-0.5">
                        View Details <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TICKET DETAILS MODAL */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedTicket && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                  {selectedTicket.ticketId || `TK-${selectedTicket._id.slice(-6).toUpperCase()}`}
                </span>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Category</span>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {selectedTicket.category || 'General'}
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {selectedTicket.subject}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Created: {new Date(selectedTicket.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Initial Issue Message */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Original Issue Description
                </span>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.message}
                </p>
              </div>

              {/* Thread of Replies */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ChatIcon className="w-3.5 h-3.5 text-brand" /> Conversation History
                </h4>

                {/* Legacy single admin reply if no thread */}
                {selectedTicket.adminReply && (!selectedTicket.replies || selectedTicket.replies.length === 0) && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Official Support
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.adminReply}
                    </p>
                  </div>
                )}

                {/* Sub-replies thread */}
                {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((r, index) => {
                    const isStaff = r.sender === 'admin' || r.sender === 'support';
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isStaff
                            ? 'bg-emerald-500/10 border-emerald-500/20 ml-2'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 mr-2'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className={`font-bold ${isStaff ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            {isStaff ? 'Official Support' : r.senderName || 'You'}
                          </span>
                          <span>{r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {r.message}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  !selectedTicket.adminReply && (
                    <p className="text-xs text-slate-400 italic py-2 text-center">
                      No replies yet. Our support agents are reviewing your request.
                    </p>
                  )
                )}
              </div>

              {/* Reply Input Form */}
              {selectedTicket.status !== 'closed' && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Send a follow-up reply:
                  </label>
                  {replyError && <p className="text-[11px] text-rose-500">{replyError}</p>}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={isReplying || !replyText.trim()}
                      className="px-3 py-2 bg-brand text-white rounded-xl text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
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

export default HelpCenter;
