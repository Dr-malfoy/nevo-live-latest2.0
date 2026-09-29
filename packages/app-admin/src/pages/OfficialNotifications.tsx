import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { adminApi } from '../api';

interface OfficialNotification {
  _id: string;
  title: string;
  message: string;
  icon?: string;
  active: boolean;
  createdAt: string;
}

/**
 * Official notifications (Mic icon broadcast) — create/edit/delete.
 * Publishing pushes instantly to every connected app via socket.
 */
export const OfficialNotifications = () => {
  const [items, setItems] = useState<OfficialNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', message: '', icon: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getOfficialNotifications({ limit: 50 });
      if (data.success) setItems(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ title: '', message: '', icon: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.message.trim()) return;
    try {
      if (editingId) {
        await adminApi.updateOfficialNotification(editingId, form);
      } else {
        await adminApi.createOfficialNotification(form);
      }
      resetForm();
      load();
    } catch {
      // ignore
    }
  };

  const startEdit = (n: OfficialNotification) => {
    setEditingId(n._id);
    setForm({ title: n.title, message: n.message, icon: n.icon || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this official notification?')) return;
    try {
      await adminApi.deleteOfficialNotification(id);
      load();
    } catch {
      // ignore
    }
  };

  const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString() : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Official Notifications</h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg text-sm"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Notification'}
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-800 rounded-xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Icon (emoji, e.g. 📢)"
              className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none"
            />
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              className="bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none md:col-span-2"
            />
          </div>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Message — shown to every user's Mic icon"
            rows={3}
            className="w-full bg-dark-700 rounded px-3 py-2 text-sm focus:outline-none resize-none"
          />
          <div className="flex justify-end gap-2">
            {editingId && (
              <button onClick={resetForm} className="px-3 py-2 bg-dark-700 rounded-lg text-sm">Cancel Edit</button>
            )}
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.message.trim()}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 rounded-lg text-sm disabled:opacity-40"
            >
              <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-dark-400 py-8">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-dark-400 py-8">No official notifications yet. Create one to broadcast to all users.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n._id} className="bg-dark-800 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl">{n.icon || '📢'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  {!n.active && (
                    <span className="text-[10px] bg-dark-700 px-1.5 py-0.5 rounded text-dark-400">disabled</span>
                  )}
                </div>
                <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-dark-500 mt-1">{fmt(n.createdAt)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startEdit(n)}
                  aria-label="Edit"
                  className="p-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(n._id)}
                  aria-label="Delete"
                  className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
