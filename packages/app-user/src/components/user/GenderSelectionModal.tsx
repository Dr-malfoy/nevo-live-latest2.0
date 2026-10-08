import React, { useState } from 'react';
import { PiGenderMaleBold as MaleIcon, PiGenderFemaleBold as FemaleIcon, PiLockFill as LockIcon, PiXBold as X, PiCheckBold as CheckIcon } from 'react-icons/pi';
import { usersApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import type { Gender } from '../../types';

interface GenderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  reason?: string;
}

export const GenderSelectionModal: React.FC<GenderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Select Your Gender',
  reason = 'Gender selection is mandatory before joining or starting live streams and parties.',
}) => {
  const { user, updateUser } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [selectedGender, setSelectedGender] = useState<Gender>(
    user?.gender && user.gender !== 'unspecified' ? (user.gender as Gender) : 'male'
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedGender || selectedGender === 'unspecified') {
      showToast('Please select Male or Female', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data } = await usersApi.updateProfile({ gender: selectedGender });
      if (data.success && data.data) {
        updateUser(data.data);
        showToast('Gender set successfully! Locked for 60 days.', 'success');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        showToast(data.error || 'Failed to update gender', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update gender', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-black"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600 shadow-sm">
          <span className="text-2xl">🚻</span>
        </div>

        <h3 className="text-lg font-black text-ink">{title}</h3>
        <p className="text-xs text-ink-muted mt-1 px-2 leading-relaxed">{reason}</p>

        {/* 60-day warning banner */}
        <div className="my-4 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-semibold flex items-center gap-2 text-left">
          <LockIcon className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Notice: Once you choose your gender, it cannot be changed for 60 days.</span>
        </div>

        {/* Male & Female Choice Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setSelectedGender('male')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              selectedGender === 'male'
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-2 ring-blue-500/20'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <MaleIcon className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm">Male</span>
            {selectedGender === 'male' && <CheckIcon className="w-4 h-4 text-blue-600" />}
          </button>

          <button
            type="button"
            onClick={() => setSelectedGender('female')}
            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              selectedGender === 'female'
                ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md ring-2 ring-pink-500/20'
                : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
              <FemaleIcon className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-sm">Female</span>
            {selectedGender === 'female' && <CheckIcon className="w-4 h-4 text-pink-600" />}
          </button>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-extrabold text-sm shadow-lg shadow-primary-500/25 active:scale-98 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Confirm & Continue'}
        </button>
      </div>
    </div>
  );
};
