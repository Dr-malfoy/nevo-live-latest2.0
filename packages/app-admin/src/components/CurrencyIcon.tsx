import { Gem, Coins } from 'lucide-react';

// Diamond / Coin currency icons (lucide — fa-gem / fa-coins style)
export const DiamondIcon = ({ className }: { className?: string }) => (
  <Gem className={className || 'w-4 h-4 inline-block text-cyan-400'} />
);

export const CoinIcon = ({ className }: { className?: string }) => (
  <Coins className={className || 'w-4 h-4 inline-block text-yellow-400'} />
);
