import { useEffect, useRef, useState } from 'react';
import { PiCameraFill as Camera, PiImageFill as ImageIcon, PiXBold as X } from 'react-icons/pi';
import { usersApi, uploadApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { allCountries, flagEmoji } from '../../lib/countries';
import { Avatar } from './Avatar';
import type { Gender } from '../../types';

interface EditProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

/** `2004-03-15` for the date input; '' when unset. */
const toDateInput = (value?: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

/**
 * Edit sheet for the fields the details page shows (requirement #4):
 * picture, cover, nickname, age (birthday), country, gender, bio and tags.
 */
export const EditProfileSheet = ({ isOpen, onClose }: EditProfileSheetProps) => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);

  const [nickname, setNickname] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState<Gender>('unspecified');
  const [birthday, setBirthday] = useState('');
  const [bio, setBio] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | 'avatar' | 'cover'>(null);

  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Re-seed from the live user each time the sheet opens.
  useEffect(() => {
    if (!isOpen || !user) return;
    setNickname(user.nickname || '');
    setCountry(user.country || '');
    setGender((user.gender as Gender) || 'unspecified');
    setBirthday(toDateInput(user.birthday));
    setBio(user.bio || '');
    setTags(user.tags || []);
    setTagInput('');
  }, [isOpen, user]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleUpload = async (file: File, kind: 'avatar' | 'cover') => {
    setUploading(kind);
    try {
      const url = await uploadApi.upload(file, 'avatars');
      const { data } = await usersApi.updateProfile(kind === 'cover' ? { cover: url } : { avatar: url });
      if (data.success && data.data) updateUser(data.data);
    } catch {
      showToast('Upload failed, please try again', 'error');
    } finally {
      setUploading(null);
    }
  };

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '');
    if (!value) return;
    if (tags.length >= 10) {
      showToast('Up to 10 tags', 'info');
      return;
    }
    if (!tags.includes(value)) setTags([...tags, value]);
    setTagInput('');
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      showToast('Nickname cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data } = await usersApi.updateProfile({
        nickname: nickname.trim(),
        country,
        gender,
        // '' clears the birthday server-side.
        birthday,
        bio: bio.trim(),
        tags,
      });
      if (data.success && data.data) {
        updateUser(data.data);
        showToast('Profile updated', 'success');
        onClose();
      } else {
        showToast(data.error || 'Could not save', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Could not save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-sheet max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-4 h-14 border-b border-line shrink-0">
          <button onClick={onClose} className="text-ink-muted p-1 -ml-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-base font-bold text-ink">Edit Profile</h3>
          <span className="w-5" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Profile picture */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar src={user.avatar} nickname={user.nickname} size="lg" />
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={!!uploading}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center ring-2 ring-white disabled:opacity-60"
              >
                {uploading === 'avatar' ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Profile picture</p>
              <p className="text-xs text-ink-muted">
                {uploading === 'avatar' ? 'Uploading…' : 'Tap the camera to change'}
              </p>
            </div>
          </div>

          {/* Cover */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => coverRef.current?.click()}
              disabled={!!uploading}
              aria-label="Change cover photo"
              className="w-14 h-10 rounded-lg bg-surface-sunken flex items-center justify-center overflow-hidden shrink-0 disabled:opacity-60"
            >
              {user.cover ? (
                <img src={user.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-4 h-4 text-ink-faint" />
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Cover photo</p>
              <p className="text-xs text-ink-muted">
                {uploading === 'cover' ? 'Uploading…' : 'Tap to change'}
              </p>
            </div>
          </div>

          <Field label="Nickname">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
              placeholder="Your display name"
              className={inputClass}
            />
          </Field>

          <Field label="Country">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg leading-none pointer-events-none">
                {flagEmoji(country)}
              </span>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={`${inputClass} pl-10 appearance-none`}
              >
                <option value="">Not set</option>
                {allCountries().map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Date of birth" hint="Your age is shown on your profile — your birth date is not.">
            <input
              type="date"
              value={birthday}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthday(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Gender">
            <div className="flex flex-wrap gap-2">
              {GENDERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setGender(value)}
                  className={`h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
                    gender === value ? 'bg-black text-white' : 'bg-surface-sunken text-ink-soft'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Bio" hint={`${bio.length}/200`}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={3}
              placeholder="Tell people about yourself"
              className={`${inputClass} resize-none py-3`}
            />
          </Field>

          <Field label="Tags" hint="Up to 10 — e.g. Friendly, Singer">
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                maxLength={20}
                placeholder="Add a tag"
                className={inputClass}
              />
              <button onClick={addTag} className="h-11 px-4 btn-secondary text-sm shrink-0">
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-accent-50 text-accent-600 text-sm font-medium"
                  >
                    #{tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>

        <div className="px-4 py-3 border-t border-line safe-bottom shrink-0">
          <button onClick={handleSave} disabled={saving} className="w-full h-12 btn-primary disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <input
        ref={avatarRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f, 'avatar');
          e.target.value = '';
        }}
      />
      <input
        ref={coverRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f, 'cover');
          e.target.value = '';
        }}
      />
    </div>
  );
};

const inputClass =
  'w-full h-11 px-3 rounded-xl bg-surface-sunken text-ink placeholder:text-ink-faint border border-transparent focus:bg-white focus:border-accent-500 focus:outline-none transition-colors';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-sm font-semibold text-ink">{label}</label>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
