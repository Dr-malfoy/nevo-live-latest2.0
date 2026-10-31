import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useTeenPatti, TeenPattiProvider } from '../game/teenpatti/context';
import { Table, Controls, LobbyPanel, ResultModal, HistoryPanel } from '../game/teenpatti/components';
import '../game/teenpatti/index.scss';

const TeenPattiScreen = () => {
  const navigate = useNavigate();
  const { user, fetchProfile } = useAuthStore();
  const game = useTeenPatti();

  // Keep screen body & document element dark to prevent any white edge flashes
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = '#07090e';
    document.documentElement.style.backgroundColor = '#07090e';
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
  }, []);

  // Always use diamond currency for betting and winning
  useEffect(() => {
    if (game.connected && !game.tableState) {
      game.join('diamond');
    }
  }, [game.connected, game.tableState]);

  // Sync fresh diamond balance after round result
  useEffect(() => {
    if (game.result) {
      fetchProfile().catch(() => {});
    }
  }, [game.result, fetchProfile]);

  const balance = Math.floor(user?.diamonds ?? 0);
  const joined = !!game.tableState;
  const showResult = !!game.result;

  return (
    <div className="min-h-screen bg-[#07090e] pb-6 select-none text-white flex flex-col justify-between">
      <ToastContainer theme="dark" position="top-center" autoClose={2500} />

      {/* Top Header Bar - Pure Dark Luxury Casino */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1b2434] sticky top-0 z-30 bg-[#0c1017]/95 backdrop-blur-xl shadow-lg">
        {/* Back Button */}
        <button
          onClick={() => {
            game.leave();
            navigate(-1);
          }}
          className="w-9 h-9 rounded-full bg-[#161c28] hover:bg-[#1f2839] border border-white/10 flex items-center justify-center transition active:scale-95 shadow"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        {/* Game Title */}
        <div className="flex flex-col items-center">
          <h1 className="text-base font-black tracking-wider bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent drop-shadow">
            TEEN PATTI 🎴
          </h1>
          <span className="text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase">
            Bangladeshi Live Table 🇧🇩
          </span>
        </div>

        {/* Live Diamond Balance Display (Strictly Diamonds & Integer) */}
        <div className="flex items-center gap-2 bg-[#121927] border border-cyan-500/40 px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(42,182,228,0.25)]">
          <span className="text-base leading-none animate-pulse">💎</span>
          <span className="text-xs sm:text-sm font-black text-cyan-300 tracking-wide">
            {balance.toLocaleString()}
          </span>
          <button
            onClick={() => navigate('/recharge')}
            className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-black flex items-center justify-center font-black text-xs transition shadow active:scale-95"
            title="Recharge Diamonds"
          >
            +
          </button>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="p-2 sm:p-4 max-w-xl mx-auto w-full space-y-3 flex-1 flex flex-col justify-between">
        {joined ? (
          <>
            {/* The 3D Felt Poker Table */}
            <Table state={game.tableState!} onSeeCards={() => game.act('see')} />

            {/* Betting Controls & Custom Chips (Dark & Color Responsive) */}
            <Controls state={game.tableState!} busy={game.busy} onAct={game.act} />
          </>
        ) : (
          <div className="py-12 space-y-4">
            <LobbyPanel
              lobby={game.lobby}
              currency="diamond"
              onCurrency={() => {}}
              onJoin={() => game.join('diamond')}
              onLeave={game.leave}
              joined={joined}
              busy={game.busy}
            />
            <HistoryPanel />
          </div>
        )}
      </div>

      {/* Winner Pop-Up Overlay */}
      {showResult && (
        <ResultModal
          result={game.result!}
          onClose={() => {
            game.clearResult();
            game.act('reset');
          }}
          onLeave={() => {
            game.clearResult();
            game.leave();
            navigate(-1);
          }}
        />
      )}

      {/* Insufficient Diamonds / Recharge Modal */}
      {game.rechargeNeeded && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1420] border-2 border-red-500/50 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-fade-in">
            <div className="text-4xl">💎⚠️</div>
            <p className="font-black text-lg text-white">Insufficient Diamonds</p>
            <p className="text-xs text-zinc-300">
              You need diamonds to place bets and play Teen Patti. Please recharge your diamond wallet to continue.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  game.setRechargeNeeded(false);
                  navigate('/recharge');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-xl text-xs shadow-lg active:scale-95 transition"
              >
                Recharge Diamonds
              </button>
              <button
                onClick={() => game.setRechargeNeeded(false)}
                className="px-4 py-3 bg-[#161c28] text-zinc-400 font-bold rounded-xl text-xs active:scale-95 transition hover:text-white"
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

export const TeenPattiGame = () => (
  <TeenPattiProvider>
    <TeenPattiScreen />
  </TeenPattiProvider>
);

export default TeenPattiGame;
