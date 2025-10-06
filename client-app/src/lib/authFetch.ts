import { supabase } from './supabaseClient';

export async function authFetch(url: string, options: RequestInit = {}, token?: string | null) {
  let sessionToken = token;

  if (!sessionToken) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      sessionToken = session.access_token;
    }
  }

  if (!sessionToken) {
    console.error('authFetch error: No session token available.');
    throw new Error('User is not authenticated. Please log in again.');
  }

  const headers = new Headers(options.headers || {});
  headers.append('Authorization', `Bearer ${sessionToken}`);

  const fullUrl = url.startsWith('http') ? url : `https://findgreatstocks-production.up.railway.app${url}`;
  const response = await fetch(fullUrl, { ...options, headers });

  if (response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response;
  }

  try {
    const errorBody = await response.json();
    const errorMessage = errorBody.error?.message || errorBody.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  } catch (e) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}


