interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

export const Loading = ({ size = 'md', className = '' }: LoadingProps) => {
  if (size === 'lg') {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* The spinning loading round */}
          <svg className="absolute inset-0 w-full h-full animate-spin text-[#4C3BFF] opacity-30" viewBox="0 0 24 24">
            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" fill="none" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          
          {/* The static picture */}
          <div className="w-20 h-20 rounded-full overflow-hidden relative z-10 animate-pulse border-2 border-white/50 shadow-sm">
            <img 
              src="/loading-pic.png" 
              alt="Loading" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-1.5 opacity-80">
          <div className="w-2 h-2 rounded-full bg-[#4C3BFF] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#4C3BFF] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[#4C3BFF] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg className={`animate-spin ${sizes[size]} text-ink-ghost`} viewBox="0 0 24 24">
        <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
};
