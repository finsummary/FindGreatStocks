import { createContext, useState, useEffect, useContext, FC, ReactNode } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authFetch } from '@/lib/authFetch';
import type { User as DbUser } from '@shared/schema';

interface AuthContextType {
  user: DbUser | null;
  session: Session | null;
  loading: boolean; // Keep loading for spinners etc.
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        setSession(session);
        if (session) {
          try {
            // Explicitly pass the token from the session object
            const dbUser = await authFetch('/api/auth/me', {}, session.access_token);
            setUser(dbUser);
          } catch (error) {
            console.error("Error fetching user on auth state change:", error);
            setUser(null);
            // In case of error fetching profile, sign out to clear corrupted state
            await supabase.auth.signOut();
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initial check to prevent blank screen on load
    const initializeSession = async () => {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!initialSession) {
            setLoading(false);
        }
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
