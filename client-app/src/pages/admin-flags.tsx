import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type AuditRow = { id: number; key: string; actor_email: string; changed_at: string; prev: any; next: any };

function CreateFlagBox({ onCreate }: { onCreate: (p: { key: string; enabled: boolean; rolloutPercent: number | null; allowlistEmails: string[] }) => Promise<void> }) {
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [rolloutPercent, setRolloutPercent] = useState<number | ''>('');
  const [allowlist, setAllowlist] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const k = key.trim();
    if (!k) return;
    const rp = rolloutPercent === '' ? null : Math.max(0, Math.min(100, Number(rolloutPercent)));
    const emails = allowlist
      ? allowlist.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];
    setBusy(true);
    try {
      await onCreate({ key: k, enabled, rolloutPercent: rp, allowlistEmails: emails });
      setKey(''); setEnabled(false); setRolloutPercent(''); setAllowlist('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 p-3 border rounded-md">
      <div className="mb-2 font-semibold">Create / Upsert Flag</div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input className="sm:w-64" placeholder="key (e.g., premium:allow)" value={key} onChange={e => setKey(e.target.value)} />
        <label className="text-sm flex items-center gap-2">
          Enabled
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm">Rollout %</span>
          <Input className="w-24" type="number" min={0} max={100} value={rolloutPercent} onChange={e => setRolloutPercent(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      </div>
      <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input className="sm:w-[32rem]" placeholder="Allowlist emails (comma separated)" value={allowlist} onChange={e => setAllowlist(e.target.value)} />
        <Button size="sm" disabled={busy || !key.trim()} onClick={submit}>{busy ? 'Saving…' : 'Save Flag'}</Button>
      </div>
    </div>
  );
}

export default function AdminFlagsPage() {
  const { user, session, loading } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const email = useMemo(() => (user?.email || '').toLowerCase(), [user]);
  // Frontend не ограничивает по конкретному email — сервер проверит ADMIN_EMAILS/x-admin-token
  const allowed = !!session?.access_token;
  const [filter, setFilter] = useState('');
  const [audits, setAudits] = useState<AuditRow[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        if (!session?.access_token) return;
        const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
        if (!alive) return;
        setFlags(r?.flags || []);
      } catch {}
    };
    load();
    return () => { alive = false; };
  }, [session?.access_token]);

  useEffect(() => {
    let alive = true;
    const loadAudit = async () => {
      try {
        if (!session?.access_token) return;
        const qs = filter ? `?key=${encodeURIComponent(filter)}` : '';
        const r = await authFetch(`/api/feature-flags/audit${qs}`, undefined, session?.access_token);
        if (!alive) return;
        setAudits(r?.items || []);
      } catch {}
    };
    loadAudit();
    return () => { alive = false; };
  }, [session?.access_token, filter]);

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
      setFlags(r?.flags || []);
      const auditR = await authFetch(`/api/feature-flags/audit?key=${encodeURIComponent(key)}`, undefined, session?.access_token);
      setAudits(auditR?.items || []);
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
    () => flags.filter(r => !filter || r.key.toLowerCase().includes(filter.toLowerCase())),
    [flags, filter]
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
      setFlags(r?.flags || []);
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  const renderFlagRow = (f: FlagRow) => (
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
            setFlags((prev) => prev.map(r => r.key === f.key ? newRow : r));
          }}
          onBlur={() => updateFlag(f.key, { rollout_percent: flags.find(r => r.key === f.key)?.rollout_percent ?? null })}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 flex-1">
        <label className="text-sm">Allowlist</label>
        <Input
          className="w-full sm:w-96"
          value={(f.allowlist_emails || []).join(', ')}
          onChange={(e) => {
            const parts = e.target.value
              ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              : [];
            const newRow = { ...f, allowlist_emails: parts as any };
            setFlags(prev => prev.map(r => r.key === f.key ? newRow : r));
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

  const downloadCsv = () => {
    const headers = ['id','key','actor_email','changed_at','prev','next'];
    const lines = [headers.join(',')];
    for (const a of audits) {
      const row = [a.id, a.key, a.actor_email, a.changed_at, JSON.stringify(a.prev||{}), JSON.stringify(a.next||{})]
        .map(v => '"' + String(v).replace(/\"/g,'""') + '"')
        .join(',');
      lines.push(row);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feature_flag_audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const [tab, setTab] = useState<'flags' | 'audit'>('flags');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Feature Flags</h1>

      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!session?.access_token) return;
            try {
              const r = await authFetch('/api/admin/backfill/revenue-10y', { method: 'POST' }, session?.access_token);
              alert(`Backfill started: updated=${r?.status?.updated ?? 0}, nulled=${r?.status?.nulled ?? 0}`);
            } catch (e: any) {
              alert(`Failed to start backfill: ${e?.message || e}`);
            }
          }}
        >
          Backfill Rev G 10Y
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (!session?.access_token) return;
            try {
              const r = await authFetch('/api/admin/backfill/revenue-10y/status', undefined, session?.access_token);
              alert(`Status: running=${r?.status?.running ? 'yes' : 'no'}; updated=${r?.status?.updated ?? 0}; nulled=${r?.status?.nulled ?? 0}`);
            } catch (e: any) {
              alert(`Failed to get status: ${e?.message || e}`);
            }
          }}
        >
          Check Backfill Status
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab((v as any) || 'flags')}>
        <TabsList className="mb-4">
          <TabsTrigger value="flags">Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <div className="mb-4 flex items-center gap-3">
          <Input
            className="max-w-sm"
            placeholder="Search flags…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <TabsContent value="flags">
          {/* Create / Upsert Flag */}
          <CreateFlagBox
            onCreate={async (payload) => {
              if (!session?.access_token) return;
              await authFetch(`/api/feature-flags/${encodeURIComponent(payload.key)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  enabled: payload.enabled,
                  rolloutPercent: payload.rolloutPercent,
                  allowlistEmails: payload.allowlistEmails,
                }),
              }, session?.access_token);
              const r = await authFetch('/api/feature-flags', undefined, session?.access_token);
              setFlags(r?.flags || []);
            }}
          />

          {(['Education','Markets','Layouts','Other'] as const).map((cat) => {
            const list = filtered.filter(f => getCategory(f.key) === cat);
            return (
              <div key={cat} className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">{cat}</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => bulkToggle(cat, true)}>Enable all</Button>
                    <Button variant="ghost" size="sm" onClick={() => bulkToggle(cat, false)}>Disable all</Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {list.map((f) => renderFlagRow(f))}
                  {list.length === 0 && (
                    <div className="text-sm text-muted-foreground">No flags</div>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>
        <TabsContent value="audit">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Recent changes (auto-filter by key if you type in the search box)</div>
            <Button variant="outline" size="sm" onClick={downloadCsv}>Download CSV</Button>
          </div>
          <div className="overflow-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Key</th>
                  <th className="text-left p-2">Actor</th>
                  <th className="text-left p-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{new Date(a.changed_at).toLocaleString()}</td>
                    <td className="p-2 font-mono">{a.key}</td>
                    <td className="p-2">{a.actor_email}</td>
                    <td className="p-2 align-top">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-xs">
                          <div className="font-semibold">Previous</div>
                          <pre className="whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{JSON.stringify(a.prev || {}, null, 2)}</pre>
                        </div>
                        <div className="text-xs">
                          <div className="font-semibold">Next</div>
                          <pre className="whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{JSON.stringify(a.next || {}, null, 2)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {audits.length === 0 && (
                  <tr><td className="p-4 text-center text-muted-foreground" colSpan={4}>No audit entries</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


