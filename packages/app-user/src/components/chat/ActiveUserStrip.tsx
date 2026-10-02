import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiPlusBold as Plus,
  PiRadioFill as Radio,
  PiSparkleFill as Sparkle,
  PiChatCircleDotsFill as ThoughtIcon,
} from 'react-icons/pi';
import type { ActiveChatUser } from '../../api/chat.api';
import type { UserStoryGroup } from '../../api/story.api';
import type { NoteItem } from '../../api/note.api';
import { chatApi } from '../../api';

interface ActiveUserStripProps {
  users: ActiveChatUser[];
  storyGroups?: UserStoryGroup[];
  notes?: NoteItem[];
  currentUser?: {
    _id: string;
    nickname: string;
    avatar?: string;
  } | null;
  onOpenCreateStory?: () => void;
  onOpenCreateNote?: () => void;
  onOpenStoryViewer?: (groupIndex: number) => void;
  onUserSelect?: (user: ActiveChatUser) => void;
}

export const ActiveUserStrip = ({
  users,
  storyGroups = [],
  notes = [],
  currentUser,
  onOpenCreateStory,
  onOpenCreateNote,
  onOpenStoryViewer,
  onUserSelect,
}: ActiveUserStripProps) => {
  const navigate = useNavigate();
  const [showSelfMenu, setShowSelfMenu] = useState(false);

  // Find self story group & note
  const selfStoryIndex = storyGroups.findIndex((g) => g.isSelf || g.user._id === currentUser?._id);
  const selfStoryGroup = selfStoryIndex >= 0 ? storyGroups[selfStoryIndex] : null;
  const selfNote = notes.find((n) => n.isSelf || n.user._id === currentUser?._id);

  // Map of notes by userId for instant O(1) lookup
  const noteByUserMap = new Map<string, NoteItem>();
  for (const n of notes) {
    if (n.user?._id) noteByUserMap.set(n.user._id, n);
  }

  // Map of story group indices by userId
  const storyGroupIndexByUserMap = new Map<string, number>();
  storyGroups.forEach((g, idx) => {
    if (g.user?._id) storyGroupIndexByUserMap.set(g.user._id, idx);
  });

  const handleUserClick = async (user: ActiveChatUser) => {
    const storyIdx = storyGroupIndexByUserMap.get(user._id);

    // If user has a story, open the Story Viewer
    if (storyIdx !== undefined && onOpenStoryViewer) {
      onOpenStoryViewer(storyIdx);
      return;
    }

    if (onUserSelect) {
      onUserSelect(user);
      return;
    }

    if (user.liveStreamId) {
      navigate(`/live/${user.liveStreamId}`);
      return;
    }

    try {
      const { data } = await chatApi.getOrCreateChat(user._id);
      if (data.success && data.data?._id) {
        navigate(`/chat/${data.data._id}`);
      } else {
        navigate(`/user/${user._id}`);
      }
    } catch {
      navigate(`/user/${user._id}`);
    }
  };

  const handleSelfAvatarClick = () => {
    if (selfStoryGroup && onOpenStoryViewer && selfStoryIndex >= 0) {
      onOpenStoryViewer(selfStoryIndex);
    } else if (onOpenCreateStory) {
      onOpenCreateStory();
    }
  };

  return (
    <div className="bg-white border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      {/* Horizontal Profile Strip with Perfect Grid & Vertical Alignment */}
      <div className="flex gap-3 px-3.5 overflow-x-auto no-scrollbar scroll-smooth py-3">
        {/* ── 1. Current User's "Your Story / Note" Column ────────── */}
        <div className="flex flex-col items-center shrink-0 w-[72px] relative group">
          {/* Upper Thought Bubble Slot (Fixed height for 100% baseline alignment) */}
          <div className="h-6 w-full flex items-center justify-center mb-1">
            {selfNote ? (
              <button
                onClick={onOpenCreateNote}
                className="max-w-[70px] px-2 py-0.5 rounded-full bg-white border border-indigo-200/90 shadow-[0_2px_6px_rgba(99,102,241,0.15)] flex items-center gap-0.5 text-[10px] font-bold text-indigo-950 truncate hover:scale-105 active:scale-95 transition-all relative"
                title={selfNote.text}
              >
                <span className="text-[11px] shrink-0 select-none">{selfNote.emoji || '💭'}</span>
                <span className="truncate">{selfNote.text}</span>
                {/* Pointer Tail */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white border-b border-r border-indigo-200/90 rotate-45" />
              </button>
            ) : (
              <button
                onClick={onOpenCreateNote}
                className="opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded-full bg-slate-50 hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-300 text-[10px] font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-0.5 transition-all active:scale-95"
                title="Share a Note"
              >
                <ThoughtIcon className="w-3 h-3 text-indigo-400" />
                <span>Note</span>
              </button>
            )}
          </div>

          {/* Profile Circle Avatar */}
          <div className="relative">
            <div
              onClick={handleSelfAvatarClick}
              className={`w-[58px] h-[58px] rounded-full p-[2.5px] cursor-pointer transition-transform duration-200 active:scale-95 flex items-center justify-center ${
                selfStoryGroup
                  ? 'bg-gradient-to-tr from-rose-500 via-red-500 to-pink-500 shadow-[0_2px_10px_rgba(244,63,94,0.35)] ring-2 ring-rose-200'
                  : 'border-2 border-dashed border-slate-300/90 hover:border-rose-400 p-[2px]'
              }`}
            >
              <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.nickname || 'You'}
                    className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-700 font-bold text-base">
                    {(currentUser?.nickname || 'Y').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Plus / Add Badge */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSelfMenu(!showSelfMenu);
              }}
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-rose-500 text-white ring-2 ring-white shadow-sm flex items-center justify-center hover:bg-rose-600 active:scale-90 transition-all z-10"
              title="Add Story or Note"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          {/* User Nickname */}
          <span className="text-[11px] font-bold text-slate-800 mt-1.5 truncate w-full text-center">
            Your Story
          </span>

          {/* Self Story Dropdown Menu */}
          {showSelfMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSelfMenu(false);
                }}
              />
              <div className="absolute top-[88px] left-0 z-40 w-32 bg-white rounded-2xl shadow-2xl border border-slate-100 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                {selfStoryGroup && (
                  <button
                    onClick={() => {
                      setShowSelfMenu(false);
                      onOpenStoryViewer?.(selfStoryIndex);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    View Story
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowSelfMenu(false);
                    onOpenCreateStory?.();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Add Story
                </button>
                <button
                  onClick={() => {
                    setShowSelfMenu(false);
                    onOpenCreateNote?.();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  {selfNote ? 'Edit Note' : 'Share Note'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── 2. Other Users (Friends, Followers, Active) ─────────── */}
        {users.map((user) => {
          const userNote = noteByUserMap.get(user._id);
          const hasStoryIndex = storyGroupIndexByUserMap.get(user._id);
          const hasStory = hasStoryIndex !== undefined;
          const storyGroup = hasStory ? storyGroups[hasStoryIndex] : null;
          const hasUnviewed = storyGroup?.hasUnviewed ?? false;
          const isLive = Boolean(user.liveStreamId);
          const isOnline = Boolean(user.online) || isLive;

          return (
            <div
              key={user._id}
              className="flex flex-col items-center shrink-0 w-[72px] relative group"
            >
              {/* Upper Thought Bubble Slot (Fixed height for 100% baseline alignment) */}
              <div className="h-6 w-full flex items-center justify-center mb-1">
                {userNote ? (
                  <button
                    onClick={() => handleUserClick(user)}
                    className="max-w-[70px] px-2 py-0.5 rounded-full bg-white border border-indigo-200/90 shadow-[0_2px_6px_rgba(99,102,241,0.15)] flex items-center gap-0.5 text-[10px] font-bold text-indigo-950 truncate hover:scale-105 active:scale-95 transition-all relative"
                    title={userNote.text}
                  >
                    <span className="text-[11px] shrink-0 select-none">{userNote.emoji || '💭'}</span>
                    <span className="truncate">{userNote.text}</span>
                    {/* Pointer Tail */}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white border-b border-r border-indigo-200/90 rotate-45" />
                  </button>
                ) : null}
              </div>

              {/* Profile Avatar Container with Red Story Ring or Green Online Ring */}
              <div
                role="button"
                onClick={() => handleUserClick(user)}
                className="relative cursor-pointer"
              >
                <div
                  className={`w-[58px] h-[58px] rounded-full p-[2.5px] transition-all duration-300 flex items-center justify-center group-hover:scale-105 active:scale-95 ${
                    hasStory
                      ? hasUnviewed
                        ? 'bg-gradient-to-tr from-rose-500 via-red-500 to-pink-500 shadow-[0_2px_12px_rgba(244,63,94,0.45)] ring-2 ring-rose-200'
                        : 'bg-gradient-to-tr from-rose-300 to-red-400 shadow-sm'
                      : isLive
                        ? 'bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500 shadow-[0_2px_10px_rgba(168,85,247,0.4)] animate-pulse'
                        : isOnline
                          ? 'bg-gradient-to-tr from-emerald-400 to-teal-500 shadow-[0_2px_8px_rgba(16,185,129,0.3)] ring-1 ring-emerald-100'
                          : 'border border-slate-200 p-[1.5px]'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-white p-[1.5px] overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.nickname}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base select-none">
                        {(user.nickname || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badges */}
                {isLive ? (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5 ring-2 ring-white z-10 whitespace-nowrap">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    LIVE
                  </span>
                ) : hasStory ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white shadow-sm flex items-center justify-center z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                ) : isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm flex items-center justify-center z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  </span>
                ) : null}
              </div>

              {/* Nickname & Status */}
              <div className="flex flex-col items-center w-full px-0.5 mt-1.5">
                <span className="text-[11.5px] font-semibold text-slate-800 truncate w-full text-center group-hover:text-primary-600 transition-colors">
                  {user.nickname || 'User'}
                </span>
                {user.relationship && user.relationship !== 'suggested' && user.relationship !== 'recent' && (
                  <span className="text-[9.5px] font-semibold text-slate-400 truncate leading-tight capitalize">
                    {user.relationship}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
