import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

declare global {
  interface Window { posthog?: any }
}

function ensurePosthogLoaded(): Promise<any> {
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
    s.src = 'https://unpkg.com/posthog-js@latest/dist/posthog.js';
    s.onload = () => resolve(window.posthog);
    document.head.appendChild(s);
  });
}

export const useAnalytics = () => {
  const location = useLocation();
  const prevLocationRef = useRef<string>(location.pathname);

  // Init PostHog once
  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
    const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';
    if (!key) return;

    const dnt = typeof navigator !== 'undefined' && (navigator as any).doNotTrack === '1';
    if (dnt) return;

    ensurePosthogLoaded().then((ph) => {
      if (!ph) return;
      if (window.posthog?._isInitialized) return; // prevent double init
      ph.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
        session_recording: { record_cross_origin_iframe_messages: true },
        person_profiles: 'identified_only',
      });
    });
  }, []);
  
  // Page view on route change (GA + PostHog)
  useEffect(() => {
    if (location.pathname !== prevLocationRef.current) {
      // Google Analytics (if configured)
      trackPageView(location.pathname);
      // PostHog
      try { window.posthog?.capture?.('$pageview', { path: location.pathname }); } catch {}
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);
};