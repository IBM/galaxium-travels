import { useEffect, useState } from 'react';

/** Milliseconds left until an ISO timestamp, re-rendering once a second. 0 when it has passed or is missing. */
export const useCountdown = (until: string | null | undefined): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!until) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (!until) return 0;
  const remaining = new Date(until).getTime() - now;
  return Number.isNaN(remaining) ? 0 : Math.max(0, remaining);
};

/** "12:41" */
export const formatCountdown = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
