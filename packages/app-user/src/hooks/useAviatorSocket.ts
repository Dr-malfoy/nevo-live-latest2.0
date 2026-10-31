import { useEffect, useState } from 'react';
import type { AviatorState, AviatorResult, AviatorHistoryEntry } from '../types/aviator';
import { useAuthStore, useSocketStore } from '../stores';
import { aviatorApi } from '../api/aviator.api';

/**
 * Aviator socket hook — reuses the app's single main Socket.IO connection
 * (default namespace). The backend registers aviator handlers on both the
 * default and /aviator namespaces, so this connects instantly.
 */
export const useAviatorSocket = () => {
  const token = useAuthStore((s) => s.token);
  const socket = useSocketStore((s) => s.socket);
  const mainConnected = useSocketStore((s) => s.connected);

  const connected = !!socket && mainConnected;
  const [state, setState] = useState<AviatorState | null>(null);
  const [result, setResult] = useState<AviatorResult | null>(null);
  const [history, setHistory] = useState<AviatorHistoryEntry[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeNeeded, setRechargeNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  // Immediately load initial history on mount via REST API
  useEffect(() => {
    let mounted = true;
    aviatorApi
      .getRounds()
      .then((res) => {
        const data = res?.data?.data;
        if (mounted && Array.isArray(data) && data.length > 0) {
          setHistory((prev) => (prev.length > 0 ? prev : data));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socket || !connected || !token) return;

    const onState = (s: AviatorState) => setState(s);
    const onResult = (r: AviatorResult) => {
      setResult(r);
      // Immediately prepend the crashed round so history updates instantly with zero lag
      if (r && r.crashPoint && r.roundNumber) {
        setHistory((prev) => {
          if (prev.some((h) => h.roundNumber === r.roundNumber)) return prev;
          return [{ roundNumber: r.roundNumber, crashPoint: r.crashPoint }, ...prev].slice(0, 25);
        });
      }
    };
    const onHistory = (h: AviatorHistoryEntry[]) => {
      if (Array.isArray(h) && h.length > 0) {
        setHistory(h);
      }
    };
    const onRecharge = () => setRechargeNeeded(true);
    const onSuccess = (msg: string) => setToast({ type: 'success', message: msg });
    const onError = (data: { message: string }) => setToast({ type: 'error', message: data?.message || 'Error' });
    const onBalanceUpdate = (data: { coins?: number; diamonds?: number }) => {
      if (typeof data?.diamonds === 'number') {
        useAuthStore.getState().updateUser({ diamonds: data.diamonds });
      }
    };

    socket.on('aviator:state', onState);
    socket.on('aviator:result', onResult);
    socket.on('aviator:history', onHistory);
    socket.on('recharge', onRecharge);
    socket.on('success', onSuccess);
    socket.on('error', onError);
    socket.on('balance:update', onBalanceUpdate);

    // Immediately join the room and request live session state on connect
    socket.emit('aviator:join', {}, (res: any) => {
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Failed to join' });
      }
    });

    return () => {
      socket.emit('aviator:leave');
      socket.off('aviator:state', onState);
      socket.off('aviator:result', onResult);
      socket.off('aviator:history', onHistory);
      socket.off('recharge', onRecharge);
      socket.off('success', onSuccess);
      socket.off('error', onError);
      socket.off('balance:update', onBalanceUpdate);
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
    data: { betAmount: number; target: number; currency?: 'diamond' | 'coin' },
    ack?: (res: any) => void
  ) => {
    setBusy(true);
    socket?.emit('aviator:bet', {
      betAmount: Math.floor(data.betAmount),
      target: data.target,
      currency: 'diamond',
    }, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Bet failed' });
      } else if (res?.success && typeof res?.balance === 'number') {
        useAuthStore.getState().updateUser({ diamonds: res.balance });
      }
      ack?.(res);
    });
  };

  const cashOut = (
    betIdOrAck?: string | ((res: any) => void),
    ack?: (res: any) => void
  ) => {
    const betId = typeof betIdOrAck === 'string' ? betIdOrAck : undefined;
    const callback = typeof betIdOrAck === 'function' ? betIdOrAck : ack;
    setBusy(true);
    socket?.emit('aviator:cashOut', { betId }, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Cash-out failed' });
      } else if (res?.success && typeof res?.balance === 'number') {
        useAuthStore.getState().updateUser({ diamonds: res.balance });
      }
      callback?.(res);
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
