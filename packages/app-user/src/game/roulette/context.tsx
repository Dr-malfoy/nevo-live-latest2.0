import React, { createContext, useContext } from 'react';
import { useRouletteSocket } from '../../hooks/useRouletteSocket';

// Provides Roulette game state to all child components via the shared
// main socket. Mirrors the TeenPatti game/context.tsx pattern.
const Context = createContext<ReturnType<typeof useRouletteSocket> | null>(null);

export const useRoulette = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useRoulette must be used within RouletteProvider');
  return ctx;
};

export const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useRouletteSocket();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const RouletteProvider = Provider;

export default Context;
