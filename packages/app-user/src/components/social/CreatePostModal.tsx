import React, { useRef, useState } from 'react';
import {
  PiXBold as X,
  PiImageFill as ImageIcon,
  PiVideoCameraFill as VideoIcon,
  PiPaperPlaneRightFill as Send,
  PiSpinnerBold as Loader2,
  PiTagFill as TagIcon,
  PiHashBold as Hash,
  PiPlusBold as Plus,
} from 'react-icons/pi';
import { uploadApi, momentsApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultMediaType?: 'image' | 'video';
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

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMediaType = 'image',
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [postType, setPostType] = useState<'image' | 'video'>(defaultMediaType);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (selected: File) => {
    const isVid = selected.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(selected.name);

    if (isVid) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      const objUrl = URL.createObjectURL(selected);
      videoElement.src = objUrl;

      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        if (duration > 90) {
          showToast(`Video too long (${Math.round(duration)}s). Maximum allowed is 1 min 30 sec (90s).`, 'error');
          setFile(null);
          setPreview('');
          setVideoDuration(null);
          URL.revokeObjectURL(objUrl);
          return;
        }
        setPostType('video');
        setFile(selected);
        setPreview(objUrl);
        setVideoDuration(Math.round(duration));
      };

      videoElement.onerror = () => {
        setPostType('video');
        setFile(selected);
        setPreview(objUrl);
        setVideoDuration(null);
      };
    } else {
      setPostType('image');
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setVideoDuration(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    validateAndSetFile(selected);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selected = e.dataTransfer.files?.[0];
    if (!selected) return;
    validateAndSetFile(selected);
  };

  const handleClearMedia = () => {
    setFile(null);
    setPreview('');
    setVideoDuration(null);
  };

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

  const handlePublish = async () => {
    if (!file && !caption.trim()) {
      showToast('Please add a caption or media to post', 'error');
      return;
    }

    setUploading(true);
    try {
      let mediaUrl = '';
      if (file) {
        mediaUrl = await uploadApi.upload(file, 'moments');
      }

      // Extract inline hashtags from caption as well
      const captionTags = (caption.match(/#(\w+)/g) || []).map((t) =>
        t.replace('#', '').toLowerCase()
      );
      const combinedTags = Array.from(new Set([...tags, ...captionTags]));

      const payload = {
        content: caption.trim() || undefined,
        media: mediaUrl ? [mediaUrl] : [],
        mediaType: postType,
        videoUrl: postType === 'video' && mediaUrl ? mediaUrl : undefined,
        thumbnail: postType === 'image' && mediaUrl ? mediaUrl : undefined,
        durationSec: videoDuration || undefined,
        hashtags: combinedTags,
      };

      const res = await momentsApi.create(payload);
      if (res?.data?.success) {
        showToast('Post published successfully!', 'success');
        onSuccess?.();
        onClose();
      } else {
        showToast(res?.data?.error || 'Failed to publish post', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Upload error. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

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
            <h3 className="text-base font-bold text-ink">Create New Post</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-600 text-[11px] font-bold border border-accent-100">
              {postType === 'video' ? 'Video / Reel' : 'Photo'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink hover:bg-line transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* User Preview */}
          <div className="flex items-center gap-3">
            <Avatar src={currentUser?.avatar} nickname={currentUser?.nickname} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-ink">{currentUser?.nickname}</span>
                <VerifiedBadge verification={currentUser?.verification} />
                <LevelBadge level={currentUser?.level || 1} size="sm" />
              </div>
              <p className="text-[11px] text-ink-muted">Public to all Nevo Live users</p>
            </div>
          </div>

          {/* Type Selector Tabs */}
          <div className="flex items-center p-1 bg-surface-sunken rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setPostType('image')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                postType === 'image'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" /> Photo Post
            </button>
            <button
              type="button"
              onClick={() => setPostType('video')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                postType === 'video'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <VideoIcon className="w-4 h-4 text-rose-500" /> Video / Reel
            </button>
          </div>

          {/* Caption Input */}
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening? Add your story, caption or vibes..."
              maxLength={500}
              rows={3}
              className="w-full bg-surface-sunken rounded-xl p-3.5 text-sm text-ink placeholder-ink-faint border border-line focus:outline-none focus:border-accent-500 focus:bg-white resize-none transition-all"
            />
            <div className="absolute right-3 bottom-2 text-[10px] text-ink-faint">
              {caption.length}/500
            </div>
          </div>

          {/* Media Preview or Dropzone */}
          {preview ? (
            <div className="relative rounded-2xl overflow-hidden border border-line bg-black group aspect-video flex items-center justify-center">
              {postType === 'video' || file?.type.startsWith('video/') ? (
                <>
                  <video
                    src={preview}
                    controls
                    className="w-full h-full object-contain aspect-video"
                  />
                  {videoDuration !== null && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                      <VideoIcon className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        {Math.floor(videoDuration / 60)}:
                        {String(videoDuration % 60).padStart(2, '0')} / 1:30 max
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={preview}
                  alt="preview"
                  className="w-full h-full object-contain aspect-video"
                />
              )}
              <button
                onClick={handleClearMedia}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-accent-500 bg-accent-50/50'
                  : 'border-line-strong bg-surface-sunken/50 hover:bg-surface-sunken hover:border-accent-400'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-line mx-auto flex items-center justify-center mb-2">
                {postType === 'video' ? (
                  <VideoIcon className="w-6 h-6 text-rose-500" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-emerald-500" />
                )}
              </div>
              <p className="text-xs font-bold text-ink">
                {postType === 'video'
                  ? 'Upload Video or Reel'
                  : 'Upload High-Quality Photo'}
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                {postType === 'video'
                  ? 'Max length: 1 min 30 sec (90s) • MP4, WebM, MOV'
                  : 'Drag & drop or click to browse (PNG, JPG)'}
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={postType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Hashtags Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1">
                <TagIcon className="w-3.5 h-3.5 text-accent-500" /> Tags
              </span>
              <span className="text-[11px] text-ink-faint">{tags.length}/6 selected</span>
            </div>

            {/* Selected / Custom Tags */}
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

              {/* Add Custom Tag Input */}
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

            {/* Suggested Popular Tags */}
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

        {/* Action Footer */}
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
            onClick={handlePublish}
            disabled={uploading || (!file && !caption.trim())}
            className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-40 transition-all shadow-md active:scale-98"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Publishing Post…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Share Post
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
