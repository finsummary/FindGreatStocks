// Prefer same-origin proxy via Vercel rewrites. Fallback to env-provided base if explicitly set.
export const API_BASE = (typeof window !== 'undefined'
  ? (window as any).__API_BASE__
  : undefined) || (import.meta as any)?.env?.VITE_API_URL || '';









