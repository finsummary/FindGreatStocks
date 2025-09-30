import { createContext, useState, useEffect, useContext, FC, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/authFetch';
import type { User as DbUser } from '../types';

interface AuthContextType {
  user: DbUser | null;
  session: Session | null;
  loading: boolean; // Keep loading for spinners etc.
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (currentSession: Session | null) => {
    if (!currentSession) return;
    try {
      const dbUser = await authFetch('/api/auth/me', {}, currentSession.access_token);
      setUser(dbUser);
    } catch (error) {
      console.error('Error fetching DB user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);
        if (session) {
          await fetchDbUser(session);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initial check to prevent blank screen on load
    const initializeSession = async () => {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        if (initialSession) {
          await fetchDbUser(initialSession);
        }
        setLoading(false);
    };
    initializeSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    },
    refreshUser: async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      setSession(current);
      await fetchDbUser(current);
    }
  };

  // Render children unconditionally to avoid unmounting/remounting issues
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
