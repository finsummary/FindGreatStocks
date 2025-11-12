import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthProvider';

type FlagsMap = Record<string, { enabled?: boolean; rolloutPercent?: number; allowlistEmails?: string[] }>;

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
  const { user } = useAuth();

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
    const currentEmail = (user?.email || '').toLowerCase();
    const isEnabled = (key: string) => {
      const f = flags?.[key];
      if (!f) return false;
      // allowlist check has priority
      if (Array.isArray(f.allowlistEmails) && f.allowlistEmails.some(e => (e || '').toLowerCase() === currentEmail)) {
        return true;
      }
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
  }, [flags, user]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFlag(key: string): boolean {
  return useContext(FeatureFlagsContext).isEnabled(key);
}


