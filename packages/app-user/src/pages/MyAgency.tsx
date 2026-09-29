import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold, PiClockClockwise, PiCopyFill } from 'react-icons/pi';
import { useAuthStore } from '../stores';

const mockAgencyData = {
  agentId: "59237509",
  shortName: "HM",
  fullName: "🔥....[HM]....🔥",
  countryCode: "🇧🇩",
  joinDate: "2025-09-07"
};

export const MyAgency = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const data = mockAgencyData;
  
  // For demo: Use localStorage to check if it's the first time
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return localStorage.getItem('hasSeenAgencyPopup') !== 'true';
  });

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [quitStatus, setQuitStatus] = useState<'none' | 'pending'>(() => {
    return (localStorage.getItem('agencyQuitStatus') as 'none' | 'pending') || 'none';
  });

  // Handle Quit Request
  const handleQuitRequest = () => {
    // In real app, make API call here
    setQuitStatus('pending');
    localStorage.setItem('agencyQuitStatus', 'pending');
    setShowQuitModal(false);
  };

  const handlePopupClose = () => {
    setIsFirstTime(false);
    localStorage.setItem('hasSeenAgencyPopup', 'true');
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(data.agentId);
    } catch {}
  };

  if (isFirstTime) {
    return (
      <div className="min-h-screen bg-[#6D28D9] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center px-4 bg-white sticky top-0 z-10 shrink-0 rounded-b-xl">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
            <PiCaretLeftBold className="w-5 h-5 text-ink" />
          </button>
          <h1 className="text-[17px] font-bold text-ink mx-auto pr-8">My Agency</h1>
        </div>

        {/* 3D Hands/Gift Image Placeholder (Purple Gradient BG) */}
        <div className="flex-1 w-full flex flex-col items-center p-6 relative">
          
          <div className="absolute top-0 left-0 right-0 h-56 bg-gradient-to-b from-[#4C1D95] to-transparent flex justify-center items-center opacity-80">
             <div className="text-6xl drop-shadow-lg">🎁</div>
          </div>

          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl z-10 relative mt-24 border border-indigo-50">
             <h2 className="text-[22px] font-bold text-center text-indigo-700 mb-6">Congratulations</h2>
             <p className="text-ink text-[15px] mb-4 font-medium">Dear {user?.nickname || 'User'}😲</p>
             <p className="text-ink-soft text-[14px] mb-8 leading-relaxed">
               I'm delighted to welcome you to my agency! Moving forward, let's work closely together for mutually-beneficial success.
             </p>

             {/* Agent Info Card */}
             <div className="flex items-center justify-center gap-4 mt-4">
                <div className="w-[52px] h-[52px] bg-black rounded-full flex items-center justify-center text-white font-black text-xl italic tracking-tighter">
                  {data.shortName}
                </div>
                <div>
                   <p className="font-bold text-[13px]">{data.fullName} {data.countryCode}</p>
                   <p className="text-[11px] text-ink-muted mt-0.5">ID:{data.agentId}</p>
                   <p className="text-[11px] text-ink-muted">{data.joinDate}</p>
                </div>
             </div>

             {/* Yellow Seal */}
             <button 
               onClick={handlePopupClose}
               className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[72px] h-[72px] bg-[#FFD700] rounded-full border-[6px] border-[#8b5cf6] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
             >
                <div className="text-[#B8860B] text-4xl font-black">✓</div>
             </button>
          </div>
          
          {/* Quit Button */}
          <button 
             onClick={() => setShowQuitModal(true)}
             className="absolute bottom-8 text-white/80 hover:text-white text-sm"
          >
             I want to quit the agency &gt;&gt;
          </button>
        </div>

        {/* Quit Confirmation Modal */}
        {showQuitModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[280px] p-6 text-center shadow-2xl">
               <h3 className="text-lg font-bold text-ink mb-2">Quit Agency</h3>
               <p className="text-ink-soft text-[15px] mb-6">Are you sure? Request to Leave Agency?</p>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setShowQuitModal(false)}
                   className="flex-1 h-[42px] rounded-full bg-surface-soft text-ink-soft font-bold text-sm"
                 >
                   No
                 </button>
                 <button 
                   onClick={handleQuitRequest}
                   className="flex-1 h-[42px] rounded-full bg-red-500 text-white font-bold text-sm"
                 >
                   Yes
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // State B: Agent Page
  return (
    <div className="min-h-screen bg-surface flex flex-col relative">
       {/* Header */}
       <div className="h-14 flex items-center justify-between px-4 bg-white sticky top-0 z-10 shrink-0 border-b border-line">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
           <PiCaretLeftBold className="w-5 h-5 text-ink" />
         </button>
         <h1 className="text-[17px] font-bold text-ink">Agent</h1>
         <button className="p-2 -mr-2 active:opacity-60">
           <PiClockClockwise className="w-[22px] h-[22px] text-ink" />
         </button>
       </div>

       {/* Top Card */}
       <div 
          className="bg-white p-4 mt-2 flex items-center gap-4 cursor-pointer active:bg-surface-soft transition-colors"
          onClick={() => navigate(`/user/${data.agentId}`)}
       >
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white font-black text-2xl italic tracking-tighter shrink-0 border-2 border-white shadow-sm">
            {data.shortName}
          </div>
          <div className="flex-1">
             <div className="flex items-center justify-between">
                <p className="font-bold text-[15px] text-ink">{data.fullName}</p>
                <PiCaretLeftBold className="w-4 h-4 text-ink-ghost rotate-180" />
             </div>
             <div className="flex items-center gap-1 mt-1 text-[13px] text-ink-muted" onClick={(e) => e.stopPropagation()}>
                <span>ID: {data.agentId}</span>
                <button onClick={copyId} className="active:opacity-60 p-1">
                  <PiCopyFill className="w-3.5 h-3.5 text-ink-ghost" />
                </button>
             </div>
          </div>
       </div>

       {quitStatus === 'pending' && (
         <div className="mx-4 mt-4 p-3 bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl flex justify-between items-center">
            <span className="text-[#E65100] text-sm font-medium">Quit request is Pending</span>
            <span className="text-xs text-[#EF6C00]">Cannot go live</span>
         </div>
       )}

       {/* Body: Empty State */}
       <div className="flex-1 flex flex-col items-center justify-center -mt-20">
          <div className="w-[240px] h-[240px] flex items-center justify-center mb-2 relative">
             <div className="text-8xl relative z-10">🦛</div>
             <div className="absolute top-8 text-8xl opacity-30">🛸</div>
          </div>
          <p className="text-ink-ghost text-[13px] font-medium">No More Data</p>
       </div>
       
       {/* Button to reset state for demo purposes */}
       <button 
          onClick={() => {
            setIsFirstTime(true); 
            localStorage.removeItem('hasSeenAgencyPopup');
            localStorage.removeItem('agencyQuitStatus');
            setQuitStatus('none');
          }}
          className="absolute bottom-6 right-4 bg-ink text-white text-xs px-4 py-2 rounded-full shadow-lg font-medium opacity-50 hover:opacity-100 transition-opacity"
       >
          Demo: Reset Popup
       </button>
    </div>
  );
};
