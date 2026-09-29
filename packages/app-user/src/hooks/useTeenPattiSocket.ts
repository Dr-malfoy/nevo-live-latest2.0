import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { TPTableState, TPLobbyState, TPCardsPayload, TPResult, TPPhase } from '../types/teenpatti';
import { useAuthStore, useSocketStore } from '../stores';

/**
 * Teen Patti socket hook — reuses the app's single main Socket.IO connection
 * (default namespace). The backend registers teenpatti handlers on both the
 * default and /teenpatti namespaces, so this connects instantly.
 */
export const useTeenPattiSocket = () => {
  const token = useAuthStore((s) => s.token);
  const socket = useSocketStore((s) => s.socket);
  const mainConnected = useSocketStore((s) => s.connected);

  const [connected, setConnected] = useState(false);
  const [tableState, setTableState] = useState<TPTableState | null>(null);
  const [myCards, setMyCards] = useState<TPCardsPayload | null>(null);
  const [lobby, setLobby] = useState<TPLobbyState | null>(null);
  const [result, setResult] = useState<TPResult | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rechargeNeeded, setRechargeNeeded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setConnected(!!socket && mainConnected);
  }, [socket, mainConnected]);

  useEffect(() => {
    if (!socket || !connected || !token) return;

    const onTable = (t: TPTableState) => setTableState(t);
    const onCards = (c: TPCardsPayload) => setMyCards(c);
    const onLobby = (l: TPLobbyState) => setLobby(l);
    const onResult = (r: TPResult) => setResult(r);
    const onRecharge = () => setRechargeNeeded(true);
    const onSuccess = (msg: string) => setToast({ type: 'success', message: msg });
    const onError = (data: { message: string }) => setToast({ type: 'error', message: data?.message || 'Error' });

    socket.on('teenpatti:table', onTable);
    socket.on('teenpatti:cards', onCards);
    socket.on('teenpatti:lobby', onLobby);
    socket.on('teenpatti:result', onResult);
    socket.on('recharge', onRecharge);
    socket.on('success', onSuccess);
    socket.on('error', onError);

    return () => {
      socket.off('teenpatti:table', onTable);
      socket.off('teenpatti:cards', onCards);
      socket.off('teenpatti:lobby', onLobby);
      socket.off('teenpatti:result', onResult);
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

  // Track current phase for the join flow
  const phase: TPPhase = tableState?.phase || 'lobby';
  const isYourTurn = !!tableState && tableState.seats[tableState.turnIndex]?.isYou && phase === 'betting';

  const join = (currency: 'diamond' | 'coin') => {
    setBusy(true);
    socket?.emit('teenpatti:join', { currency }, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Failed to join' });
      }
    });
  };

  const leave = () => {
    socket?.emit('teenpatti:leave');
  };

  const act = (action: 'fold' | 'call' | 'raise' | 'see', amount?: number) => {
    if (!tableState) return;
    setBusy(true);
    socket?.emit('teenpatti:action', { action, tableId: tableState.tableId, amount }, (res: any) => {
      setBusy(false);
      if (res && !res.success) {
        setToast({ type: 'error', message: res.error || 'Action failed' });
      }
    });
  };

  return {
    socket,
    connected,
    tableState,
    myCards,
    lobby,
    result,
    toast,
    rechargeNeeded,
    setRechargeNeeded,
    busy,
    phase,
    isYourTurn,
    join,
    leave,
    act,
  };
};
