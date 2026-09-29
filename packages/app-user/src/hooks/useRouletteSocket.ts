import { useEffect, useState } from 'react';
import type { RouletteState, RouletteResult, RouletteBetType } from '../types/roulette';
import { useAuthStore, useSocketStore } from '../stores';

/**
 * Roulette socket hook — reuses the app's single main Socket.IO connection
 * (default namespace). The backend registers roulette handlers on both the
 * default and /roulette namespaces, so this connects instantly.
 */
export const useRouletteSocket = () => {
  const token = useAuthStore((s) => s.token);
  const socket = useSocketStore((s) => s.socket);
  const mainConnected = useSocketStore((s) => s.connected);

  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<RouletteState | null>(null);
  const [result, setResult] = useState<RouletteResult | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeNeeded, setRechargeNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConnected(!!socket && mainConnected);
  }, [socket, mainConnected]);

  useEffect(() => {
    if (!socket || !connected || !token) return;

    const onState = (s: RouletteState) => setState(s);
    const onResult = (r: RouletteResult) => setResult(r);
    const onRecharge = () => setRechargeNeeded(true);
    const onSuccess = (msg: string) => setToast({ type: 'success', message: msg });
    const onError = (data: { message: string }) => setToast({ type: 'error', message: data?.message || 'Error' });

    socket.on('roulette:state', onState);
    socket.on('roulette:result', onResult);
    socket.on('recharge', onRecharge);
    socket.on('success', onSuccess);
    socket.on('error', onError);

    return () => {
      socket.off('roulette:state', onState);
      socket.off('roulette:result', onResult);
      socket.off('recharge', onRecharge);
      socket.off('success', onSuccess);
      socket.off('error', onError);
    };
  }, [socket, connected, token]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const join = () => {
    socket?.emit('roulette:join', {}, (res: any) => {
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Failed to join' });
      }
    });
  };

  const leave = () => {
    socket?.emit('roulette:leave');
  };

  const placeBet = (
    data: { currency: 'diamond' | 'coin'; betType: RouletteBetType; numbers: number[]; amount: number },
    ack?: (res: any) => void
  ) => {
    setBusy(true);
    socket?.emit('roulette:bet', data, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Bet failed' });
      }
      ack?.(res);
    });
  };

  return {
    socket,
    connected,
    state,
    result,
    toast,
    rechargeNeeded,
    setRechargeNeeded,
    busy,
    join,
    leave,
    placeBet,
  };
};
