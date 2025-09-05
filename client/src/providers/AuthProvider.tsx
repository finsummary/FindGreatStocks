import { createContext, useState, useEffect, useContext, FC, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/authFetch';
import type { User as DbUser } from '@shared/schema';

interface AuthContextType {
  user: DbUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        if (session) {
          const dbUser = await authFetch('/api/auth/me', {}, session.access_token);
          setUser(dbUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching initial session:", error);
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          try {
            const dbUser = await authFetch('/api/auth/me', {}, session.access_token);
            setUser(dbUser);
          } catch (error) {
            console.error("Error fetching user on auth state change:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        // No loading state change here, initial load is what matters
      }
    );

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
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
