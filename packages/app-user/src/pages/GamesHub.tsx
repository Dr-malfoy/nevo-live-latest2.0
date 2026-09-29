import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiAirplaneFill as Plane, PiDiceFiveFill as Dices, PiCircleFill as CircleDot, PiBellFill as Bell, PiCalendarCheckFill as CalendarCheck, PiGameControllerFill as Gamepad2, PiGiftFill as Gift, PiGlobeHemisphereWestFill as Globe, PiMegaphoneFill as Megaphone, PiPlusBold as Plus, PiSparkleFill as Sparkles, PiXBold as X } from 'react-icons/pi';
import { gamesApi, type ActivityItem, type GameItem, type GameWinner } from '../api/economy.api';
import { optional } from '../api/pending';
import { useAuthStore, useUIStore } from '../stores';
import { ScreenHeader, TabBar, EmptyState, PendingApiNotice } from '../components/common';
import { Avatar } from '../components/user';
import { Loading } from '../components/ui';
import { compactNumber } from '../lib/time';

/**
 * Diamond Games hub — requirements #67 and #70.
 *
 * #67 is the game list, #70 is the same list with the header, quick actions and
 * winner ticker above it — so it's one screen. `/api/games*` is specified in
 * BACKEND-GUIDE.md §4.13.
 */

const BUILT_IN_GAMES: GameItem[] = [
  {
    key: 'aviator',
    name: 'Aviator',
    currency: 'diamond',
    launchUrl: '/game/aviator',
    badge: 'HOT 🚀',
    color: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
  },
  {
    key: 'teenpatti',
    name: '3 Patti',
    currency: 'diamond',
    launchUrl: '/game/teenpatti',
    badge: 'POPULAR ♠️',
    color: 'linear-gradient(135deg, #11998E 0%, #38EF7D 100%)',
  },
  {
    key: 'roulette',
    name: 'Roulette',
    currency: 'diamond',
    launchUrl: '/game/roulette',
    badge: 'NEW 🎰',
    color: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
  },
];

const QUICK_ACTIONS = [
  { key: 'rank', label: 'Diamond Rank', Icon: Globe, tint: 'bg-[#1E3A8A] text-[#FFD700]', to: '/rankings?board=earnings' },
  { key: 'reward', label: 'Reward', Icon: Gift, tint: 'bg-[#FFECEC] text-[#FF4D4D]', to: '/rewards' },
  { key: 'event', label: 'Event', Icon: Megaphone, tint: 'bg-[#FFF3E0] text-[#F97316]', to: '/activities' },
  { key: 'signin', label: 'Sign in', Icon: CalendarCheck, tint: 'bg-[#E9F9EE] text-[#22C55E]', to: '/games', dot: true },
  { key: 'spin', label: 'Lucky Spin', Icon: Sparkles, tint: 'bg-[#F3EDFF] text-[#A855F7]', to: '/lucky-spin' },
];

export const GamesHub = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [tab, setTab] = useState<'diamonds' | 'coupons'>('diamonds');
  const [games, setGames] = useState<GameItem[]>(BUILT_IN_GAMES);
  const [winners, setWinners] = useState<GameWinner[]>([]);
  const [banner, setBanner] = useState<ActivityItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);
  const [warningOpen, setWarningOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      optional(gamesApi.home()).catch(() => null),
      optional(gamesApi.list()).catch(() => null),
      optional(gamesApi.winners()).catch(() => null),
    ])
      .then(([home, list, win]) => {
        if (cancelled) return;
        const items = home?.data?.games ?? list?.data ?? [];
        const existingKeys = new Set(items.map((i) => i.key));
        const merged = [...BUILT_IN_GAMES.filter((g) => !existingKeys.has(g.key)), ...items];
        setGames(merged);
        setBanner(home?.data?.banner ?? null);
        setWinners(win?.data ?? []);
        setLive(true);
      })
      .catch(() => {
        if (!cancelled) {
          setGames(BUILT_IN_GAMES);
          setLive(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visible = games.filter((g) =>
    tab === 'diamonds' ? g.currency === 'diamond' : g.currency === 'coupon'
  );

  const open = (game: GameItem) => {
    if (game.launchUrl?.startsWith('/')) {
      navigate(game.launchUrl);
    } else if (game.launchUrl) {
      window.open(game.launchUrl, '_blank', 'noopener');
    } else {
      showToast(`${game.name} is not connected yet`, 'info');
    }
  };

  return (
    <div className="min-h-screen bg-white pb-8">
      <ScreenHeader title="Games" />

      {/* Arbitrage warning (#70.1) */}
      {warningOpen && (
        <div className="mx-3 mt-3 rounded-lg bg-accent-50 px-3 py-2.5 flex items-start gap-2">
          <Bell className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
          <p className="flex-1 text-[12px] text-accent-600 leading-snug">
            The platform strictly prohibits any form of arbitrage.
          </p>
          <button
            onClick={() => setWarningOpen(false)}
            aria-label="Dismiss"
            className="text-accent-600/60 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Balances (#70.2) */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <Avatar src={user?.avatar} nickname={user?.nickname || '?'} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink truncate">{user?.nickname}</p>
          <div className="flex items-center gap-3 mt-1 text-sm tabular-nums">
            <span className="flex items-center gap-1 text-ink-soft">
              🪙 {compactNumber(user?.coins ?? 0)}
            </span>
            <span className="flex items-center gap-1 text-ink-soft">
              💎 {compactNumber(user?.diamonds ?? 0)}
            </span>
            <span className="flex items-center gap-1 text-ink-soft">
              🎟️ {compactNumber((user as any)?.tickets ?? 0)}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate('/top-up')}
          aria-label="Top up"
          className="w-8 h-8 rounded-full bg-role-seller text-white flex items-center justify-center shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>

      {/* Quick actions (#70.3) */}
      <div className="mx-3 mt-4 rounded-card bg-surface-soft p-3">
        <div className="grid grid-cols-5 gap-1">
          {QUICK_ACTIONS.map(({ key, label, Icon, tint, to, dot }) => (
            <button
              key={key}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-1.5 active:opacity-60"
            >
              <span className={`relative w-11 h-11 rounded-2xl flex items-center justify-center ${tint}`}>
                <Icon className="w-5 h-5" />
                {dot && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-status-live" />}
              </span>
              <span className="text-[10px] text-ink-soft text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Winner ticker (#70.4) */}
      {winners.length > 0 && (
        <div className="mx-3 mt-3 h-11 rounded-full bg-[#FFF0F0] flex items-center gap-2 px-3">
          <Avatar src={winners[0].avatar} nickname={winners[0].nickname} size="xs" />
          <p className="flex-1 text-[12px] truncate">
            <span className="text-accent-600 font-semibold">{winners[0].nickname}</span>
            <span className="text-ink-muted"> won </span>
            <span className="text-[#FF4D8A] font-bold tabular-nums">
              {compactNumber(winners[0].amount)}
            </span>
          </p>
        </div>
      )}

      {/* Event banner (#70.5) */}
      {banner && (
        <button
          onClick={() => navigate('/activities')}
          className="mx-3 mt-3 w-[calc(100%-1.5rem)] h-[100px] rounded-card overflow-hidden relative text-left"
        >
          {banner.banner ? (
            <img src={banner.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-[#1B5E20] to-[#43A047]" />
          )}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 p-4 flex flex-col justify-center">
            <p className="text-white font-bold">{banner.title}</p>
            <p className="text-white/85 text-sm tabular-nums mt-0.5">
              🪙 {compactNumber(banner.prizePool)}
            </p>
          </div>
        </button>
      )}

      {/* Currency tabs (#70.6) */}
      <div className="px-4 pt-4">
        <TabBar
          tabs={[
            { key: 'diamonds', label: 'Diamonds' },
            { key: 'coupons', label: 'Coupons' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as 'diamonds' | 'coupons')}
        />
      </div>

      {loading ? (
        <Loading className="pt-12" size="lg" />
      ) : visible.length === 0 ? (
        <>
          <EmptyState
            icon={<Gamepad2 className="w-6 h-6" />}
            title={live ? 'No games in this category' : 'Games not connected'}
            hint={live ? 'Try the other currency tab.' : undefined}
          />
          {!live && <PendingApiNotice section="§4.13" what="The games list" />}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-3 pt-3">
          {visible.map((game) => (
            <button
              key={game.key}
              onClick={() => open(game)}
              className="relative h-[120px] rounded-2xl overflow-hidden text-left p-3.5 flex flex-col justify-between shadow-md active:scale-95 transition-all group"
              style={{ background: game.color || 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
            >
              <div className="z-10">
                <span className="font-bold text-white text-base leading-snug drop-shadow-sm block">
                  {game.name}
                </span>
                <span className="text-[11px] text-white/85 font-medium block mt-0.5">
                  {game.key === 'aviator'
                    ? 'Crash Game'
                    : game.key === 'teenpatti'
                    ? '3-Card Poker'
                    : game.key === 'roulette'
                    ? 'Spin & Win'
                    : 'Play & Win'}
                </span>
              </div>

              <div className="flex items-center justify-between z-10">
                <span className="h-6 px-3 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold flex items-center shadow-sm">
                  PLAY
                </span>
              </div>

              {game.badge && (
                <span className="absolute top-2.5 right-2.5 h-[20px] px-2 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-bold flex items-center z-10 border border-white/20">
                  {game.badge}
                </span>
              )}

              {/* Decorative Card Icon */}
              <div className="absolute -bottom-2 -right-2 w-16 h-16 opacity-30 group-hover:scale-110 transition-transform flex items-center justify-center pointer-events-none">
                {game.key === 'aviator' && <Plane className="w-12 h-12 text-white" />}
                {game.key === 'teenpatti' && <Dices className="w-12 h-12 text-white" />}
                {game.key === 'roulette' && <CircleDot className="w-12 h-12 text-white" />}
                {game.icon && !['aviator', 'teenpatti', 'roulette'].includes(game.key) && (
                  <img src={game.icon} alt="" className="w-12 h-12 object-contain" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
