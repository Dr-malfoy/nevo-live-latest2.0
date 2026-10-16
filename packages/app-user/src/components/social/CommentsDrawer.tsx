import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiXBold as X,
  PiPaperPlaneRightFill as Send,
  PiChatCircleBold as MessageCircle,
  PiHeartFill as HeartFilled,
  PiHeartBold as HeartOutline,
  PiArrowBendDownRightBold as ReplyIcon,
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
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    commentId: string;
    authorName: string;
    authorId?: string;
  } | null>(null);

  // Local likes tracking for instant snappy optimistic updates
  const [likesMap, setLikesMap] = useState<Record<string, { liked: boolean; count: number }>>({});

  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentUserId = currentUser?._id?.toString() || currentUser?.uid?.toString();

  const resolveLevel = (u?: any): number => {
    if (!u) return 1;
    const rawLvl = Number(u.level) || 0;
    const wLvl =
      u.wealthLevel && u.wealthLevel > 1
        ? u.wealthLevel
        : calculateWealthLevel(u.wealthExp || u.diamonds, u.wealthLevel || rawLvl).level;
    const lLvl =
      u.liveLevel && u.liveLevel > 1
        ? u.liveLevel
        : calculateLiveLevel(
            u.liveStreamMinutes || Math.floor((u.liveStreamSeconds || 0) / 60),
            rawLvl
          ).level;
    return Math.max(1, rawLvl, wLvl, lLvl);
  };

  const handleLikeComment = async (commentId?: string, initialLikes?: string[]) => {
    if (!commentId) return;
    if (!currentUser) {
      showToast('Please login to react', 'error');
      return;
    }

    const currentLikeInfo = likesMap[commentId] ?? {
      liked: Boolean(
        initialLikes?.some(
          (id: any) => (id?._id?.toString?.() || id?.toString?.()) === currentUserId
        )
      ),
      count: initialLikes?.length || 0,
    };

    const nextLiked = !currentLikeInfo.liked;
    const nextCount = Math.max(0, currentLikeInfo.count + (nextLiked ? 1 : -1));

    // Optimistic UI update
    setLikesMap((prev) => ({
      ...prev,
      [commentId]: { liked: nextLiked, count: nextCount },
    }));

    try {
      const res = await momentsApi.toggleCommentLike(momentId, commentId);
      if (res.data?.success) {
        setLikesMap((prev) => ({
          ...prev,
          [commentId]: {
            liked: res.data.data.liked,
            count: res.data.data.likesCount,
          },
        }));
      }
    } catch {
      // Revert on error
      setLikesMap((prev) => ({
        ...prev,
        [commentId]: currentLikeInfo,
      }));
      showToast('Failed to update reaction', 'error');
    }
  };

  const handleStartReply = (c: Comment) => {
    const author = typeof c.userId === 'object' ? c.userId : null;
    const authorName = author?.nickname || 'User';
    // If replying to a reply, use its parentId as the thread root if available, or its own _id
    const targetParentId = c.parentId || c._id || '';

    setReplyingTo({
      commentId: targetParentId,
      authorName,
      authorId: author?._id || (typeof c.userId === 'string' ? c.userId : undefined),
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

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
      const res = await momentsApi.addComment(
        momentId,
        text,
        replyingTo?.commentId,
        replyingTo
          ? {
              userId: replyingTo.authorId,
              nickname: replyingTo.authorName,
            }
          : undefined
      );

      if (res?.data?.success) {
        setCommentText('');
        setReplyingTo(null);
        onCommentAdded();
      }
    } catch {
      showToast('Failed to post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Group comments into root comments and replies
  const rootComments = comments.filter(
    (c) => !c.parentId || !comments.some((p) => p._id && p._id === c.parentId)
  );
  const repliesByParentId = comments.reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId && comments.some((p) => p._id && p._id === c.parentId)) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const renderCommentCard = (c: Comment, isReply = false) => {
    const author = typeof c.userId === 'object' ? c.userId : null;
    const isCommentAuthorCurrent =
      currentUser &&
      ((author?._id && currentUser._id?.toString() === author._id?.toString()) ||
        (author?.uid && currentUser.uid?.toString() === author.uid?.toString()) ||
        (typeof c.userId === 'string' && currentUser._id?.toString() === c.userId?.toString()));

    const authorName = isCommentAuthorCurrent
      ? currentUser.nickname || author?.nickname || 'User'
      : author?.nickname || 'User';
    const avatarUrl = isCommentAuthorCurrent
      ? currentUser.avatar || author?.avatar
      : author?.avatar;
    const level = isCommentAuthorCurrent ? resolveLevel(currentUser) : resolveLevel(author);
    const authorId =
      author?._id ||
      (isCommentAuthorCurrent
        ? currentUser._id
        : typeof c.userId === 'string'
        ? c.userId
        : undefined);

    const handleOpenProfile = (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
      if (isCommentAuthorCurrent) {
        navigate('/profile');
      } else if (authorId) {
        navigate(`/user/${authorId}`);
      }
    };

    const commentId = c._id || '';
    const initialLiked = Boolean(
      c.likes?.some((id: any) => (id?._id?.toString?.() || id?.toString?.()) === currentUserId)
    );
    const likeInfo = likesMap[commentId] ?? {
      liked: initialLiked,
      count: c.likes?.length || 0,
    };

    return (
      <div key={commentId || c.createdAt} className="flex items-start gap-2.5 group">
        <div
          onClick={handleOpenProfile}
          className="cursor-pointer active:scale-95 transition-transform shrink-0 mt-0.5"
          title={`View ${authorName}'s profile`}
        >
          <Avatar src={avatarUrl} nickname={authorName} size={isReply ? 'xs' : 'sm'} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`rounded-2xl p-2.5 sm:p-3 border transition-colors ${
              isReply
                ? 'bg-surface-sunken/50 border-line/40'
                : 'bg-surface-sunken/80 border-line/60'
            }`}
          >
            {/* Header: Author + Badges + Timestamp */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div
                onClick={handleOpenProfile}
                className="flex items-center gap-1.5 flex-wrap cursor-pointer group/name min-w-0"
                title={`View ${authorName}'s profile`}
              >
                <span className="text-xs font-bold text-ink group-hover/name:text-accent-500 group-hover/name:underline transition-colors truncate max-w-[130px] sm:max-w-[170px]">
                  {authorName}
                </span>
                <VerifiedBadge verification={author?.verification} />
                <LevelBadge level={level} size="sm" />
                {isCommentAuthorCurrent && (
                  <span className="text-[10px] text-accent-600 bg-accent-50 px-1 rounded font-semibold">
                    You
                  </span>
                )}
              </div>
              <span className="text-[10px] text-ink-faint shrink-0 tabular-nums">
                {timeAgo(c.createdAt)}
              </span>
            </div>

            {/* Replying mention indicator if present */}
            {c.replyTo?.nickname && (
              <div className="text-[11px] text-accent-600 font-semibold mb-1 flex items-center gap-1">
                <span>Replying to</span>
                <span className="hover:underline cursor-pointer">@{c.replyTo.nickname}</span>
              </div>
            )}

            {/* Comment Body */}
            <p className="text-xs text-ink-soft leading-relaxed break-words whitespace-pre-wrap">
              {c.text}
            </p>

            {/* Action Row: React / Like + Reply */}
            <div className="flex items-center gap-4 mt-2 pt-1 border-t border-line/40">
              {/* Like / Heart Reaction Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeComment(commentId, c.likes);
                }}
                className={`flex items-center gap-1 text-[11px] font-bold transition-all active:scale-90 ${
                  likeInfo.liked ? 'text-rose-500' : 'text-ink-faint hover:text-rose-500'
                }`}
                title="React to comment"
              >
                {likeInfo.liked ? (
                  <HeartFilled className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-scale-up" />
                ) : (
                  <HeartOutline className="w-3.5 h-3.5 text-ink-muted group-hover:text-rose-500" />
                )}
                <span className="tabular-nums">{likeInfo.count > 0 ? likeInfo.count : 'Like'}</span>
              </button>

              {/* Reply Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartReply(c);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-ink-faint hover:text-accent-600 transition-colors active:scale-95"
                title="Reply to comment"
              >
                <ReplyIcon className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </div>
          </div>

          {/* Nested Replies */}
          {c._id && repliesByParentId[c._id] && repliesByParentId[c._id].length > 0 && (
            <div className="ml-3 sm:ml-5 mt-2 pl-3 border-l-2 border-accent-200/70 space-y-2">
              {repliesByParentId[c._id].map((reply) => renderCommentCard(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-ink-muted">
              <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-3 text-ink-faint">
                <MessageCircle className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-ink">No comments yet</p>
              <p className="text-xs text-ink-faint mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rootComments.map((rootComment) => renderCommentCard(rootComment, false))}
            </div>
          )}
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="px-4 py-2 bg-accent-50/90 border-t border-accent-100 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-1.5 text-xs text-accent-700 min-w-0">
              <ReplyIcon className="w-3.5 h-3.5 text-accent-500 shrink-0" />
              <span className="truncate">
                Replying to <span className="font-bold text-accent-900">@{replyingTo.authorName}</span>
              </span>
            </div>
            <button
              onClick={handleCancelReply}
              className="w-5 h-5 rounded-full hover:bg-accent-200/60 text-accent-700 flex items-center justify-center transition-colors shrink-0"
              title="Cancel reply"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Comment Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t border-line flex items-center gap-2"
        >
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={
                replyingTo
                  ? `Reply to @${replyingTo.authorName}...`
                  : 'Write a supportive comment...'
              }
              maxLength={300}
              className="w-full bg-surface-sunken rounded-full px-4 py-2.5 text-xs text-ink placeholder-ink-faint border border-line focus:outline-none focus:border-accent-500 focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-md shrink-0 hover:bg-neutral-800"
          >
            <Send className="w-4 h-4 translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
