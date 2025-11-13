import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';
import posthog from 'posthog-js';

export const useAnalytics = () => {
  const location = useLocation();
  const prevLocationRef = useRef<string>(location.pathname);

  // Init PostHog once
  useEffect(() => {
    const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
    const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';
    if (!key) return;

    const dnt = typeof navigator !== 'undefined' && (navigator as any).doNotTrack === '1';
    if (dnt) {
      posthog.opt_out_capturing();
      return;
    }

    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // pageviews manually via Router
      capture_pageleave: true,
      session_recording: { record_cross_origin_iframe_messages: true },
      person_profiles: 'identified_only',
    });
  }, []);
  
  // Page view on route change (GA + PostHog)
  useEffect(() => {
    if (location.pathname !== prevLocationRef.current) {
      // Google Analytics (if configured)
      trackPageView(location.pathname);
      // PostHog
      try { posthog.capture('$pageview', { path: location.pathname }); } catch {}
      prevLocationRef.current = location.pathname;
    }
  }, [location.pathname]);
};