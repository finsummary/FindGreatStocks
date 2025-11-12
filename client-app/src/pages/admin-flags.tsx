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
        const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
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
      }, session?.access_token);
      const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
      setRows(r?.flags || []);
    } catch (e) {
      // noop
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!allowed) return <div className="p-6 text-sm text-muted-foreground">Access denied.</div>;

  const getCategory = (k: string) => {
    if (k.startsWith('market:')) return 'Markets';
    if (k.startsWith('education')) return 'Education';
    if (k.startsWith('layout:')) return 'Layouts';
    return 'Other';
  };

  const filtered = useMemo(
    () => rows.filter(r => !filter || r.key.toLowerCase().includes(filter.toLowerCase())),
    [rows, filter]
  );

  const groups = useMemo(() => {
    const g: Record<string, FlagRow[]> = { 'Education': [], 'Markets': [], 'Layouts': [], 'Other': [] };
    for (const r of filtered) {
      const cat = getCategory(r.key);
      (g[cat] = g[cat] || []).push(r);
    }
    Object.keys(g).forEach(k => g[k].sort((a, b) => a.key.localeCompare(b.key)));
    return g;
  }, [filtered]);

  const bulkToggle = async (category: string, enabled: boolean) => {
    const list = groups[category] || [];
    for (const r of list) {
      await updateFlag(r.key, { enabled, rollout_percent: null });
    }
    if (session?.access_token) {
      const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
      setRows(r?.flags || []);
    }
  };

  const bulkAllowMe = async (category: string, add: boolean) => {
    const me = (user?.email || '').toLowerCase();
    if (!me) return;
    const list = groups[category] || [];
    for (const r of list) {
      const current = (r.allowlist_emails || []).map(e => e.toLowerCase());
      const next = add ? Array.from(new Set([...current, me])) : current.filter(e => e !== me);
      await updateFlag(r.key, { allowlist_emails: next as any });
    }
    if (session?.access_token) {
      const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
      setRows(r?.flags || []);
    }
  };

  const bulkOnlyMe = async (category: string) => {
    const me = (user?.email || '').toLowerCase();
    if (!me) return;
    const list = groups[category] || [];
    for (const r of list) {
      await updateFlag(r.key, { enabled: false, rollout_percent: null, allowlist_emails: [me] as any });
    }
    if (session?.access_token) {
      const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
      setRows(r?.flags || []);
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Feature Flags</h1>

      <div className="mb-4 flex items-center gap-3">
        <Input
          className="max-w-sm"
          placeholder="Search flags…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {(['Education','Markets','Layouts','Other'] as const).map((cat) => {
        const list = filtered.filter(f => getCategory(f.key) === cat);
        return (
          <div key={cat} className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{cat}</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => bulkToggle(cat, true)}>Enable all</Button>
                <Button variant="ghost" size="sm" onClick={() => bulkToggle(cat, false)}>Disable all</Button>
                <Button variant="outline" size="sm" onClick={() => bulkAllowMe(cat, true)}>Allow me</Button>
                <Button variant="ghost" size="sm" onClick={() => { bulkAllowMe(cat, false); }}>Remove me</Button>
                <Button variant="secondary" size="sm" onClick={() => bulkOnlyMe(cat)}>Only me</Button>
              </div>
            </div>
            <div className="space-y-3">
              {list.map((f) => {
                const allowStr = (f.allowlist_emails || []).join(', ');
                const invalids = (f.allowlist_emails || []).filter(e => !emailRegex.test(e));
                return (
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1">
                      <label className="text-sm">Allowlist</label>
                      <Input
                        className="w-full sm:w-96"
                        value={allowStr}
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
                          const valid = parts.filter(p => emailRegex.test(p));
                          updateFlag(f.key, { allowlist_emails: valid as any });
                        }}
                        placeholder="you@domain.com, teammate@domain.com"
                      />
                      {invalids.length > 0 && (
                        <div className="text-xs text-red-600">Invalid: {invalids.join(', ')}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const me = (user?.email || '').toLowerCase();
                          const current = (f.allowlist_emails || []).map(e => e.toLowerCase());
                          const next = Array.from(new Set([...current, me]));
                          updateFlag(f.key, { allowlist_emails: next as any });
                        }}
                      >
                        Allow me
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const me = (user?.email || '').toLowerCase();
                          const current = (f.allowlist_emails || []).map(e => e.toLowerCase());
                          const next = current.filter(e => e !== me);
                          updateFlag(f.key, { allowlist_emails: next as any });
                        }}
                      >
                        Remove me
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const me = (user?.email || '').toLowerCase();
                          updateFlag(f.key, { enabled: false, rollout_percent: null, allowlist_emails: [me] as any });
                        }}
                      >
                        Only me
                      </Button>
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
                );
              })}
              {list.length === 0 && (
                <div className="text-sm text-muted-foreground">No flags</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


