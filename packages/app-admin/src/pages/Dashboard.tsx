import { useEffect, useState } from 'react';
import { Users, Radio, ArrowLeftRight, Building2, UserPlus, Handshake, ShoppingBag, Plane, Dices, CircleDot } from 'lucide-react';
import { adminApi } from '../api';
import { StatsCard } from '../components/StatsCard';
import { DiamondIcon, CoinIcon } from '../components/CurrencyIcon';

export const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [teenPattiStats, setTeenPattiStats] = useState<any>(null);
  const [rouletteStats, setRouletteStats] = useState<any>(null);
  const [aviatorStats, setAviatorStats] = useState<any>(null);

  useEffect(() => {
    adminApi.getDashboard().then(({ data }) => data.success && setStats(data.data));
    adminApi.getTeenPattiStats().then(({ data }) => data.success && setTeenPattiStats(data.data)).catch(() => {});
    adminApi.getRouletteStats().then(({ data }) => data.success && setRouletteStats(data.data)).catch(() => {});
    adminApi.getAviatorStats().then(({ data }) => data.success && setAviatorStats(data.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard label="Total Users" value={stats?.totalUsers ?? '...'} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
        <StatsCard label="Total Agents" value={stats?.totalAgents ?? '...'} icon={<Building2 className="w-5 h-5" />} color="text-green-400" />
        <StatsCard label="Total Hosts" value={stats?.totalHosts ?? '...'} icon={<UserPlus className="w-5 h-5" />} color="text-purple-400" />
        <StatsCard label="Active Streams" value={stats?.activeStreams ?? '...'} icon={<Radio className="w-5 h-5" />} color="text-red-400" />
        <StatsCard label="Diamond Inventory" value={stats?.diamondInventory?.toLocaleString() ?? '...'} icon={<DiamondIcon className="w-5 h-5" />} color="text-cyan-400" />
        <StatsCard label="Coin Inventory" value={stats?.coinInventory?.toLocaleString() ?? '...'} icon={<CoinIcon className="w-5 h-5" />} color="text-yellow-400" />
        <StatsCard label="Pending Transactions" value={stats?.pendingTransactions ?? '...'} icon={<ArrowLeftRight className="w-5 h-5" />} color="text-orange-400" />
        <StatsCard label="Pending Withdrawals" value={stats?.pendingWithdrawals ?? '...'} icon={<Handshake className="w-5 h-5" />} color="text-pink-400" />
        <StatsCard label="Pending Agent Orders" value={stats?.pendingAgentOrders ?? '...'} icon={<ShoppingBag className="w-5 h-5" />} color="text-teal-400" />
        <StatsCard label="TP Bets" value={teenPattiStats?.totalBets ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-amber-400" />
        <StatsCard label="TP Wins" value={teenPattiStats?.totalWins ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-lime-400" />
        <StatsCard label="TP Rounds" value={teenPattiStats?.rounds ?? '...'} icon={<Dices className="w-5 h-5" />} color="text-teal-400" />
        <StatsCard label="Aviator Bets" value={aviatorStats?.totalBets ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-indigo-400" />
        <StatsCard label="Aviator Wins" value={aviatorStats?.totalWins ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-emerald-400" />
        <StatsCard label="Aviator Rounds" value={aviatorStats?.rounds ?? '...'} icon={<Plane className="w-5 h-5" />} color="text-fuchsia-400" />
        <StatsCard label="Roulette Bets" value={rouletteStats?.totalBets ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-rose-400" />
        <StatsCard label="Roulette Wins" value={rouletteStats?.totalWins ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-red-400" />
        <StatsCard label="Roulette Rounds" value={rouletteStats?.rounds ?? '...'} icon={<CircleDot className="w-5 h-5" />} color="text-pink-400" />
      </div>
    </div>
  );
};
