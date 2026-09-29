import React, { useState } from 'react';
import {
  PiXBold as X,
  PiPaperPlaneRightFill as Send,
  PiChatCircleBold as MessageCircle,
} from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { timeAgo } from '../../lib/time';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';
import { momentsApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import type { Comment } from '../../types';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  momentId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  isOpen,
  onClose,
  momentId,
  comments,
  onCommentAdded,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;

    if (!currentUser) {
      showToast('Please login to comment', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await momentsApi.addComment(momentId, text);
      if (res?.data?.success) {
        setCommentText('');
        onCommentAdded();
      }
    } catch {
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-line flex flex-col h-[75vh] max-h-[600px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-soft">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-accent-500" />
            <h3 className="text-base font-bold text-ink">Comments</h3>
            <span className="px-2 py-0.5 rounded-full bg-surface-sunken text-xs font-bold text-ink-muted">
              {comments.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink hover:bg-line transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-ink-muted">
              <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-3 text-ink-faint">
                <MessageCircle className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-ink">No comments yet</p>
              <p className="text-xs text-ink-faint mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {comments.map((c, i) => {
                const author = typeof c.userId === 'object' ? c.userId : null;
                const isCommentAuthorCurrent = currentUser && (
                  (author?._id && currentUser._id?.toString() === author._id?.toString()) ||
                  (author?.uid && currentUser.uid?.toString() === author.uid?.toString()) ||
                  (typeof c.userId === 'string' && currentUser._id?.toString() === c.userId?.toString())
                );
                const resolveLevel = (u?: any): number => {
                  if (!u) return 1;
                  const rawLvl = Number(u.level) || 0;
                  const wLvl = u.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(u.diamonds, rawLvl).level;
                  const lLvl = u.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(u.coins, rawLvl).level;
                  return Math.max(1, rawLvl, wLvl, lLvl);
                };
                const authorName = isCommentAuthorCurrent ? (currentUser.nickname || author?.nickname || 'User') : (author?.nickname || 'User');
                const avatarUrl = isCommentAuthorCurrent ? (currentUser.avatar || author?.avatar) : author?.avatar;
                const level = isCommentAuthorCurrent ? resolveLevel(currentUser) : resolveLevel(author);

                return (
                  <div key={i} className="flex items-start gap-3 group">
                    <Avatar src={avatarUrl} nickname={authorName} size="sm" />
                    <div className="flex-1 bg-surface-sunken/70 rounded-2xl p-3 border border-line/60">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-ink">{authorName}</span>
                          <VerifiedBadge verification={author?.verification} />
                          <LevelBadge level={level} size="sm" />
                        </div>
                        <span className="text-[10px] text-ink-faint shrink-0">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed break-words">
                        {c.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t border-line flex items-center gap-2"
        >
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a supportive comment..."
              maxLength={300}
              className="w-full bg-surface-sunken rounded-full px-4 py-2.5 text-xs text-ink placeholder-ink-faint border border-line focus:outline-none focus:border-accent-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-md shrink-0"
          >
            <Send className="w-4 h-4 translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
