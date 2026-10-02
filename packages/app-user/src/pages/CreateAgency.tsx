import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold,
  PiBuildingsFill,
  PiLockKeyFill,
  PiGlobeFill,
  PiSparkleFill,
  PiCrownFill,
  PiCheckCircleFill,
  PiCameraFill,
  PiImageSquareFill,
  PiUploadSimpleFill,
} from 'react-icons/pi';
import { agencyApi, uploadApi } from '../api';
import { useAuthStore, useUIStore } from '../stores';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
];

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80',
];

export const CreateAgency = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || PRESET_AVATARS[0]);
  const [cover, setCover] = useState(PRESET_COVERS[0]);
  const [type, setType] = useState<'public' | 'private'>('public');
  const [commission, setCommission] = useState(10);
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadApi.upload(file, 'agency');
      setAvatar(url);
      showToast('Logo uploaded successfully', 'success');
    } catch {
      showToast('Failed to upload image', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Cover image size should be less than 8MB', 'error');
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadApi.upload(file, 'agency');
      setCover(url);
      showToast('Cover image uploaded successfully', 'success');
    } catch {
      showToast('Failed to upload cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      showToast('Please enter an agency name (at least 2 characters)', 'error');
      return;
    }

    if (customCode.trim() && (customCode.trim().length < 4 || customCode.trim().length > 12)) {
      showToast('Custom agency code must be between 4 and 12 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await agencyApi.createAgency({
        name: name.trim(),
        description: description.trim() || undefined,
        avatar: avatar || undefined,
        cover: cover || undefined,
        type,
        commission: Number(commission) || 10,
        customCode: customCode.trim() ? customCode.trim().toUpperCase() : undefined,
      });

      if (res.data?.success && res.data.data) {
        showToast('Agency created successfully! You are now an Agent.', 'success');
        updateUser({
          role: 'agent',
          isAgent: true,
          agencyId: res.data.data._id as any,
        });
        navigate(`/agency/${res.data.data._id}`);
      } else {
        showToast(res.data?.error || 'Failed to create agency', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create agency';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyAgent = user?.role === 'agent' || user?.isAgent;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* ── Top Header ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 active:scale-90 transition-transform"
          >
            <PiCaretLeftBold className="w-6 h-6" />
          </button>
          <h1 className="text-base font-extrabold text-slate-900">Create Agency</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="px-4 pt-4 max-w-md mx-auto">
        {isAlreadyAgent && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-900">You already own an Agency / are an Agent</p>
              <p className="text-[11px] text-amber-700">Manage your hosts, earnings, and settings in your Agent Center.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/agent')}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs hover:bg-amber-600 transition-colors"
            >
              Agent Center
            </button>
          </div>
        )}

        {/* Banner with dynamic Cover preview */}
        <div className="rounded-2xl p-5 text-white shadow-md relative overflow-hidden mb-5 bg-slate-900 min-h-[140px] flex flex-col justify-end">
          {cover && (
            <img src={cover} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-white/50 shrink-0 bg-slate-800 shadow-md">
              {avatar ? (
                <img src={avatar} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <PiBuildingsFill className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-amber-300 text-[10px] font-bold mb-1">
                <PiCrownFill className="w-3 h-3" />
                <span>Agency Owner / Agent</span>
              </span>
              <h2 className="text-base font-black tracking-tight truncate">{name || 'Your Agency Name'}</h2>
              <p className="text-[11px] text-indigo-200">
                {type === 'public' ? 'Public Agency' : 'Private Agency'} • {commission}% Commission
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agency Logo / Profile Picture */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Agency Profile / Logo <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <PiUploadSimpleFill className="w-3.5 h-3.5" />
                <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-indigo-500/20 shrink-0 bg-slate-100">
                {avatar ? (
                  <img src={avatar} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <PiCameraFill className="w-6 h-6" />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="Paste Image URL or pick preset"
                  className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
                />

                <div className="flex items-center gap-1.5 mt-2">
                  {PRESET_AVATARS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition-all ${
                        avatar === url ? 'border-indigo-600 scale-105 ring-1 ring-indigo-400' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Agency Cover Banner */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Agency Cover Banner
              </label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <PiImageSquareFill className="w-3.5 h-3.5" />
                <span>{uploadingCover ? 'Uploading...' : 'Upload Cover'}</span>
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFile}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <div className="relative h-20 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                {cover ? (
                  <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    No cover banner selected
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <input
                type="text"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="Paste Cover Image URL or pick preset"
                className="w-full h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
              />

              <div className="flex items-center gap-1.5 pt-1">
                {PRESET_COVERS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCover(url)}
                    className={`h-8 flex-1 rounded-lg overflow-hidden border-2 transition-all ${
                      cover === url ? 'border-indigo-600 scale-105 ring-1 ring-indigo-400' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Agency Name */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Agency Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Star Empire Agency, Golden Live"
              maxLength={50}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* Agency Type: Public vs Private */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 mb-2.5">
              Agency Type <span className="text-red-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Public Agency */}
              <button
                type="button"
                onClick={() => setType('public')}
                className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                  type === 'public'
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <PiGlobeFill className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-xs text-slate-900">Public</span>
                  </div>
                  {type === 'public' && (
                    <PiCheckCircleFill className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Anyone can join instantly without owner approval.
                </p>
              </button>

              {/* Private Agency */}
              <button
                type="button"
                onClick={() => setType('private')}
                className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                  type === 'private'
                    ? 'border-purple-500 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <PiLockKeyFill className="w-4 h-4 text-purple-600" />
                    <span className="font-extrabold text-xs text-slate-900">Private</span>
                  </div>
                  {type === 'private' && (
                    <PiCheckCircleFill className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Members must send a request; you approve or reject.
                </p>
              </button>
            </div>
          </div>

          {/* Agency Code (Optional Custom Code) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Custom Agency Code (Optional)
              </label>
              <span className="text-[11px] text-slate-400">Leave blank for auto-code</span>
            </div>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="e.g. VIPSTAR (4-12 characters)"
              maxLength={12}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-indigo-700 uppercase focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          {/* Agency Description */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Agency Information & Rules
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell streamers why they should join your agency, benefits, livestream expectations..."
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all resize-none font-medium"
            />
          </div>

          {/* Commission rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Commission Rate
              </label>
              <span className="text-xs font-extrabold text-indigo-600">{commission}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
              <span>0% (Minimum)</span>
              <span>10% (Recommended)</span>
              <span>50% (Max)</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Agency...</span>
                </>
              ) : (
                <>
                  <PiSparkleFill className="w-4 h-4 text-amber-300" />
                  <span>Create Agency & Become Agent</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
