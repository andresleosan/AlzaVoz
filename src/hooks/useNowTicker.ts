"use client";

import { useEffect, useState } from "react";

export function useNowTicker(active: boolean, intervalMs: number = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      const resetTimer = setTimeout(() => {
        setNow((prev) => (prev === null ? prev : null));
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const initialTimer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [active, intervalMs]);

  return now;
}
