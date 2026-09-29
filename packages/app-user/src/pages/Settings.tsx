import { useEffect, useState } from 'react';
import { PiCaretLeftBold as ArrowLeft, PiFloppyDiskFill as Save, PiBuildingsFill as Building2, PiLinkBold as Link2, PiLinkBreakBold as Unlink, PiMagnifyingGlassBold as Search, PiUserPlusFill as UserPlus, PiTrashFill as Trash2, PiShieldCheckFill as ShieldCheck, PiFileTextFill as FileText, PiBookOpenFill as BookOpen, PiInfoFill as Info, PiWarningFill as AlertTriangle, PiKeyFill as KeyRound, PiSparkleFill as Sparkles, PiUsersFill as Users } from 'react-icons/pi';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores';
import { usersApi, agencyApi } from '../api';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);

  // Change password flow
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'reauth' | 'deleting'>('confirm');
  const [reauthPassword, setReauthPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [typedPhrase, setTypedPhrase] = useState('');

  // Agency
  const [myAgency, setMyAgency] = useState<any>(null);
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [code, setCode] = useState('');
  const [agencyMsg, setAgencyMsg] = useState('');
  const [agencyErr, setAgencyErr] = useState('');

  // Link Agent
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');
  const [linkErr, setLinkErr] = useState('');

  // Suggested agencies (shown when not linked)
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestErr, setSuggestErr] = useState('');
  const [joiningSuggestion, setJoiningSuggestion] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await usersApi.updateProfile({ nickname });
      if (data.success && data.data) {
        updateUser(data.data);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ─────────────────────────────────────────────
  const openPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordMsg('');
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMsg('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Enter your current and new password');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setPasswordMsg('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 1200);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const loadMyAgency = async () => {
    setAgencyLoading(true);
    try {
      const { data } = await agencyApi.getMyAgency();
      if (data.success) setMyAgency(data.data || null);
    } catch {} finally { setAgencyLoading(false); }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestErr('');
    try {
      const { data } = await agencyApi.suggestAgents(5);
      setSuggestions(data.data || []);
    } catch (err: any) {
      setSuggestErr(err.response?.data?.error || 'Failed to load suggestions');
    } finally { setSuggestionsLoading(false); }
  };

  const handleJoinSuggestion = async (suggestion: any) => {
    setJoiningSuggestion(suggestion._id);
    setAgencyMsg(''); setAgencyErr(''); setSuggestErr('');
    try {
      const { data } = await agencyApi.join(suggestion.code);
      if (data.success) {
        setAgencyMsg(`Joined ${data.data?.agency?.name || suggestion.name}`);
        setCode('');
        updateUser({ agencyId: data.data?.agency?._id, role: 'host' } as any);
        setMyAgency(data.data?.agency ? { ...data.data.agency, code: suggestion.code, name: suggestion.name, hosts: [1] } : null);
        setSuggestions([]);
        loadMyAgency();
      }
    } catch (err: any) {
      setSuggestErr(err.response?.data?.error || 'Failed to join agency');
    } finally {
      setJoiningSuggestion(null);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) { setAgencyErr('Enter an agency code'); return; }
    setAgencyMsg(''); setAgencyErr('');
    try {
      const { data } = await agencyApi.join(code.trim().toUpperCase());
      if (data.success) {
        setAgencyMsg(`Joined ${data.data?.agency?.name || 'agency'}`);
        setCode('');
        updateUser({ agencyId: data.data?.agency?._id, role: 'host' } as any);
        loadMyAgency();
      }
    } catch (err: any) {
      setAgencyErr(err.response?.data?.error || 'Failed to join agency');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this agency?')) return;
    setAgencyMsg(''); setAgencyErr('');
    try {
      const { data } = await agencyApi.leave();
      if (data.success) {
        setMyAgency(null);
        updateUser({ agencyId: undefined, role: 'user' } as any);
        setAgencyMsg('You left the agency');
      }
    } catch (err: any) {
      setAgencyErr(err.response?.data?.error || 'Failed to leave agency');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true); setLinkMsg(''); setLinkErr('');
    try {
      const { data } = await agencyApi.searchAgents(searchQuery.trim());
      setSearchResults(data.data || []);
    } catch (err: any) {
      setLinkErr(err.response?.data?.error || 'Search failed');
    } finally { setSearching(false); }
  };

  const handleLink = async (agentId: string) => {
    setLinkMsg(''); setLinkErr('');
    try {
      const { data } = await agencyApi.linkByAgent(agentId);
      if (data.success) {
        if (data.data?.alreadyLinked) {
          setLinkMsg(`You are already linked to ${data.data?.agent?.nickname || 'this agent'}`);
        } else {
          setLinkMsg(`Linked to ${data.data?.agent?.nickname || 'agent'}`);
        }
        updateUser({ agencyId: data.data?.agency?._id, role: 'host' } as any);
        setSearchResults([]);
        setSearchQuery('');
        loadMyAgency();
      }
    } catch (err: any) {
      setLinkErr(err.response?.data?.error || 'Failed to link agent');
    }
  };

  // ── Delete account ──────────────────────────────────────────────
  const startDelete = () => {
    setDeleteStep('confirm');
    setDeleteError('');
    setReauthPassword('');
    setTypedPhrase('');
    setShowDeleteConfirm(true);
  };

  const proceedToReauth = () => {
    setDeleteStep('reauth');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    setDeleteStep('deleting');
    setDeleteError('');
    try {
      await usersApi.deleteAccount({ password: reauthPassword });
      logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || 'Deletion failed. Please try again.');
      setDeleteStep('reauth');
    }
  };

  // Lazy-load current agency once + suggested agencies when not linked
  useEffect(() => {
    if (user?.agencyId) {
      loadMyAgency();
    } else {
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>

      <div className="p-4 space-y-4">
        <Input
          label="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <Input
          label="Phone"
          value={user?.phone || ''}
          disabled
        />

        <Button fullWidth onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>

        {/* ─── Agency Section ─── */}
        <div className="bg-surface-sunken rounded-xl p-4 mt-6">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-accent-500" /> Agency
          </h3>

          {myAgency ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{myAgency.name}</p>
                  <p className="text-xs text-ink-muted">Code: {myAgency.code}</p>
                  <p className="text-xs text-ink-muted">Members: {myAgency.hosts?.length || 1}</p>
                </div>
                <Button variant="danger" onClick={handleLeave}>
                  <Unlink className="w-4 h-4" /> Leave
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">
                {agencyLoading ? 'Loading...' : 'Join an agency with your agency code, or link an agent below.'}
              </p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter agency code"
                  className="flex-1 bg-dark-700 rounded-lg px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-accent-500"
                />
                <button
                  onClick={handleJoin}
                  className="px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium flex items-center gap-1.5"
                >
                  <Link2 className="w-4 h-4" /> Join
                </button>
              </div>
            </div>
          )}

          {agencyMsg && <p className="text-xs text-green-400 mt-2">{agencyMsg}</p>}
          {agencyErr && <p className="text-xs text-red-400 mt-2">{agencyErr}</p>}
        </div>

        {/* ─── Suggested Agencies (when not linked) ─── */}
        {!myAgency && (
          <div className="bg-surface-sunken rounded-xl p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-accent-500" /> Suggested Agencies
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              You're not connected to an agency yet. Join one below — withdrawals and recharge routing become available after linking.
            </p>

            {suggestionsLoading ? (
              <p className="text-xs text-ink-muted py-2">Loading suggestions…</p>
            ) : suggestions.length === 0 ? (
              <p className="text-xs text-ink-muted py-2">
                No agencies available yet. Use the agency code above or search for an agent to link.
              </p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <div key={s._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-ink-muted flex items-center gap-2 mt-0.5">
                        <span className="font-mono uppercase tracking-wider text-accent-500">{s.code}</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {s.memberCount || 0}
                        </span>
                        {typeof s.commission === 'number' && (
                          <span>{s.commission}% commission</span>
                        )}
                      </p>
                      {s.agent && (
                        <p className="text-[11px] text-ink-muted mt-0.5">
                          Agent: {s.agent.nickname} · UID {s.agent.uid}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleJoinSuggestion(s)}
                      disabled={joiningSuggestion === s._id}
                      className="shrink-0 ml-3 text-xs px-3 py-1.5 bg-black text-white rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Link2 className="w-3 h-3" />
                      {joiningSuggestion === s._id ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {suggestErr && <p className="text-xs text-red-400 mt-2">{suggestErr}</p>}
          </div>
        )}

        {/* ─── Link Agent Section ─── */}
        {!myAgency && (
          <div className="bg-surface-sunken rounded-xl p-4">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <UserPlus className="w-4 h-4 text-yellow-400" /> Link Agent
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              Search by Agent ID (UID) or phone to link directly. Withdrawals become available after linking.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Agent UID or phone"
                className="flex-1 bg-dark-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <button onClick={handleSearch} disabled={searching} className="px-4 py-2.5 bg-yellow-600 rounded-lg text-sm font-medium flex items-center gap-1.5">
                <Search className="w-4 h-4" /> {searching ? '...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((a: any) => (
                  <div key={a._id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{a.nickname}</p>
                      <p className="text-xs text-ink-muted">UID: {a.uid}</p>
                    </div>
                    <button onClick={() => handleLink(a._id)} className="text-xs px-3 py-1.5 bg-yellow-600 rounded-lg font-medium">
                      Link
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-xs text-ink-muted mt-2">
                No agent found for "{searchQuery}". Check the Agent ID (UID) and try again.
              </p>
            )}

            {linkMsg && <p className="text-xs text-green-400 mt-2">{linkMsg}</p>}
            {linkErr && <p className="text-xs text-red-400 mt-2">{linkErr}</p>}
          </div>
        )}

        {/* ─── Legal & Policies ─── */}
        <div className="bg-surface-sunken rounded-xl p-4 mt-6">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-brand-primary" /> Legal &amp; Policies
          </h3>
          <div className="space-y-1">
            <button onClick={() => navigate('/privacy')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors text-sm">
              <ShieldCheck className="w-4 h-4 text-sky-400" /> Privacy Policy
            </button>
            <button onClick={() => navigate('/guidelines')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors text-sm">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Community Guidelines
            </button>
            <button onClick={() => navigate('/terms')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors text-sm">
              <FileText className="w-4 h-4 text-amber-400" /> Terms &amp; Conditions
            </button>
            <button onClick={() => navigate('/about')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors text-sm">
              <Info className="w-4 h-4 text-brand-primary" /> About Us
            </button>
          </div>
        </div>

        {/* ─── Account ─── */}
        <div className="bg-surface-sunken rounded-xl p-4 mt-6">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" /> Account
          </h3>
          <button
            onClick={openPasswordModal}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-700 transition-colors text-sm"
          >
            <KeyRound className="w-4 h-4 text-brand-primary" /> Change Password
          </button>
          <button
            onClick={startDelete}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 transition-colors text-sm text-red-400"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
          <p className="text-xs text-ink-faint mt-1 px-3">Permanently delete your account and all associated data.</p>
        </div>
      </div>

      {/* Change Password dialog */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface-sunken backdrop-blur-sm p-4">
          <div className="w-full max-w-sm card-glass p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-brand-primary" />
              <h3 className="font-bold text-lg">Change Password</h3>
            </div>

            <Input
              type="password"
              label="Current password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              label="New password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              label="Confirm new password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
            {passwordMsg && <p className="text-xs text-green-400">{passwordMsg}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={changingPassword}
                className="flex-1 py-2.5 rounded-xl bg-dark-700 text-sm font-medium disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-sm font-bold disabled:opacity-40"
              >
                {changingPassword ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-surface-sunken backdrop-blur-sm p-4">
          <div className="w-full max-w-sm card-glass p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            {deleteStep === 'confirm' && (
              <>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-lg">Delete Account?</h3>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">
                  This action is <span className="text-red-400 font-bold">permanent and cannot be undone</span>. Your
                  profile, live streams, chats, messages, moments, notifications, and all associated data will be
                  permanently deleted. Virtual currency balances are non-refundable.
                </p>
                <p className="text-xs text-ink-muted">
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm:
                </p>
                <input
                  value={typedPhrase}
                  onChange={(e) => setTypedPhrase(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-surface-sunken rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 text-sm font-medium">
                    Cancel
                  </button>
                  <button
                    onClick={proceedToReauth}
                    disabled={typedPhrase !== 'DELETE'}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deleteStep === 'reauth' && (
              <>
                <h3 className="font-bold text-lg">Re-authenticate</h3>
                <p className="text-sm text-ink-muted">Enter your password to confirm account deletion.</p>
                <Input
                  type="password"
                  placeholder="Current password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                />
                {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl bg-dark-700 text-sm font-medium">
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={!reauthPassword}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-bold disabled:opacity-40"
                  >
                    Delete Permanently
                  </button>
                </div>
              </>
            )}

            {deleteStep === 'deleting' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-ink-muted">Deleting your account and all data…</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
