import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiRadioFill as Radio, PiMagnifyingGlassBold as Search, PiTrophyFill as Trophy, PiCrownFill as Crown, PiStarFill as Star } from 'react-icons/pi';
import { useStreamStore, useAuthStore, useCountryStore } from '../stores';
import { StreamCard } from '../components/stream';
import { CountryFilterBar } from '../components/filter';
import { Loading } from '../components/ui';
import { countryName } from '../lib/countries';

const TABS = [
  { key: 'popular', label: 'Popular' },
  { key: 'follow', label: 'Follow' },
  { key: 'newest', label: 'Newest' },
] as const;

export const Home = () => {
  const navigate = useNavigate();
  const { streams, isLoading, activeTab, setActiveTab, fetchStreams } = useStreamStore();
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const selectedCountries = useCountryStore((s) => s.selected);
  const clearCountries = useCountryStore((s) => s.clear);

  // Refetch on tab change AND on country change (requirement #1).
  useEffect(() => {
    fetchStreams(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedCountries.join(',')]);

  useEffect(() => {
    const onRefresh = () => {
      fetchStreams(activeTab);
    };
    window.addEventListener('app:refresh-home', onRefresh);
    return () => {
      window.removeEventListener('app:refresh-home', onRefresh);
    };
  }, [activeTab, fetchStreams]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === 'follow' && !isAuth) {
      navigate('/login');
      return;
    }
    setActiveTab(tab);
  };

  const leftCol = streams.filter((_, i) => i % 2 === 0);
  const rightCol = streams.filter((_, i) => i % 2 === 1);

  const filterLabel = selectedCountries.map(countryName).join(', ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eaf2ff] via-[#f5f8ff] to-white pb-6">
      {/* Custom Header matching the picture */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2">
        <div className="flex items-center gap-[18px] text-[16px] text-ink-muted font-medium transition-all">
          <button 
            onClick={() => handleTabChange('follow')}
            className={activeTab === 'follow' ? "text-[22px] text-ink font-bold" : ""}
          >Following</button>
          <button 
            onClick={() => handleTabChange('popular')}
            className={activeTab === 'popular' ? "text-[22px] text-ink font-bold" : ""}
          >Explore</button>
          <button 
            onClick={() => handleTabChange('popular')}
          >For You</button>
          <button 
            onClick={() => handleTabChange('newest')}
            className={activeTab === 'newest' ? "text-[22px] text-ink font-bold" : ""}
          >New</button>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/search')}><Search className="w-6 h-6 text-ink" /></button>
          <button onClick={() => navigate('/rankings')}><Trophy className="w-[26px] h-[26px] text-yellow-500" /></button>
        </div>
      </div>

      {/* Requirement #1 — country filter bar */}
      <CountryFilterBar className="px-4 py-2" />

      {/* Banners */}
      <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3">
        <div onClick={() => navigate('/rankings')} className="cursor-pointer rounded-[14px] h-[72px] bg-gradient-to-br from-[#ffae3f] to-[#ff7d45] flex items-center justify-between pl-4 pr-2 text-white font-bold text-[17px] relative overflow-hidden shadow-sm">
          <span>Honor</span>
          <Crown className="w-[52px] h-[52px] text-yellow-200 relative z-10" />
        </div>
        <div onClick={() => navigate('/activities')} className="cursor-pointer rounded-[14px] h-[72px] bg-gradient-to-br from-[#40a3ff] to-[#5060ff] flex items-center justify-between pl-4 pr-2 text-white font-bold text-[16px] leading-tight relative overflow-hidden shadow-sm">
          <span>Activity Center</span>
          <div className="relative z-10">
            <Star className="w-[52px] h-[52px] text-blue-200" />
            <div className="absolute top-0 right-0 w-4 h-4 bg-status-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">5</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Loading className="pt-20" size="lg" />
      ) : streams.length === 0 ? (
        <div className="text-center pt-20 px-8">
          <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4">
            <Radio className="w-6 h-6 text-ink-ghost" />
          </div>
          <p className="text-base font-semibold text-ink mb-1">
            {filterLabel ? `No one live in ${filterLabel}` : 'No live streams right now'}
          </p>
          <p className="text-sm text-ink-muted">
            {filterLabel ? 'Try another country, or show all.' : 'Be the first to go live!'}
          </p>
          {filterLabel && (
            <button onClick={clearCountries} className="mt-4 h-9 px-4 btn-secondary text-sm">
              Show all countries
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          <div className="space-y-3">
            {leftCol.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
          <div className="space-y-3">
            {rightCol.map((stream) => (
              <StreamCard key={stream._id} stream={stream} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
