import { useState } from 'react';
import {
  Search,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Unlock,
  RotateCcw,
  User,
  Phone,
  Mail,
  Coins,
  Gem,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { adminApi } from '../api';
import { getMediaUrl } from '../lib/media';

export const AssetPasswords = () => {
  const [searchUid, setSearchUid] = useState('');
  const [searchContact, setSearchContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  // Reset password modal/inline state
  const [showResetBox, setShowResetBox] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Unlock state
  const [unlocking, setUnlocking] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUid = searchUid.trim();
    const cleanContact = searchContact.trim();

    if (!cleanUid && !cleanContact) {
      setError('Please provide Account UID and/or registered Phone Number / Email to search');
      return;
    }

    setLoading(true);
    setError('');
    setActionSuccess('');
    setShowResetBox(false);

    try {
      const res = await adminApi.lookupAssetPassword({ uid: cleanUid, contact: cleanContact });
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
      } else {
        setError(res.data.error || 'User not found');
        setUser(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'No user found matching the provided search details');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!user?.assetPassword || user.assetPassword === 'Not Set') return;
    navigator.clipboard.writeText(user.assetPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlock = async () => {
    if (!user?._id) return;
    setUnlocking(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await adminApi.unlockUserAssetPassword({ userId: user._id });
      if (res.data.success) {
        setActionSuccess(res.data.message || 'Asset password unlocked successfully');
        setUser((prev: any) => ({ ...prev, isLocked: false, lockedUntil: null, failCount: 0 }));
      } else {
        setError(res.data.error || 'Failed to unlock');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unlock account');
    } finally {
      setUnlocking(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPassword)) {
      setError('New asset password must be exactly 4 numeric digits');
      return;
    }
    setResetting(true);
    setError('');
    setActionSuccess('');
    try {
      const res = await adminApi.resetUserAssetPassword({ userId: user._id, newPassword });
      if (res.data.success) {
        setActionSuccess(res.data.message || 'Asset password reset successfully');
        setUser((prev: any) => ({
          ...prev,
          assetPassword: newPassword,
          isSet: true,
          isLocked: false,
          lockedUntil: null,
          failCount: 0,
        }));
        setShowResetBox(false);
        setNewPassword('');
      } else {
        setError(res.data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset asset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <KeyRound className="w-7 h-7 text-primary-500" />
          Asset Password Lookup & Recovery
        </h1>
        <p className="text-sm text-dark-400 mt-1">
          Search users by UID, registered Phone Number, or Email to view, unlock, or reset their withdrawal asset password.
        </p>
      </div>

      {/* ── Search Bar: UID + Phone or Email ── */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary-400" />
            UID + Phone or Email Verification Search
          </span>
          <span className="text-[11px] text-dark-400">
            Cross-verifies identity using Help Center ticket details
          </span>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Field 1: User UID */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary-400" />
              Account UID <span className="text-primary-500">*</span>
            </label>
            <input
              type="text"
              value={searchUid}
              onChange={(e) => setSearchUid(e.target.value)}
              placeholder="Enter User UID (e.g. 100234)"
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 text-sm font-mono"
            />
          </div>

          {/* Field 2: Registered Phone or Email */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary-400" />
              Registered Phone or Email <span className="text-primary-500">*</span>
            </label>
            <input
              type="text"
              value={searchContact}
              onChange={(e) => setSearchContact(e.target.value)}
              placeholder="e.g. 017XXXXXXXX or user@example.com"
              className="w-full px-3.5 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 text-sm"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading || (!searchUid.trim() && !searchContact.trim())}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search User</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-1 flex items-center gap-2 text-xs text-dark-400">
          <HelpCircle className="w-3.5 h-3.5 text-primary-400 shrink-0" />
          <span>
            Enter the <strong>Account UID</strong> and <strong>Phone Number or Email</strong> submitted in the Help Center ticket. Both are cross-verified to protect user security.
          </span>
        </div>
      </div>

      {/* ── Feedback Messages ── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* ── Search Result User Card ── */}
      {user && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* User Top Profile Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dark-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 overflow-hidden flex items-center justify-center shrink-0">
                {user.avatar ? (
                  <img
                    src={getMediaUrl(user.avatar)}
                    alt={user.nickname}
                    className="w-full h-full object-cover"
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-8 h-8 text-dark-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-dark-100">{user.nickname || 'Unknown User'}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 uppercase">
                    {user.role}
                  </span>
                  {user.isAgent && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Agent
                    </span>
                  )}
                  {user.verifiedMatch && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      UID + Contact Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-dark-400 flex-wrap">
                  <span>UID: <strong className="text-dark-200">{user.uid}</strong></span>
                  <span>Joined: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Balances */}
            <div className="flex items-center gap-3">
              <div className="bg-dark-800/80 border border-dark-700/80 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
                <Gem className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-[10px] text-dark-400 uppercase font-medium">Diamonds</p>
                  <p className="text-sm font-bold text-dark-100 tabular-nums">
                    {(user.diamonds || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-dark-800/80 border border-dark-700/80 px-4 py-2.5 rounded-xl flex items-center gap-2.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-[10px] text-dark-400 uppercase font-medium">Coins</p>
                  <p className="text-sm font-bold text-dark-100 tabular-nums">
                    {(user.coins || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Contact Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-dark-800/50 border border-dark-700/60 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center text-dark-300">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-dark-400">Registered Phone Number</p>
                <p className="text-sm font-medium text-dark-100 truncate">
                  {user.phone || 'None'}
                </p>
              </div>
            </div>

            <div className="bg-dark-800/50 border border-dark-700/60 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-dark-700 flex items-center justify-center text-dark-300">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-dark-400">Registered Email Address</p>
                <p className="text-sm font-medium text-dark-100 truncate">
                  {user.email || 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* ── Asset Password Display Box ── */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-850 border border-dark-700 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary-400" />
                  <h3 className="text-base font-bold text-dark-100">Asset Password (Withdrawal PIN)</h3>
                  {user.isSet ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Set
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Not Set
                    </span>
                  )}
                  {user.isLocked && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  Required whenever the user initiates a coin or diamond withdrawal.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {user.isLocked && (
                  <button
                    onClick={handleUnlock}
                    disabled={unlocking}
                    className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    {unlocking ? 'Unlocking...' : 'Unlock Password'}
                  </button>
                )}
                <button
                  onClick={() => setShowResetBox(!showResetBox)}
                  className="px-3.5 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-dark-600"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {showResetBox ? 'Cancel Reset' : 'Reset / Change PIN'}
                </button>
              </div>
            </div>

            {/* Lockout alert */}
            {user.isLocked && (
              <div className="mt-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>
                  Account withdrawal is temporarily locked due to {user.failCount || 3} incorrect password attempts.
                  {user.lockedUntil ? ` Lock expires at ${new Date(user.lockedUntil).toLocaleTimeString()}.` : ''} Click &quot;Unlock Password&quot; above to lift the lockout immediately.
                </span>
              </div>
            )}

            {/* Plain PIN Display */}
            <div className="mt-5 p-4 bg-dark-900/90 border border-dark-700/80 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold">Current Password</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-mono font-black tracking-widest text-primary-400 select-all">
                    {showPassword ? user.assetPassword : '••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-dark-400 hover:text-dark-200 transition-colors p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleCopyPassword}
                disabled={!user.assetPassword || user.assetPassword === 'Not Set'}
                className="px-3.5 py-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-dark-700 disabled:opacity-40"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy PIN</span>
                  </>
                )}
              </button>
            </div>

            {/* Inline Reset Form */}
            {showResetBox && (
              <form onSubmit={handleResetPassword} className="mt-4 p-4 bg-dark-900 border border-primary-500/30 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-dark-200 uppercase tracking-wider">
                  Set New 4-Digit Asset Password
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-digit PIN (e.g. 1234)"
                    className="flex-1 px-3.5 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 font-mono tracking-widest text-center sm:text-left"
                  />
                  <button
                    type="submit"
                    disabled={resetting || newPassword.length !== 4}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {resetting ? 'Saving...' : 'Set New PIN'}
                  </button>
                </div>
                <p className="text-[11px] text-dark-400">
                  This will immediately overwrite the user&apos;s asset password and unlock their withdrawal access.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Help Desk Workflow Reference Card ── */}
      <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-dark-200 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary-400" />
          Help Center Protocol for Forgotten Asset Passwords
        </h3>
        <ol className="list-decimal list-inside text-xs text-dark-400 space-y-1.5 leading-relaxed">
          <li>Check the incoming support ticket in <strong className="text-dark-200">Contact Messages</strong> under the category <code className="text-primary-400 bg-dark-800 px-1 py-0.5 rounded">Asset Password Recovery</code>.</li>
          <li>Ensure the user supplied their <strong className="text-dark-200">Account UID</strong> and the <strong className="text-dark-200">Phone Number or Email</strong> used when they registered the account.</li>
          <li>Enter their UID or Phone/Email into the search bar above to verify ownership and match details.</li>
          <li>Copy their current 4-digit PIN to reply to their ticket, or reset it to a new 4-digit PIN if desired.</li>
        </ol>
      </div>
    </div>
  );
};
