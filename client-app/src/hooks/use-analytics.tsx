import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

declare global {
  interface Window {
    posthog?: any;
    phCapture?: (name: string, props?: any, opts?: { instant?: boolean }) => void;
    phQueue?: any[];
    phFlush?: (cb?: () => void) => void;
  }
}

function ensurePosthogLoaded(apiHost: string): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.posthog) return resolve(window.posthog);
    const scriptId = 'posthog-sdk';
    if (document.getElementById(scriptId)) {
      const check = () => window.posthog ? resolve(window.posthog) : setTimeout(check, 50);
      check();
      return;
    }
    const s = document.createElement('script');
    s.id = scriptId;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `${apiHost.replace(/\/$/, '')}/static/array.js`;
    s.onload = () => resolve(window.posthog);
    s.onerror = () => resolve(undefined);
    document.head.appendChild(s);
  });
}

export const useAnalytics = () => {
  const location = useLocation();
  const prevLocationRef = useRef<string | null>(null);

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.posthog.com';
  const respectDnt = String(import.meta.env.VITE_ANALYTICS_RESPECT_DNT || '').toLowerCase() === 'true';
  const dnt = typeof navigator !== 'undefined' && (navigator as any).doNotTrack === '1';

  // Lightweight queue + helpers before SDK init
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.phQueue) window.phQueue = [];
    window.phCapture = (name, props, opts) => {
      const ph = window.posthog as any;
      const options: any = {};
      if (opts?.instant) {
        // prefer sendBeacon / instant delivery if supported
        // PostHog supports { transport: 'sendBeacon' } or { send_instantly: true } depending on version
        options.transport = 'sendBeacon';
        options.send_instantly = true;
      }
      if (ph && typeof ph.capture === 'function') {
        try { ph.capture(name, props || {}, options); } catch {}
      } else {
        window.phQueue!.push([name, props || {}, options]);
      }
    };
    window.phFlush = (cb?: () => void) => {
      const ph = window.posthog as any;
      if (ph && typeof ph.flush === 'function') {
        try { ph.flush(cb); return; } catch {}
      }
      // Fallback: small timeout
      setTimeout(() => cb && cb(), 200);
    };
  }, []);

  // Init PostHog once
  useEffect(() => {
    if (!key) {
      console.debug('[analytics] PostHog key missing, skip init');
      return;
    }
    if (respectDnt && dnt) {
      console.debug('[analytics] DNT enabled, skip init');
      return;
    }
    ensurePosthogLoaded(host).then((ph) => {
      if (!ph) { console.debug('[analytics] PostHog SDK failed to load'); return; }
      if ((window as any).posthog?._isInitialized) return; // prevent double init
      ph.init(key, {
        api_host: host,
        capture_pageview: false, // manual pageviews
        capture_pageleave: true,
        session_recording: { record_cross_origin_iframe_messages: true },
        person_profiles: 'identified_only',
        autocapture: true,
        loaded: (phClient: any) => {
          const q = (window as any).phQueue as any[];
          if (Array.isArray(q) && q.length) {
            q.forEach((it) => {
              try { phClient.capture(it[0], it[1] || {}, it[2] || {}); } catch {}
            });
            (window as any).phQueue = [];
          }
          // flush on pagehide (mobile safari etc.)
          window.addEventListener('pagehide', () => {
            try { phClient.flush?.(); } catch {}
          });
          console.debug('[analytics] PostHog initialized', { host });
        },
      });
      try { ph.capture('fgs_boot', { t: Date.now() }); } catch {}
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Send initial pageview on mount
  useEffect(() => {
    // GA
    trackPageView(location.pathname);
    // PostHog (after SDK ready)
    if (!key || (respectDnt && dnt)) return;
    ensurePosthogLoaded(host).then(() => {
      try { window.phCapture?.('$pageview', { path: location.pathname }); console.debug('[analytics] $pageview (initial)', location.pathname); } catch {}
      prevLocationRef.current = location.pathname;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page view on route change (GA + PostHog)
  useEffect(() => {
    const prev = prevLocationRef.current;
    if (prev !== null && location.pathname === prev) return;
    // GA
    trackPageView(location.pathname);
    // PostHog
    if (!key || (respectDnt && dnt)) {
      prevLocationRef.current = location.pathname;
      return;
    }
    window.phCapture?.('$pageview', { path: location.pathname });
    console.debug('[analytics] $pageview', location.pathname);
    prevLocationRef.current = location.pathname;
  }, [location.pathname, key, respectDnt, dnt, host]);
};