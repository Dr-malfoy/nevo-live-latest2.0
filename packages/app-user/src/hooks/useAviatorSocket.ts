import { useEffect, useState } from 'react';
import type { AviatorState, AviatorResult, AviatorHistoryEntry } from '../types/aviator';
import { useAuthStore, useSocketStore } from '../stores';

/**
 * Aviator socket hook — reuses the app's single main Socket.IO connection
 * (default namespace). The backend registers aviator handlers on both the
 * default and /aviator namespaces, so this connects instantly.
 */
export const useAviatorSocket = () => {
  const token = useAuthStore((s) => s.token);
  const socket = useSocketStore((s) => s.socket);
  const mainConnected = useSocketStore((s) => s.connected);

  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<AviatorState | null>(null);
  const [result, setResult] = useState<AviatorResult | null>(null);
  const [history, setHistory] = useState<AviatorHistoryEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeNeeded, setRechargeNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConnected(!!socket && mainConnected);
  }, [socket, mainConnected]);

  useEffect(() => {
    if (!socket || !connected || !token) return;

    const onState = (s: AviatorState) => setState(s);
    const onResult = (r: AviatorResult) => setResult(r);
    const onHistory = (h: AviatorHistoryEntry[]) => setHistory(h);
    const onRecharge = () => setRechargeNeeded(true);
    const onSuccess = (msg: string) => setToast({ type: 'success', message: msg });
    const onError = (data: { message: string }) => setToast({ type: 'error', message: data?.message || 'Error' });

    socket.on('aviator:state', onState);
    socket.on('aviator:result', onResult);
    socket.on('aviator:history', onHistory);
    socket.on('recharge', onRecharge);
    socket.on('success', onSuccess);
    socket.on('error', onError);

    return () => {
      socket.off('aviator:state', onState);
      socket.off('aviator:result', onResult);
      socket.off('aviator:history', onHistory);
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
    socket?.emit('aviator:join', {}, (res: any) => {
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Failed to join' });
      }
    });
  };

  const leave = () => {
    socket?.emit('aviator:leave');
  };

  const placeBet = (
    data: { betAmount: number; target: number; currency: 'diamond' | 'coin' },
    ack?: (res: any) => void
  ) => {
    setBusy(true);
    socket?.emit('aviator:bet', data, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Bet failed' });
      }
      ack?.(res);
    });
  };

  const cashOut = (ack?: (res: any) => void) => {
    setBusy(true);
    socket?.emit('aviator:cashOut', {}, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Cash-out failed' });
      }
      ack?.(res);
    });
  };

  return {
    socket,
    connected,
    state,
    result,
    history,
    toast,
    rechargeNeeded,
    setRechargeNeeded,
    busy,
    join,
    leave,
    placeBet,
    cashOut,
  };
};
