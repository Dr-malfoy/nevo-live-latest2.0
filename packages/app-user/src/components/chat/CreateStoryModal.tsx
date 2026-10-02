import { useState, useRef } from 'react';
import {
  PiXBold as X,
  PiImageSquareFill as ImageIcon,
  PiTextTBold as TextIcon,
  PiCameraFill as CameraIcon,
  PiSparkleFill as Sparkle,
  PiClockFill as Clock,
  PiTrashFill as Trash,
} from 'react-icons/pi';
import { uploadApi, storyApi } from '../../api';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

const BG_GRADIENTS = [
  { name: 'Sunset Rose', value: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FDA4AF 100%)', color: '#F43F5E' },
  { name: 'Vibrant Purple', value: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)', color: '#8B5CF6' },
  { name: 'Deep Ocean', value: 'linear-gradient(135deg, #0EA5E9 0%, #3B82F6 50%, #6366F1 100%)', color: '#0EA5E9' },
  { name: 'Emerald Wave', value: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)', color: '#10B981' },
  { name: 'Midnight Gold', value: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)', color: '#1E1B4B' },
  { name: 'Neon Amber', value: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #BE123C 100%)', color: '#F59E0B' },
  { name: 'Dark Slate', value: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)', color: '#0F172A' },
];

export const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }: CreateStoryModalProps) => {
  const showToast = useUIStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storyType, setStoryType] = useState<'media' | 'text'>('media');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showToast('Media size must be under 25MB', 'error');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');
    setUploading(true);

    try {
      const url = await uploadApi.upload(file, 'stories');
      if (url) {
        setMediaUrl(url);
        showToast('Photo uploaded successfully', 'success');
      } else {
        throw new Error('No upload URL returned');
      }
    } catch (err: any) {
      // Fallback to local Data URL if server upload is unreachable
      try {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setMediaUrl(reader.result);
            showToast('Photo loaded', 'success');
          }
        };
        reader.readAsDataURL(file);
      } catch {
        showToast(err?.message || 'Upload error', 'error');
      }
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (storyType === 'media' && !mediaUrl) {
      showToast('Please select a photo or video first', 'info');
      return;
    }
    if (storyType === 'text' && !caption.trim()) {
      showToast('Please type your story message', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await storyApi.createStory({
        mediaUrl: storyType === 'media' ? mediaUrl : undefined,
        mediaType: storyType === 'media' ? mediaType : 'text',
        caption: caption.trim(),
        backgroundColor: storyType === 'text' ? selectedBg.value : undefined,
        textColor: '#FFFFFF',
      });

      showToast('Story posted! Visible for 24 hours 🌟', 'success');
      onStoryCreated();
      onClose();
      // Reset state
      setMediaUrl('');
      setCaption('');
      setStoryType('media');
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to post story', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600">
              <Sparkle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-base text-ink">Add to Story</h3>
              <p className="text-[11px] text-ink-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-500" /> Disappears after 24 hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-ink hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Type Toggle */}
        <div className="px-5 pt-3">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setStoryType('media')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                storyType === 'media'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Photo / Video</span>
            </button>
            <button
              onClick={() => setStoryType('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                storyType === 'text'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <TextIcon className="w-4 h-4" />
              <span>Text Story</span>
            </button>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {storyType === 'media' ? (
            <div className="space-y-3">
              {mediaUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/12] flex items-center justify-center group shadow-md">
                  {mediaType === 'video' ? (
                    <video src={getMediaUrl(mediaUrl)} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={getMediaUrl(mediaUrl)} alt="Story preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => setMediaUrl('')}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all aspect-[9/12] ${
                    uploading
                      ? 'border-rose-300 bg-rose-50/50'
                      : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CameraIcon className="w-7 h-7" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm text-ink">
                      {uploading ? 'Uploading your story…' : 'Tap to select photo or video'}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">Supports JPG, PNG, MP4 up to 25MB</p>
                  </div>
                </div>
              )}

              <div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption to your story… (optional)"
                  maxLength={200}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-xs text-ink placeholder:text-ink-muted border border-slate-200 focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Text Story Canvas Preview */}
              <div
                style={{ background: selectedBg.value }}
                className="rounded-2xl p-6 aspect-[9/12] flex flex-col items-center justify-center text-center shadow-md relative transition-all duration-300"
              >
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Type your story here…"
                  maxLength={300}
                  rows={4}
                  className="w-full bg-transparent text-white font-extrabold text-xl placeholder:text-white/60 text-center resize-none focus:outline-none leading-relaxed drop-shadow-sm"
                />
                <div className="absolute bottom-3 right-4 text-[11px] font-bold text-white/70">
                  {caption.length}/300
                </div>
              </div>

              {/* Color Gradient Palette */}
              <div>
                <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                  Select Background Style
                </span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {BG_GRADIENTS.map((bg) => (
                    <button
                      key={bg.name}
                      onClick={() => setSelectedBg(bg)}
                      style={{ background: bg.value }}
                      className={`w-9 h-9 rounded-full shrink-0 transition-transform ${
                        selectedBg.name === bg.name ? 'ring-3 ring-rose-500 ring-offset-2 scale-110' : 'hover:scale-105'
                      }`}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex gap-2.5 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-ink active:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={submitting || uploading}
            className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-xs font-black text-white shadow-md shadow-rose-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Posting Story…' : 'Share to Story (24h) 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
};
