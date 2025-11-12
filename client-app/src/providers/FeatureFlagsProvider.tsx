import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type FlagsMap = Record<string, { enabled?: boolean; rolloutPercent?: number }>;

interface FeatureFlagsContextValue {
  flags: FlagsMap;
  isEnabled: (key: string) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: {},
  isEnabled: () => false,
});

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FlagsMap>({});

  useEffect(() => {
    let alive = true;
    const fetchFlags = async () => {
      try {
        const res = await fetch('/api/config', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!alive) return;
        setFlags(json?.flags || {});
      } catch {
        // Fallback defaults if API not available yet
        if (!alive) return;
        setFlags({
          education: { enabled: false },
        });
      }
    };
    fetchFlags();
    const id = setInterval(fetchFlags, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const value = useMemo<FeatureFlagsContextValue>(() => {
    const isEnabled = (key: string) => {
      const f = flags?.[key];
      if (!f) return false;
      if (typeof f.enabled === 'boolean') return f.enabled;
      // rollout support (simple client-side hash by key)
      if (typeof f.rolloutPercent === 'number') {
        // very simple hash: stable per key
        const h = Math.abs(
          Array.from(key).reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0)
        ) % 100;
        return h < Math.max(0, Math.min(100, f.rolloutPercent));
      }
      return false;
    };
    return { flags, isEnabled };
  }, [flags]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFlag(key: string): boolean {
  return useContext(FeatureFlagsContext).isEnabled(key);
}


