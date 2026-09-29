import React, { createContext, useContext } from 'react';
import { useTeenPattiSocket } from '../../hooks/useTeenPattiSocket';

// Provides Teen Patti game state to all child components via the shared
// main socket. Mirrors the Aviator game/context.tsx pattern.
const Context = createContext<ReturnType<typeof useTeenPattiSocket> | null>(null);

export const useTeenPatti = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useTeenPatti must be used within TeenPattiProvider');
  return ctx;
};

export const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useTeenPattiSocket();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const TeenPattiProvider = Provider;

export default Context;
