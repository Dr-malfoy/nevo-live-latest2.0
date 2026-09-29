import { useEffect, useState } from 'react';
import { UserPlus, Users, Copy, Check } from 'lucide-react';
import { adminApi } from '../api';

export const Agents = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', password: '', nickname: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getAgents();
      if (data.success) {
        setAgents(data.data?.agents || []);
        setAgencies(data.data?.agencies || []);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.phone || !form.password || !form.nickname) {
      setError('Phone, password, and nickname are required');
      return;
    }
    setSaving(true); setError('');
    try {
      await adminApi.createAgent(form);
      setShowForm(false);
      setForm({ phone: '', password: '', nickname: '', name: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create agent');
    } finally { setSaving(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Agents</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg text-sm">
          <UserPlus className="w-4 h-4" /> Create Agent
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-800 rounded-xl p-6 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><UserPlus className="w-4 h-4" /> New Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Phone *</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Agent phone number" className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Password *</label>
              <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" placeholder="Login password" className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Nickname *</label>
              <input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder="Display name" className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Agency Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alpha Agency (auto-generates join code)" className="w-full bg-dark-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          {error && <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">{error}</div>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary-600 rounded-lg text-sm disabled:opacity-50">{saving ? 'Creating...' : 'Create Agent'}</button>
            <button onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 bg-dark-700 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-dark-400">Loading...</p> : (
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-dark-700"><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">UID</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Nickname</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Phone</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Level</th><th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Created</th></tr></thead>
            <tbody>
              {agents.map((a: any) => (
                <tr key={a._id} className="border-b border-dark-700/50"><td className="px-4 py-3 text-sm">{a.uid}</td><td className="px-4 py-3 text-sm">{a.nickname}</td><td className="px-4 py-3 text-sm text-dark-400">{a.phone}</td><td className="px-4 py-3 text-sm">{a.level}</td><td className="px-4 py-3 text-sm text-dark-400">{new Date(a.createdAt).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Agencies with join codes */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" /> Agencies
        </h3>
        {loading ? null : agencies.length === 0 ? (
          <p className="text-dark-400 text-sm">No agencies yet</p>
        ) : (
          <div className="bg-dark-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Agent</th>
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Join Code</th>
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Members</th>
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Commission</th>
                  <th className="text-left px-4 py-3 text-xs text-dark-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a: any) => (
                  <tr key={a._id} className="border-b border-dark-700/50">
                    <td className="px-4 py-3 text-sm">{a.name}</td>
                    <td className="px-4 py-3 text-sm">{a.agentId?.nickname || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tracking-widest text-primary-400">{a.code}</span>
                        <button onClick={() => copyCode(a.code)} className="text-dark-400 hover:text-white transition-colors" title="Copy code">
                          {copied === a.code ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{a.hosts?.length || 0}</td>
                    <td className="px-4 py-3 text-sm">{a.commission}%</td>
                    <td className="px-4 py-3 text-sm">
                      {a.isBanned ? <span className="text-xs px-2 py-0.5 rounded bg-red-600 text-white">Banned</span> : <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
