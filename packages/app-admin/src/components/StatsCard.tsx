interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

export const StatsCard = ({ label, value, icon, color = 'text-primary-400' }: StatsCardProps) => (
  <div className="bg-dark-800 rounded-xl p-4 flex items-center gap-4">
    <div className={`p-3 rounded-lg bg-dark-700 ${color}`}>{icon}</div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-dark-400">{label}</p>
    </div>
  </div>
);
