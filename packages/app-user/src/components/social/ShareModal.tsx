import React, { useEffect, useState } from 'react';
import {
  PiXBold as X,
  PiCopyBold as Copy,
  PiCheckBold as Check,
  PiPaperPlaneRightFill as Send,
  PiMagnifyingGlassBold as Search,
  PiWhatsappLogoFill as Whatsapp,
  PiTelegramLogoFill as Telegram,
  PiTwitterLogoFill as Twitter,
  PiFacebookLogoFill as Facebook,
  PiShareNetworkFill as ShareNetwork,
} from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { useAuthStore, useUIStore } from '../../stores';
import { usersApi, chatApi, momentsApi } from '../../api';
import type { UserPublic } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  momentId: string;
  authorName?: string;
  caption?: string;
  thumbnailUrl?: string;
  onShareSuccess?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  momentId,
  authorName = 'User',
  caption = '',
  thumbnailUrl,
  onShareSuccess,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const currentUser = useAuthStore((s) => s.user);

  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const shareUrl = `${window.location.origin}/social?post=${momentId}`;

  useEffect(() => {
    if (!isOpen) return;

    // Load mutual friends / following for quick share
    const loadShareRecipients = async () => {
      setLoadingUsers(true);
      try {
        // Try getting friends first, then following
        const friendsRes = await usersApi.getFriends('me', 1).catch(() => null);
        if (friendsRes?.data?.data && friendsRes.data.data.length > 0) {
          setUsers(friendsRes.data.data);
          return;
        }

        const followingRes = await usersApi.getFollowing('me', 1).catch(() => null);
        if (followingRes?.data?.data && followingRes.data.data.length > 0) {
          setUsers(followingRes.data.data);
          return;
        }

        // Fallback: search popular users
        const searchRes = await usersApi.searchUsers('').catch(() => null);
        if (searchRes?.data?.data) {
          setUsers(searchRes.data.data.filter((u) => u._id !== currentUser?._id));
        }
      } catch {
        // quiet fallback
      } finally {
        setLoadingUsers(false);
      }
    };

    loadShareRecipients();
  }, [isOpen, currentUser?._id]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      showToast('Link copied to clipboard!', 'success');
      momentsApi.share(momentId).catch(() => {});
      onShareSuccess?.();
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleSendToUser = async (recipient: UserPublic) => {
    if (sendingId || sentMap[recipient._id]) return;
    setSendingId(recipient._id);

    try {
      // 1. Get or create direct chat
      const chatRes = await chatApi.getOrCreateChat(recipient._id);
      const chatId = chatRes?.data?.data?._id;

      if (chatId) {
        const shareMessage = `Check out this post by ${authorName}: ${shareUrl}`;
        await chatApi.sendMessage(chatId, shareMessage, {
          sharedPost: {
            postId: momentId,
            authorName,
            caption: caption ? caption.slice(0, 100) : '',
            thumbnail: thumbnailUrl || '',
          },
        });
      }

      setSentMap((prev) => ({ ...prev, [recipient._id]: true }));
      showToast(`Sent to ${recipient.nickname || 'user'}!`, 'success');
      momentsApi.share(momentId).catch(() => {});
      onShareSuccess?.();
    } catch {
      showToast(`Could not send to ${recipient.nickname}`, 'error');
    } finally {
      setSendingId(null);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${authorName} on Nevo Live`,
          text: caption || `Check out this post by ${authorName} on Nevo Live!`,
          url: shareUrl,
        });
        momentsApi.share(momentId).catch(() => {});
        onShareSuccess?.();
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSocialShare = (platform: 'whatsapp' | 'telegram' | 'twitter' | 'facebook') => {
    const text = encodeURIComponent(`Check out ${authorName}'s post on Nevo Live: `);
    const encodedUrl = encodeURIComponent(shareUrl);
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${text}%20${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      momentsApi.share(momentId).catch(() => {});
      onShareSuccess?.();
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.nickname?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-line flex flex-col max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-soft">
          <div>
            <h3 className="text-base font-bold text-ink">Share Post</h3>
            <p className="text-xs text-ink-muted">Send to friends or copy share link</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink hover:bg-line transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Link Copy Bar */}
        <div className="p-4 bg-white border-b border-line">
          <div className="flex items-center gap-2 p-1.5 pl-3 bg-surface-sunken rounded-xl border border-line-strong">
            <span className="text-xs text-ink-muted truncate flex-1 font-mono">
              {shareUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                copied
                  ? 'bg-status-online text-white'
                  : 'bg-black text-white hover:bg-neutral-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Social Share Icons Strip */}
        <div className="px-4 py-3 bg-white border-b border-line flex items-center justify-around">
          <button
            onClick={() => handleSocialShare('whatsapp')}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:opacity-90">
              <Whatsapp className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium text-ink-muted">WhatsApp</span>
          </button>

          <button
            onClick={() => handleSocialShare('telegram')}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md group-hover:opacity-90">
              <Telegram className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium text-ink-muted">Telegram</span>
          </button>

          <button
            onClick={() => handleSocialShare('twitter')}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md group-hover:opacity-90">
              <Twitter className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium text-ink-muted">X</span>
          </button>

          <button
            onClick={() => handleSocialShare('facebook')}
            className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
          >
            <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:opacity-90">
              <Facebook className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-medium text-ink-muted">Facebook</span>
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1 group active:scale-95 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-accent-500 text-white flex items-center justify-center shadow-md group-hover:opacity-90">
                <ShareNetwork className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium text-ink-muted">More</span>
            </button>
          )}
        </div>

        {/* Share to Users / Direct Messages Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Send to Users
            </span>
            <span className="text-[11px] text-ink-faint">
              {filteredUsers.length} available
            </span>
          </div>

          {/* User Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user by name or ID..."
              className="w-full bg-surface-sunken rounded-xl pl-9 pr-3 py-2 text-xs text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-accent-500"
            />
          </div>

          {/* User List */}
          {loadingUsers ? (
            <div className="py-8 text-center text-xs text-ink-muted">Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              {searchQuery ? 'No users matching search' : 'No friends found to share with'}
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isSent = !!sentMap[u._id];
                const isSending = sendingId === u._id;

                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-sunken transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={u.avatar} nickname={u.nickname} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-ink truncate max-w-[120px]">
                            {u.nickname}
                          </span>
                          <VerifiedBadge verification={u.verification} />
                          <LevelBadge level={u.level} size="sm" />
                        </div>
                        <span className="text-[10px] text-ink-faint">ID: {u.uid}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendToUser(u)}
                      disabled={isSent || isSending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isSent
                          ? 'bg-surface-sunken text-status-online border border-status-online/30 cursor-default'
                          : isSending
                          ? 'bg-accent-200 text-accent-700 cursor-wait'
                          : 'bg-accent-500 text-white hover:bg-accent-600 active:scale-95 shadow-sm'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Sent
                        </>
                      ) : isSending ? (
                        'Sending…'
                      ) : (
                        <>
                          <Send className="w-3 h-3" /> Send
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
