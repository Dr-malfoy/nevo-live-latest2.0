import { useNavigate } from 'react-router-dom';
import { PiCaretLeftBold, PiArrowsClockwiseBold, PiPencilSimpleBold, PiHeartFill, PiGiftFill, PiGridFourFill, PiHeart, PiUserFill, PiCopyFill, PiCaretRightBold } from 'react-icons/pi';

// Mock data object for backend integration
const mockAgentData = {
  id: "59237509",
  shortName: "HM",
  fullName: "🔥....[HM]....🔥",
  gender: "male",
  age: 26, // from personal info, though top says 18 in mockup, let's use 26 for consistency
  level: 26,
  followersCount: "1.2K",
  followingCount: "304",
  countryCode: "BD",
  whatsapp: "01746143516",
  isOnline: true,
  badges: [
    { label: "PO", gradient: "from-yellow-400 to-orange-500" },
    { label: "🪙 Coin Seller", gradient: "from-orange-500 to-red-500" }
  ],
  stats: {
    fansClub: 0,
    litGifts: "0/12",
    rankedParticipants: 2
  },
  gallery: [
    { type: "text", content: "HM", bg: "bg-black text-white italic font-black" },
    { type: "emoji", content: "🧢", bg: "bg-[#EAC996]" }
  ],
  personalInfo: [
    "১. হোস্টিং এবং এজেন্সি দেওয়া হয়",
    "২. রিচার্জ কয়েন ১৩৪০৳",
    "৩. উইথড্র ১২৫০৳",
    "৪. উইন কয়েন কিনা হয় ১৬৫০৳",
    "কাউন্ট করানোর সাথে সাথে টাকা দেওয়া হয়"
  ]
};

export const AgentProfileMock = () => {
  const navigate = useNavigate();
  const data = mockAgentData;

  return (
    <div className="min-h-screen bg-[#0F0F13] text-white flex flex-col relative overflow-hidden">
      {/* Background huge text */}
      <div className="absolute top-10 left-10 text-[180px] font-black italic opacity-20 pointer-events-none select-none tracking-tighter" style={{ fontFamily: 'impact, sans-serif' }}>
        {data.shortName}
      </div>

      {/* Header icons */}
      <div className="flex items-center justify-between px-4 pt-4 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:opacity-60">
          <PiCaretLeftBold className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          {data.isOnline && (
            <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-status-live animate-pulse" />
              Online
            </div>
          )}
          <button className="p-2 active:opacity-60"><PiArrowsClockwiseBold className="w-5 h-5" /></button>
          <button className="p-2 active:opacity-60 -mr-2"><PiPencilSimpleBold className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 mt-6 z-10">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-[84px] h-[84px] rounded-full border-2 border-white flex items-center justify-center bg-black font-black italic text-3xl">
              {data.shortName}
            </div>
            {/* Medals mockup */}
            {data.badges[0] && (
              <div className={`absolute -right-4 -bottom-2 w-8 h-8 bg-gradient-to-br ${data.badges[0].gradient} rounded-full border-2 border-black flex items-center justify-center text-[10px] font-bold`}>
                {data.badges[0].label}
              </div>
            )}
          </div>
          <div className="pt-2 flex-1">
            {data.badges[1] && (
              <div className={`bg-gradient-to-r ${data.badges[1].gradient} text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center mb-1`}>
                {data.badges[1].label}
              </div>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold mt-3 flex items-center">
          {data.fullName}
        </h1>
        
        <div className="flex items-center gap-2 mt-2">
           <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-[11px] px-1.5 py-0.5 rounded">
             {data.gender === 'male' ? '♂' : '♀'} 18
           </span>
           <span className="flex items-center gap-1 bg-red-500/20 text-red-400 text-[11px] px-1.5 py-0.5 rounded">
             Lv. {data.level}
           </span>
           <span className="flex items-center gap-1 bg-white/10 text-white/80 text-[11px] px-1.5 py-0.5 rounded cursor-pointer active:opacity-60">
             ID:{data.id}
             <PiCopyFill className="w-3 h-3 ml-0.5" />
           </span>
        </div>

        <div className="flex items-center gap-3 mt-4 text-[13px]">
          <div className="flex gap-1"><span className="font-bold text-[15px]">{data.followingCount}</span> <span className="text-white/60">Following</span></div>
          <div className="w-0.5 h-3 bg-white/20" />
          <div className="flex gap-1"><span className="font-bold text-[15px]">{data.followersCount}</span> <span className="text-white/60">Followers</span></div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button className="flex-1 bg-[#1A1A1E] border border-white/5 rounded-xl p-3 active:bg-white/5 text-left">
             <div className="flex flex-col">
               <span className="flex items-center gap-1.5 text-sm font-bold"><PiHeartFill className="text-white w-4 h-4" /> Fans</span>
               <span className="text-[11px] text-white/50 mt-1 flex items-center justify-between">Fan Club {data.stats.fansClub} <PiCaretRightBold /></span>
             </div>
          </button>
          <button className="flex-1 bg-[#1A1A1E] border border-white/5 rounded-xl p-3 active:bg-white/5 text-left">
             <div className="flex flex-col">
               <span className="flex items-center gap-1.5 text-sm font-bold"><PiGiftFill className="text-white w-4 h-4" /> Gift Gallery</span>
               <span className="text-[11px] text-white/50 mt-1 flex items-center justify-between">Lit: {data.stats.litGifts} <PiCaretRightBold /></span>
             </div>
          </button>
        </div>
      </div>

      {/* Bottom White Panel */}
      <div className="mt-6 flex-1 bg-white rounded-t-[32px] pt-3 pb-10 text-ink z-10 relative">
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
        
        {/* Tabs */}
        <div className="flex items-center justify-around px-8 border-b border-line pb-3">
           <div className="relative cursor-pointer">
             <PiGridFourFill className="w-6 h-6 text-ink" />
             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-1 bg-ink rounded-full" />
           </div>
           <PiHeart className="w-6 h-6 text-ink-muted cursor-pointer" />
           <PiUserFill className="w-6 h-6 text-ink-muted cursor-pointer" />
        </div>

        {/* Content */}
        <div className="px-4 mt-5">
           {/* Contribution List */}
           <div className="bg-[#FCF5FF] rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer active:opacity-80">
              <div>
                <p className="font-bold text-[15px] text-[#4F1A5B]">Contribution List</p>
                <p className="text-[11px] text-[#855D8F] mt-0.5">Ranked Participants: {data.stats.rankedParticipants}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-[34px] h-[34px] rounded-full border-2 border-[#FFD700] shadow-sm flex items-center justify-center text-[10px] bg-white z-20">🥇</div>
                <div className="w-[34px] h-[34px] rounded-full border-2 border-[#C0C0C0] shadow-sm flex items-center justify-center text-[10px] bg-white -ml-3 z-10">🥈</div>
                <div className="w-[34px] h-[34px] rounded-full border-2 border-[#CD7F32] shadow-sm flex items-center justify-center text-[10px] bg-white -ml-3 z-0">🥉</div>
                <div className="w-[18px] h-[18px] rounded-full bg-[#855D8F] text-white flex items-center justify-center ml-1">
                  <PiCaretRightBold className="w-3 h-3" />
                </div>
              </div>
           </div>

           {/* Gallery */}
           <div className="flex gap-3 mt-5">
             {data.gallery.map((item, i) => (
                <div key={i} className={`w-[84px] h-[84px] rounded-xl flex items-center justify-center overflow-hidden ${item.bg}`}>
                  <span className={item.type === 'emoji' ? 'text-[40px]' : 'text-3xl'}>{item.content}</span>
                </div>
             ))}
             <div className="w-[84px] h-[84px] bg-surface-sunken rounded-xl flex items-center justify-center active:opacity-60 cursor-pointer">
               <span className="text-3xl text-ink-ghost font-light">+</span>
             </div>
           </div>

           {/* Personal Information */}
           <h2 className="font-bold text-[17px] mt-8 mb-4">Personal Information</h2>
           
           <div className="flex flex-wrap gap-2.5 mb-5">
             <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E8F4FF] text-[#2995FC] text-xs font-bold border border-[#E8F4FF]">
               {data.gender === 'male' ? '♂' : '♀'} {data.age}
             </span>
             <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E9F9F0] text-[#00A854] text-xs font-bold border border-[#E9F9F0]">
               🇧🇩 {data.countryCode}
             </span>
             <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F0F5FF] text-[#2F54EB] text-xs font-bold border border-[#F0F5FF]">
               <div className="w-[14px] h-[14px] rounded bg-[#2F54EB] text-white flex items-center justify-center text-[8px] mr-0.5">✓</div>
               Facial Authentication <PiCaretRightBold className="ml-0.5" />
             </span>
           </div>

           <div className="text-[14px] text-ink font-medium leading-relaxed space-y-1.5 pb-8">
             <p>এজেন্সি আইডি: {data.id}</p>
             <p>হোয়াটসঅ্যাপ নাম্বার ={data.whatsapp}</p>
             {data.personalInfo.map((info, i) => (
                <p key={i}>{info}</p>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
