import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiXBold as X,
  PiTrashFill as Trash,
  PiPaperPlaneRightFill as SendIcon,
  PiCaretLeftBold as PrevIcon,
  PiCaretRightBold as NextIcon,
  PiEyeFill as EyeIcon,
} from 'react-icons/pi';
import { storyApi, chatApi, type UserStoryGroup, type StoryItem } from '../../api';
import { Avatar } from '../user';
import { timeAgo } from '../../lib/time';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyGroups: UserStoryGroup[];
  initialGroupIndex?: number;
  onStoriesChanged?: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per slide

export const StoryViewerModal = ({
  isOpen,
  onClose,
  storyGroups,
  initialGroupIndex = 0,
  onStoriesChanged,
}: StoryViewerModalProps) => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const currentGroup = storyGroups[groupIndex];
  const currentStory: StoryItem | undefined = currentGroup?.stories[storyIndex];

  // Reset indices when opening
  useEffect(() => {
    if (isOpen) {
      setGroupIndex(Math.min(initialGroupIndex, Math.max(0, storyGroups.length - 1)));
      setStoryIndex(0);
      setProgress(0);
      setIsPaused(false);
      setImageLoading(true);
      setImageError(false);
    }
  }, [isOpen, initialGroupIndex, storyGroups.length]);

  // Reset image loading on current story change
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
  }, [currentStory?._id, currentStory?.mediaUrl]);

  // Mark story as viewed
  useEffect(() => {
    if (isOpen && currentStory?._id && !currentStory.hasViewed) {
      storyApi.viewStory(currentStory._id).catch(() => {});
    }
  }, [isOpen, currentStory?._id, currentStory?.hasViewed]);

  const handleNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      // Finished all stories
      onClose();
      onStoriesChanged?.();
    }
  }, [currentGroup, storyIndex, groupIndex, storyGroups.length, onClose, onStoriesChanged]);

  const handlePrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(Math.max(0, prevGroup.stories.length - 1));
      setProgress(0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  // Timer loop for progress bar
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    const interval = 50; // update every 50ms
    const step = (interval / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, currentStory, handleNext]);

  if (!isOpen || !currentGroup || !currentStory) return null;

  const handleDeleteStory = async () => {
    if (!currentStory?._id) return;
    setDeleting(true);
    try {
      await storyApi.deleteStory(currentStory._id);
      showToast('Story deleted', 'success');
      onStoriesChanged?.();
      // If there are other stories in this group, continue; else move next or close
      if (currentGroup.stories.length > 1) {
        if (storyIndex > 0) {
          setStoryIndex((s) => s - 1);
        }
      } else if (storyGroups.length > 1) {
        handleNext();
      } else {
        onClose();
      }
    } catch {
      showToast('Failed to delete story', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const { data } = await chatApi.getOrCreateChat(currentGroup.user._id);
      if (data.success && data.data?._id) {
        await chatApi.sendMessage(
          data.data._id,
          `Replied to story: "${replyText.trim()}"`
        );
        showToast('Reply sent! 💌', 'success');
        setReplyText('');
      }
    } catch {
      showToast('Could not send reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      onPointerDown={() => setIsPaused(true)}
      onPointerUp={() => setIsPaused(false)}
    >
      <div className="relative w-full h-full max-w-md bg-black flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 pt-3 px-3.5 flex gap-1.5">
          {currentGroup.stories.map((s, idx) => {
            let widthPercent = 0;
            if (idx < storyIndex) widthPercent = 100;
            else if (idx === storyIndex) widthPercent = progress;
            return (
              <div
                key={s._id}
                className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden backdrop-blur-xs"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Top User Header Info */}
        <div className="absolute top-6 left-0 right-0 z-30 px-4 py-2 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => {
              onClose();
              navigate(`/user/${currentGroup.user._id}`);
            }}
          >
            {/* Red Circle Ring on Story Avatar */}
            <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-rose-500 to-red-600 shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              <Avatar
                src={currentGroup.user.avatar}
                nickname={currentGroup.user.nickname}
                size="sm"
                className="w-full h-full"
              />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white drop-shadow-md">
                  {currentGroup.user.nickname}
                </span>
                {currentGroup.isSelf && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/80 text-[10px] font-bold text-white">
                    You
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/75 drop-shadow-xs">
                {timeAgo(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentGroup.isSelf && (
              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={deleting}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-red-500 hover:bg-black/60 transition-colors"
                title="Delete this story"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {imageLoading && (currentStory.mediaType === 'image' || currentStory.mediaUrl) && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/30 border-t-rose-500 rounded-full animate-spin" />
            </div>
          )}

          {(currentStory.mediaType === 'image' || (!currentStory.mediaType && currentStory.mediaUrl)) && currentStory.mediaUrl ? (
            imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white/90 gap-2">
                <span className="text-4xl">📷</span>
                <p className="text-sm font-bold">Unable to display photo</p>
                <p className="text-xs text-white/50">{currentStory.caption || 'Tap right to continue'}</p>
              </div>
            ) : (
              <img
                key={currentStory._id || currentStory.mediaUrl}
                src={getMediaUrl(currentStory.mediaUrl)}
                alt="Story"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
                className="w-full h-full object-contain bg-black"
              />
            )
          ) : currentStory.mediaType === 'video' && currentStory.mediaUrl ? (
            <video
              key={currentStory._id || currentStory.mediaUrl}
              src={getMediaUrl(currentStory.mediaUrl)}
              autoPlay
              playsInline
              muted={false}
              onLoadedData={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            /* Text Story */
            <div
              style={{
                background:
                  currentStory.backgroundColor ||
                  'linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FDA4AF 100%)',
              }}
              className="w-full h-full flex items-center justify-center p-8 text-center"
            >
              <p
                style={{ color: currentStory.textColor || '#FFFFFF' }}
                className="font-extrabold text-2xl md:text-3xl leading-relaxed drop-shadow-md select-text"
              >
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Optional Overlay Caption for Photo/Video */}
          {currentStory.mediaType !== 'text' && currentStory.caption && (
            <div className="absolute bottom-20 left-0 right-0 px-6 py-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center z-20">
              <p className="text-white font-medium text-sm drop-shadow-md">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Left / Right Tap Areas for Navigation */}
          <div
            className="absolute left-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer"
            onClick={handlePrev}
          />
          <div
            className="absolute right-0 top-16 bottom-20 w-1/3 z-20 cursor-pointer"
            onClick={handleNext}
          />
        </div>

        {/* Bottom Bar: Reply or Self View Count */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {currentGroup.isSelf ? (
            <div className="flex items-center justify-center gap-2 py-1 text-white/90 text-xs font-semibold">
              <EyeIcon className="w-4 h-4 text-rose-400" />
              <span>{currentStory.viewsCount || 1} views</span>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${currentGroup.user.nickname}…`}
                className="flex-1 px-4 py-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white placeholder:text-white/60 text-xs focus:outline-none focus:bg-white/30 transition-all"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all disabled:opacity-40"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
