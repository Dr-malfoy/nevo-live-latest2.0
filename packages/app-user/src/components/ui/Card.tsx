import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** `plain` drops the shadow for cards sitting inside another card. */
  variant?: 'raised' | 'plain' | 'sunken';
  onClick?: () => void;
}

const variants = {
  raised: 'bg-white shadow-card',
  plain: 'bg-white border border-line',
  sunken: 'bg-surface-soft',
};

export const Card = ({ children, className = '', variant = 'raised', onClick }: CardProps) => (
  <div
    onClick={onClick}
    className={`rounded-card p-4 ${variants[variant]} ${
      onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
    } ${className}`}
  >
    {children}
  </div>
);
