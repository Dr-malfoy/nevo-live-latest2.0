import React, { createContext, useContext } from 'react';
import { useAviatorSocket } from '../../hooks/useAviatorSocket';

// Provides Aviator game state to all child components via the shared
// main socket. Mirrors the Roulette game/context.tsx pattern.
const Context = createContext<ReturnType<typeof useAviatorSocket> | null>(null);

export const useAviator = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useAviator must be used within AviatorProvider');
  return ctx;
};

export const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useAviatorSocket();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const AviatorProvider = Provider;

export default Context;
