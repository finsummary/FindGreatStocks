import { supabase } from '@/lib/supabase';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useLocation } from 'wouter';

export function LoginPage() {
  const [, navigate] = useLocation();

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN') {
      navigate('/');
    }
  });

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
        />
      </div>
    </div>
  );
}


