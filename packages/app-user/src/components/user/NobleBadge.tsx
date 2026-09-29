interface NobleBadgeProps {
  type: string;
  className?: string;
}

const colors: Record<string, string> = {
  silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900',
  gold: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  platinum: 'bg-gradient-to-r from-cyan-300 to-cyan-500 text-white',
  diamond: 'bg-gradient-to-r from-blue-400 to-purple-500 text-white',
};

const labels: Record<string, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
};

export const NobleBadge = ({ type, className = '' }: NobleBadgeProps) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${colors[type] || colors.gold} ${className}`}>
    {labels[type] || type}
  </span>
);
