import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft } from 'react-icons/pi';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores';
import { useTeenPatti, TeenPattiProvider } from '../game/teenpatti/context';
import { Header, Table, Controls, LobbyPanel, ResultModal, HistoryPanel, Card } from '../game/teenpatti/components';
import '../game/teenpatti/index.scss';

const TeenPattiScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const game = useTeenPatti();

  const [currency, setCurrency] = useState<'diamond' | 'coin'>('diamond');

  // Join as soon as connected (diamond default)
  useEffect(() => {
    if (game.connected && !game.tableState) {
      game.join('diamond');
    }
  }, [game.connected, game.tableState]);

  const balance = currency === 'coin' ? (user?.coins ?? 0) : (user?.diamonds ?? 0);
  const joined = !!game.tableState;
  const showResult = !!game.result;

  return (
    <div className="min-h-screen bg-dark-950 pb-6">
      <ToastContainer theme="dark" position="top-center" />

      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-dark-800 sticky top-0 z-20 bg-dark-950/90 backdrop-blur-xl">
        <button onClick={() => { game.leave(); navigate(-1); }}><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold flex-1">Teen Patti</h1>
        <span className="text-sm font-bold">{balance?.toLocaleString()} {currency === 'coin' ? '🪙' : '💎'}</span>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          <button
            onClick={() => setCurrency('diamond')}
            className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ${currency === 'diamond' ? 'bg-primary-600' : ''}`}
          >💎</button>
          <button
            onClick={() => setCurrency('coin')}
            className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1 ${currency === 'coin' ? 'bg-yellow-600' : ''}`}
          >🪙</button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* If seated, show the table + controls; else lobby */}
        {joined ? (
          <>
            <Table state={game.tableState!} />

            {/* My cards */}
            {game.myCards && game.myCards.cards.length > 0 && (
              <div className="flex justify-center gap-2 py-1">
                {game.myCards.cards.map((c, i) => (
                  <Card key={i} card={c} />
                ))}
              </div>
            )}

            <Controls state={game.tableState!} busy={game.busy} onAct={game.act} />

            {/* Switch table currency */}
            {game.phase === 'lobby' && (
              <button
                onClick={() => { game.leave(); setCurrency(currency === 'diamond' ? 'coin' : 'diamond'); }}
                className="w-full py-2.5 rounded-xl border border-dark-700 text-dark-300 text-sm font-bold"
              >
                Switch to {currency === 'diamond' ? 'Coin' : 'Diamond'} table
              </button>
            )}
          </>
        ) : (
          <>
            <LobbyPanel
              lobby={game.lobby}
              currency={currency}
              onCurrency={setCurrency}
              onJoin={() => game.join(currency)}
              onLeave={game.leave}
              joined={joined}
              busy={game.busy}
            />
            <HistoryPanel />
          </>
        )}

        <Header
          balance={balance}
          currency={currency}
          onToggleCurrency={setCurrency}
          onLeave={game.leave}
        />
      </div>

      {/* Result overlay */}
      {showResult && <ResultModal result={game.result!} />}

      {/* Recharge prompt */}
      {game.rechargeNeeded && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="font-bold">Insufficient balance</p>
            <p className="text-sm text-dark-400">Recharge your wallet to keep playing.</p>
            <button
              onClick={() => { game.setRechargeNeeded(false); navigate('/recharge'); }}
              className="w-full py-2.5 bg-primary-600 rounded-lg text-sm font-medium"
            >Go to Recharge</button>
            <button onClick={() => game.setRechargeNeeded(false)} className="text-sm text-dark-400">Close</button>
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
