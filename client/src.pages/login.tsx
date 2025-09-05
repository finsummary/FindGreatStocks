import { useAuth } from '@/providers/AuthProvider';
import { useState } from 'react';

export function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  console.log('Auth state in LoginPage:', auth, email);
  return (
    <div>
      <h1>This is the simplest login page.</h1>
      <p>State: {auth ? 'loaded' : 'loading'}</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email test" />
    </div>
  );
}


