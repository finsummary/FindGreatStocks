import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export function ProfilePage() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChangePassword = async () => {
    setError(null); setMessage(null);
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); } else { setPassword(''); setConfirm(''); setMessage('Password updated.'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ''} readOnly />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && <div className="text-green-600 text-sm">{message}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div>
            <Label>New Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          <Button onClick={onChangePassword} disabled={loading}>{loading ? 'Saving...' : 'Save Password'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}


