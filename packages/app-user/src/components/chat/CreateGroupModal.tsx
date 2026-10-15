import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiMagnifyingGlassBold as Search,
  PiCheckBold as Check,
  PiXBold as X,
  PiUsersThreeFill as UsersGroup,
  PiChatCircleFill as ChatIcon,
  PiVideoCameraFill as Video,
  PiSparkleFill as Sparkles,
  PiCameraFill as CameraIcon,
} from 'react-icons/pi';
import { usersApi, chatApi, uploadApi } from '../../api';
import { Avatar, LevelBadge } from '../user';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

export interface PickedMember {
  _id: string;
  nickname: string;
  avatar?: string;
  uid?: string;
  level?: number;
}

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSuggestedUsers?: PickedMember[];
  onStartCall?: (users: PickedMember[]) => void;
}

export const CreateGroupModal = ({
  isOpen,
  onClose,
  initialSuggestedUsers = [],
  onStartCall,
}: CreateGroupModalProps) => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickedMember[]>([]);
  const [selected, setSelected] = useState<PickedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Clear state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setGroupAvatar('');
      setQuery('');
      setSelected([]);
      setResults(initialSuggestedUsers);
    }
  }, [isOpen, initialSuggestedUsers]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults(initialSuggestedUsers);
      return;
    }
    setSearching(true);
    try {
      const { data } = await usersApi.searchUsers(query.trim(), { limit: 20 });
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (user: PickedMember) => {
    setSelected((prev) => {
      if (prev.some((p) => p._id === user._id)) {
        return prev.filter((p) => p._id !== user._id);
      }
      if (prev.length >= 30) {
        showToast('Maximum 30 members allowed in a group', 'info');
        return prev;
      }
      return [...prev, user];
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size should be less than 10MB', 'error');
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadApi.upload(file, 'group-avatars');
      setGroupAvatar(url);
      showToast('Group photo uploaded', 'success');
    } catch {
      showToast('Failed to upload picture', 'error');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCreateGroup = async () => {
    if (selected.length === 0) {
      showToast('Select at least 1 member to create a group', 'error');
      return;
    }

    setCreating(true);
    try {
      const memberIds = selected.map((u) => u._id);
      const name = groupName.trim() || undefined;

      const { data } = await chatApi.createGroupChat({
        memberIds,
        name,
        avatar: groupAvatar || undefined,
      });

      if (data.success && data.data?._id) {
        showToast('Group chat created!', 'success');
        onClose();
        navigate(`/chat/${data.data._id}`);
      } else {
        showToast('Could not create group chat', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to create group chat', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleGroupCall = () => {
    if (selected.length === 0) {
      showToast('Select at least 1 member for the call', 'error');
      return;
    }
    onClose();
    if (onStartCall) {
      onStartCall(selected);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-rose-50/60 via-white to-pink-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <UsersGroup className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Create Group Chat</h2>
              <p className="text-xs text-slate-500">Chat & call with friends together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Group Picture Picker */}
          <div className="flex flex-col items-center justify-center">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="relative w-16 h-16 rounded-2xl cursor-pointer group/avatar overflow-hidden shadow-md shadow-rose-500/20 ring-2 ring-rose-200 hover:ring-rose-400 transition-all flex items-center justify-center bg-gradient-to-tr from-rose-500 to-pink-500 text-white"
            >
              {groupAvatar ? (
                <img
                  src={getMediaUrl(groupAvatar)}
                  alt="Group"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UsersGroup className="w-8 h-8 text-white" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold">
                <CameraIcon className="w-4 h-4 mb-0.5" />
                <span>Photo</span>
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                  <span>...</span>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className="mt-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 active:scale-95 transition-transform"
            >
              <CameraIcon className="w-3.5 h-3.5" />
              <span>{uploadingAvatar ? 'Uploading...' : groupAvatar ? 'Change Photo' : 'Add Group Photo'}</span>
            </button>
            {groupAvatar && (
              <button
                type="button"
                onClick={() => setGroupAvatar('')}
                className="text-[10px] text-red-500 hover:underline"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Group Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
              <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Friends Zone, Gaming Squad, Adda..."
                maxLength={40}
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Member Search Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Members
            </label>
            <div className="flex items-center gap-2 px-3 h-10 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value.trim()) setResults(initialSuggestedUsers);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search user by UID, nickname..."
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold transition-all disabled:opacity-50"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Selected Member Chips */}
          {selected.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">
                  Selected Members ({selected.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-[11px] text-rose-600 font-semibold hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {selected.map((user) => (
                  <span
                    key={user._id}
                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-900 text-xs font-semibold shadow-2xs animate-in zoom-in-95 duration-150"
                  >
                    <Avatar src={user.avatar} nickname={user.nickname} size="xs" />
                    <span className="truncate max-w-[90px]">{user.nickname}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelect(user)}
                      className="w-3.5 h-3.5 rounded-full hover:bg-rose-200/60 flex items-center justify-center text-rose-500"
                    >
                      <X className="w-2.5 h-2.5 stroke-[3]" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search / Suggestions User List */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {query.trim() ? 'Search Results' : 'Suggested Contacts'}
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
              {results.length > 0 ? (
                results.map((u) => {
                  const isChecked = selected.some((s) => s._id === u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleSelect(u)}
                      className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-rose-50/80 border border-rose-200/80 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <Avatar src={u.avatar} nickname={u.nickname} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-900 truncate">{u.nickname}</p>
                          {typeof u.level === 'number' && u.level > 0 && <LevelBadge level={u.level} />}
                        </div>
                        {u.uid && <p className="text-[10px] text-slate-400">UID: {u.uid}</p>}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isChecked
                            ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {searching ? 'Searching users...' : query.trim() ? 'No users found matching query' : 'Search above to find users to add'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            disabled={selected.length === 0 || creating}
            onClick={handleCreateGroup}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-sm shadow-md shadow-rose-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChatIcon className="w-4 h-4" />
            <span>{creating ? 'Creating Group...' : `Create Group Chat (${selected.length})`}</span>
          </button>

          {onStartCall && selected.length > 0 && (
            <button
              type="button"
              onClick={handleGroupCall}
              className="w-full h-9 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5 text-rose-500" />
              <span>Or Start Group Video Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
