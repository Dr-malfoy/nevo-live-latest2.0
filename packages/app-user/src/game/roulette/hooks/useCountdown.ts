// Server-driven countdown (ms remaining from endsAt).

import { useEffect, useState } from 'react';

const BET_WINDOW_MS = 10000; // matches backend BET_MS

export function useCountdown(endsAt: number | null, active: boolean) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!active || !endsAt) {
      setRemaining(0);
      return;
    }
    let id: ReturnType<typeof setInterval> | null = null;
    const update = () => {
      const ms = Math.max(0, endsAt - Date.now());
      setRemaining(ms);
      if (ms <= 0 && id) clearInterval(id);
    };
    update();
    id = setInterval(update, 100);
    return () => {
      if (id) clearInterval(id);
    };
  }, [endsAt, active]);

  return {
    remaining,
    seconds: Math.ceil(remaining / 1000),
    progress: active && endsAt ? Math.min(1, Math.max(0, remaining / BET_WINDOW_MS)) : 0,
    urgent: remaining <= 3000 && remaining > 0,
  };
}
