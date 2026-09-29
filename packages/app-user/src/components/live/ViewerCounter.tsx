import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { PiUsersFill as Users } from 'react-icons/pi';

interface ViewerCounterProps {
  count: number;
  onClick?: () => void;
}

const useAnimatedNumber = (target: number) => {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const controls = animate(prevRef.current, target, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevRef.current = target;
    return () => controls.stop();
  }, [target]);

  return display;
};

export const ViewerCounter = ({ count, onClick }: ViewerCounterProps) => {
  const display = useAnimatedNumber(count);

  return (
    <button
      onClick={onClick}
      aria-label={`${count} viewers`}
      className="glass-chip flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/20 transition-colors"
    >
      <Users className="w-3.5 h-3.5 text-pink-400" />
      <span className="tabular-nums" aria-live="polite">
        {display.toLocaleString()}
      </span>
    </button>
  );
};
