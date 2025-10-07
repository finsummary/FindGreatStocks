export const API_BASE = (typeof window !== 'undefined'
  ? (window as any).__API_BASE__
  : undefined) || (import.meta as any)?.env?.VITE_API_URL || 'https://findgreatstocks-production.up.railway.app';



