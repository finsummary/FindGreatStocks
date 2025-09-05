import { supabase } from '@/lib/supabaseClient';

export const authFetch = async (url: string, options: RequestInit = {}, token?: string | null) => {
  let sessionToken = token;

  if (!sessionToken) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      sessionToken = session.access_token;
    }
  }

  if (!sessionToken) {
    // Deliberately throw an error that our logic can catch
    const error = new Error("User is not authenticated");
    (error as any).status = 401;
    throw error;
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${sessionToken}`);

  if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.');
    try {
      (error as any).info = await response.json();
    } catch (e) {
      (error as any).info = { message: 'Response was not valid JSON.' };
    }
    (error as any).status = response.status;
    throw error;
  }

  // Handle cases where response might be empty
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text; // Return text if it's not JSON
  }
};


