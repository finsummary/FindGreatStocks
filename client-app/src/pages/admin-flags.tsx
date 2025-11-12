import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authFetch } from '@/lib/authFetch';

type FlagRow = {
  key: string;
  enabled: boolean;
  rollout_percent: number | null;
  allowlist_emails: string[] | null;
  updated_at?: string;
};

export default function AdminFlagsPage() {
  const { user, session, loading } = useAuth();
  const [rows, setRows] = useState<FlagRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const email = useMemo(() => (user?.email || '').toLowerCase(), [user]);
  const allowed = email === 'findgreatstocks@gmail.com';
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!session?.access_token) return;
        const r = await authFetch('/api/feature-flags', undefined, session.access_token);
        if (!alive) return;
        setRows(r?.flags || []);
      } catch {}
    };
    load();
    return () => { alive = false; };
  }, [session?.access_token]);

  const updateFlag = async (key: string, patch: Partial<FlagRow>) => {
    if (!session?.access_token) return;
    try {
      setSaving(key);
      await authFetch(`/api/feature-flags/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: typeof patch.enabled === 'boolean' ? patch.enabled : undefined,
          rolloutPercent: typeof patch.rollout_percent === 'number' ? patch.rollout_percent : undefined,
          allowlistEmails: Array.isArray(patch.allowlist_emails) ? patch.allowlist_emails : undefined,
        }),
      }, session.access_token);
      // refresh
      const r = await authFetch('/api/feature-flags', undefined, session.access_token);
      setRows(r?.flags || []);
    } catch (e) {
      // noop basic
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!allowed) return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Feature Flags</h1>
      <div className="mb-4 flex items-center gap-3">
        <Input
          className="max-w-sm"
          placeholder="Search flags…"
          value={filter}
          onChange={(e) => setTimeout(() => setFilter(e.target.value), 0)}
        />
      </div>
      <div className="space-y-3">
        {rows
          .filter(f => !filter || f.key.toLowerCase().includes(filter.toLowerCase()))
          .map((f) => (
          <div key={f.key} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 border rounded-md">
            <div className="flex-1">
              <div className="font-mono text-sm">{f.key}</div>
              <div className="text-xs text-muted-foreground">Updated: {f.updated_at || '—'}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Enabled</label>
              <input
                type="checkbox"
                checked={!!f.enabled}
                onChange={(e) => updateFlag(f.key, { enabled: e.target.checked, rollout_percent: e.target.checked ? null : f.rollout_percent })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Rollout %</label>
              <Input
                className="w-24"
                type="number"
                min={0}
                max={100}
                value={f.rollout_percent ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value)));
                  const newRow = { ...f, rollout_percent: v as any };
                  setRows((prev) => prev.map(r => r.key === f.key ? newRow : r));
                }}
                onBlur={() => updateFlag(f.key, { rollout_percent: rows.find(r => r.key === f.key)?.rollout_percent ?? null })}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Allowlist (emails)</label>
              <Input
                className="w-80"
                value={(f.allowlist_emails || []).join(', ')}
                onChange={(e) => {
                  const parts = e.target.value
                    ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    : [];
                  const newRow = { ...f, allowlist_emails: parts as any };
                  setRows(prev => prev.map(r => r.key === f.key ? newRow : r));
                }}
                onBlur={(e) => {
                  const parts = e.target.value
                    ? e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                    : [];
                  updateFlag(f.key, { allowlist_emails: parts as any });
                }}
                placeholder="you@domain.com, teammate@domain.com"
              />
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={saving === f.key}
                onClick={() => updateFlag(f.key, { enabled: !f.enabled })}
              >
                {saving === f.key ? 'Saving…' : (f.enabled ? 'Disable' : 'Enable')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


