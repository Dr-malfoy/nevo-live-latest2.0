import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiImageFill as ImageIcon,
  PiVideoCameraFill as VideoIcon,
  PiXBold as X,
  PiPaperPlaneRightFill as Send,
  PiSpinnerBold as Loader2,
  PiTagFill as TagIcon,
  PiHashBold as Hash,
  PiPlusBold as Plus,
} from 'react-icons/pi';
import { uploadApi, momentsApi } from '../api';
import { useUIStore, useAuthStore } from '../stores';
import { Avatar, LevelBadge, VerifiedBadge } from '../components/user';
import { VerificationGateModal } from '../components/ui';
import { canUseLiveFeatures } from '../services/verification';

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

export const MomentsNew = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.user);

  const [postType, setPostType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isVideo =
    postType === 'video' ||
    file?.type.startsWith('video/') ||
    /\.(mp4|webm|mov)$/i.test(file?.name || '');

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVid = f.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name);
    setPostType(isVid ? 'video' : 'image');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const clearFile = () => {
    setFile(null);
    setPreview('');
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

  const handlePost = async () => {
    if (!canUseLiveFeatures(currentUser?.verification, currentUser?.role)) {
      setShowGate(true);
      return;
    }

    if (!file && !caption.trim()) {
      showToast('Add a caption or choose a photo/video', 'error');
      return;
    }
    setUploading(true);
    setPosting(true);
    try {
      let media: string[] = [];
      if (file) {
        const url = await uploadApi.upload(file, 'moments');
        media = [url];
      }

      // Extract inline hashtags from caption as well
      const captionTags = (caption.match(/#(\w+)/g) || []).map((t) =>
        t.replace('#', '').toLowerCase()
      );
      const combinedTags = Array.from(new Set([...tags, ...captionTags]));

      const { data } = await momentsApi.create({
        content: caption.trim() || undefined,
        media,
        mediaType: isVideo ? 'video' : 'image',
        videoUrl: isVideo && media[0] ? media[0] : undefined,
        thumbnail: !isVideo && media[0] ? media[0] : undefined,
        hashtags: combinedTags,
      });

      if (data.success) {
        showToast('Moment shared!', 'success');
        navigate('/social', { replace: true });
      } else {
        showToast(data.error || 'Could not share your moment', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Upload failed. Please retry.', 'error');
    } finally {
      setUploading(false);
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-line bg-white/80 backdrop-blur-lg sticky top-0 z-10">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-1">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">New Post</h1>
      </div>

      <div className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {/* User Card */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-line shadow-sm">
          <Avatar src={currentUser?.avatar} nickname={currentUser?.nickname} size="md" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-ink">{currentUser?.nickname}</span>
              <VerifiedBadge verification={currentUser?.verification} />
              <LevelBadge level={currentUser?.level || 1} size="sm" />
            </div>
            <p className="text-[11px] text-ink-muted">Public to feed & reels</p>
          </div>
        </div>

        {/* Type selector */}
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

        {/* Caption */}
        <div className="relative">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="What's on your mind? Share your story..."
            className="w-full bg-white rounded-2xl p-4 text-sm border border-line resize-none focus:outline-none focus:ring-1 focus:ring-accent-500 shadow-sm"
          />
          <div className="absolute right-3 bottom-2 text-[10px] text-ink-faint">
            {caption.length}/500
          </div>
        </div>

        {/* Preview / picker */}
        {preview ? (
          <div className="relative rounded-2xl overflow-hidden border border-line bg-black aspect-video flex items-center justify-center shadow-md">
            {isVideo ? (
              <video src={preview} controls className="w-full h-full object-contain aspect-video" />
            ) : (
              <img src={preview} alt="preview" className="w-full h-full object-contain aspect-video" />
            )}
            <button
              onClick={clearFile}
              aria-label="Remove media"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur text-white flex items-center justify-center hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-dashed border-line-strong p-6 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-surface-sunken mx-auto flex items-center justify-center text-accent-500">
              {postType === 'video' ? <VideoIcon className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs font-bold text-ink">
                {postType === 'video' ? 'Share a video or reel' : 'Share a photo with followers'}
              </p>
              <p className="text-[11px] text-ink-muted">MP4, WebM, PNG, JPG supported</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold mx-auto shadow-md active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> Choose File
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={postType === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          hidden
          onChange={pickFile}
        />

        {/* Tags */}
        <div className="bg-white p-4 rounded-2xl border border-line shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1">
              <TagIcon className="w-3.5 h-3.5 text-accent-500" /> Tags
            </span>
            <span className="text-[10px] text-ink-faint">{tags.length}/6 tags</span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {tags.map((t) => (
              <span
                key={t}
                onClick={() => toggleTag(t)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-500 text-white text-[11px] font-bold cursor-pointer hover:bg-accent-600 shadow-sm"
              >
                #{t} <X className="w-3 h-3" />
              </span>
            ))}
            <div className="inline-flex items-center gap-1 bg-surface-sunken rounded-full px-2.5 py-0.5 border border-line">
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
                <button type="button" onClick={handleAddCustomTag} className="text-accent-500">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {POPULAR_TAGS.map((pt) => (
              <button
                key={pt}
                type="button"
                onClick={() => toggleTag(pt)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  tags.includes(pt)
                    ? 'bg-accent-100 text-accent-700 border border-accent-300'
                    : 'bg-surface-sunken text-ink-muted hover:bg-line hover:text-ink'
                }`}
              >
                #{pt}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handlePost}
          disabled={posting}
          className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-98 transition-all"
        >
          {posting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> {uploading ? 'Uploading…' : 'Sharing…'}
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> Share Post
            </>
          )}
        </button>
      </div>

      <VerificationGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        type="face"
        title="Live Face Verification Required"
        message="Live Face Verification is required to post Moments and share updates with the community. Complete live face verification to post now."
      />
    </div>
  );
};