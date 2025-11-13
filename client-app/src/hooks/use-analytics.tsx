import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

declare global {
  interface Window { posthog?: any }
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
    // Load SDK from your PostHog host to avoid CDN/adblock issues
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
      if (window.posthog?._isInitialized) return; // prevent double init
      ph.init(key, {
        api_host: host,
        capture_pageview: false, // manual pageviews
        capture_pageleave: true,
        session_recording: { record_cross_origin_iframe_messages: true },
        person_profiles: 'identified_only',
      });
      console.debug('[analytics] PostHog initialized', { host });
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
      try { window.posthog?.capture?.('$pageview', { path: location.pathname }); console.debug('[analytics] $pageview (initial)', location.pathname); } catch {}
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
    ensurePosthogLoaded(host).then(() => {
      try { window.posthog?.capture?.('$pageview', { path: location.pathname }); console.debug('[analytics] $pageview', location.pathname); } catch {}
      prevLocationRef.current = location.pathname;
    });
  }, [location.pathname, key, respectDnt, dnt, host]);
};