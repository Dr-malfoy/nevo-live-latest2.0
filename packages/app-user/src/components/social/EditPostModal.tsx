import React, { useState } from 'react';
import {
  PiXBold as X,
  PiFloppyDiskFill as Save,
  PiSpinnerBold as Loader2,
  PiTagFill as TagIcon,
  PiHashBold as Hash,
  PiPlusBold as Plus,
  PiPencilSimpleBold as EditIcon,
} from 'react-icons/pi';
import { momentsApi } from '../../api';
import { useUIStore } from '../../stores';
import type { Moment } from '../../types';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  moment: Moment;
  onSuccess?: () => void;
}

const POPULAR_TAGS = [
  'nevolive',
  'trending',
  'vibes',
  'lifestyle',
  'reels',
  'music',
  'dance',
  'party',
  'gaming',
  'friends',
];

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  moment,
  onSuccess,
}) => {
  const showToast = useUIStore((s) => s.showToast);

  const [caption, setCaption] = useState(moment.content || '');
  const [tags, setTags] = useState<string[]>(moment.hashtags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    const clean = tag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    if (tags.includes(clean)) {
      setTags(tags.filter((t) => t !== clean));
    } else {
      if (tags.length >= 6) {
        showToast('Maximum 6 tags allowed', 'info');
        return;
      }
      setTags([...tags, clean]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customTagInput.trim()) return;
    toggleTag(customTagInput);
    setCustomTagInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const captionTags = (caption.match(/#(\w+)/g) || []).map((t) =>
        t.replace('#', '').toLowerCase()
      );
      const combinedTags = Array.from(new Set([...tags, ...captionTags]));

      const res = await momentsApi.update(moment._id, {
        content: caption.trim() || undefined,
        hashtags: combinedTags,
      });

      if (res?.data?.success) {
        showToast('Post updated successfully!', 'success');
        onSuccess?.();
        onClose();
      } else {
        showToast(res?.data?.error || 'Failed to update post', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update post', 'error');
    } finally {
      setSaving(false);
    }
  };

  const mediaSrc = moment.videoUrl || (moment.media && moment.media[0]);
  const isVideo =
    moment.mediaType === 'video' ||
    Boolean(moment.videoUrl) ||
    Boolean(mediaSrc?.match(/\.(mp4|webm|mov|mkv)$/i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-line flex flex-col max-h-[90vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-soft">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-100 text-accent-600 flex items-center justify-center">
              <EditIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-ink">Edit Post</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink hover:bg-line transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Media Preview Thumbnail */}
          {mediaSrc && (
            <div className="relative rounded-xl overflow-hidden border border-line bg-black aspect-video max-h-48 flex items-center justify-center">
              {isVideo ? (
                <video
                  src={mediaSrc}
                  className="w-full h-full object-contain"
                  controls
                />
              ) : (
                <img
                  src={mediaSrc}
                  alt="post media"
                  className="w-full h-full object-contain"
                />
              )}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                {isVideo ? 'Video' : 'Photo'}
              </div>
            </div>
          )}

          {/* Caption Edit */}
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Caption & Description
            </label>
            <div className="relative">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What's happening? Edit your story or caption..."
                maxLength={500}
                rows={3}
                className="w-full bg-surface-sunken rounded-xl p-3.5 text-sm text-ink placeholder-ink-faint border border-line focus:outline-none focus:border-accent-500 focus:bg-white resize-none transition-all"
              />
              <div className="absolute right-3 bottom-2 text-[10px] text-ink-faint">
                {caption.length}/500
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5 text-accent-500" /> Tags
              </span>
              <span className="text-[11px] text-ink-faint">{tags.length}/6 selected</span>
            </div>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map((t) => (
                <span
                  key={t}
                  onClick={() => toggleTag(t)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-500 text-white text-[11px] font-bold cursor-pointer hover:bg-accent-600 transition-colors shadow-sm"
                >
                  #{t} <X className="w-3 h-3" />
                </span>
              ))}

              {/* Add Custom Tag */}
              <div className="inline-flex items-center gap-1 bg-surface-sunken rounded-full px-2.5 py-1 border border-line">
                <Hash className="w-3 h-3 text-ink-muted" />
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag(e)}
                  placeholder="custom tag..."
                  className="bg-transparent text-[11px] text-ink focus:outline-none w-20"
                />
                {customTagInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="text-accent-500 hover:text-accent-600"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Popular Suggestions */}
            <div className="flex flex-wrap gap-1 pt-1">
              {POPULAR_TAGS.map((pt) => {
                const isSelected = tags.includes(pt);
                return (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => toggleTag(pt)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-accent-100 text-accent-700 border border-accent-300'
                        : 'bg-surface-sunken text-ink-muted hover:bg-line hover:text-ink'
                    }`}
                  >
                    #{pt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-white border-t border-line flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-line text-xs font-bold text-ink hover:bg-surface-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-40 transition-all shadow-md active:scale-98"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
