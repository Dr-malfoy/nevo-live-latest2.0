import { IoDiamond } from 'react-icons/io5';
import { PiCoinsFill as Coins } from 'react-icons/pi';

// Diamond / Coin currency icons
export const DiamondIcon = ({ className }: { className?: string }) => (
  <IoDiamond className={className || 'w-4 h-4 inline-block text-cyan-400'} />
);

export const CoinIcon = ({ className }: { className?: string }) => (
  <Coins className={className || 'w-4 h-4 inline-block text-yellow-400'} />
);

export const CurrencyIcon = ({ currency, className }: { currency: 'diamond' | 'coin' | string; className?: string }) =>
  currency === 'coin' ? <CoinIcon className={className} /> : <DiamondIcon className={className} />;
