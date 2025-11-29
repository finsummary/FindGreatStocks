export function initSentry() {
  try {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    const env = (import.meta.env.VITE_SENTRY_ENV as string | undefined) || 'production';
    const release = (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || '';
    if (!dsn) return;
    const scriptId = 'sentry-browser-sdk';
    if (document.getElementById(scriptId)) return;
    const s = document.createElement('script');
    s.id = scriptId;
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://browser.sentry-cdn.com/7.114.0/bundle.min.js';
    s.setAttribute('integrity', 'sha384-mkZ8P3S5uVNezY0l0nW3O8c9MoOt5Y9mXQKcH7YqT3H3oZ2p9Q9H2QW3s6xH8i5Z');
    s.onerror = () => {};
    s.onload = () => {
      try {
        // @ts-ignore
        if ((window as any).Sentry && !(window as any).Sentry._inited) {
          // @ts-ignore
          (window as any).Sentry.init({ dsn, environment: env, release, tracesSampleRate: 0.0 });
          // @ts-ignore
          (window as any).Sentry._inited = true;
        }
      } catch {}
    };
    document.head.appendChild(s);
    // Global error fallback
    window.addEventListener('error', (e) => {
      try { (window as any).Sentry?.captureException?.(e.error || e.message || e); } catch {}
    });
    window.addEventListener('unhandledrejection', (e) => {
      try { (window as any).Sentry?.captureException?.(e.reason || e); } catch {}
    });
  } catch {}
}


