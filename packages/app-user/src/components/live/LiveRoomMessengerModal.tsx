import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiPaperPlaneRightFill as Send, PiChatTeardropDotsBold as ChatIcon, PiUserBold as UserIcon } from 'react-icons/pi';
import { Avatar } from '../user';
import { chatApi } from '../../api';
import { useUIStore } from '../../stores';

interface ViewerUser {
  userId: string;
  nickname: string;
  avatar?: string;
  level?: number;
}

interface LiveRoomMessengerModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  viewers: ViewerUser[];
  onOpenDirectChat?: (userId: string) => void;
  streamTitle?: string;
}

export const LiveRoomMessengerModal: React.FC<LiveRoomMessengerModalProps> = ({
  open,
  isOpen,
  onClose,
  viewers = [],
  onOpenDirectChat,
  streamTitle,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [selectedUser, setSelectedUser] = useState<ViewerUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const isModalOpen = Boolean(isOpen ?? open);
  if (!isModalOpen) return null;

  const handleSendDirectMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    setSending(true);
    try {
      // 1. Get or create 1:1 chat thread
      const res = await chatApi.getOrCreateChat(selectedUser.userId);
      const chatId = res.data.data?._id || (res.data as any)?._id;
      if (chatId) {
        // 2. Send message straight to inbox
        await chatApi.sendMessage(chatId, messageText.trim());
        showToast(`Message sent to ${selectedUser.nickname}'s inbox!`, 'success');
        setMessageText('');
        setSelectedUser(null);
      } else {
        throw new Error('Could not find chat thread');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to send message to user inbox', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#151326]/95 border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 text-white z-10 backdrop-blur-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                <ChatIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">In-Room Messenger</h3>
                <p className="text-xs text-white/50">Send direct inbox message to live viewers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User selector or list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[260px]">
            {viewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/40 text-sm gap-2">
                <UserIcon className="w-8 h-8 opacity-40" />
                <p>No other active viewers in the room</p>
              </div>
            ) : (
              viewers.map((u) => {
                const isSelected = selectedUser?.userId === u.userId;
                return (
                  <div
                    key={u.userId}
                    onClick={() => setSelectedUser(u)}
                    className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={u.avatar}
                        nickname={u.nickname}
                        size="sm"
                        className="w-10 h-10 rounded-full border border-white/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{u.nickname}</p>
                          {u.level && (
                            <span className="px-1.5 py-0.2 rounded-md bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[9px] font-black shrink-0">
                              Lv.{u.level}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 truncate">Tap to message inbox</p>
                      </div>
                    </div>
                    {onOpenDirectChat && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onOpenDirectChat(u.userId);
                        }}
                        className="text-[11px] text-purple-300 font-semibold hover:underline px-2 py-1"
                      >
                        Open Chat
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Message Input for selected user */}
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2 border-t border-white/10 flex flex-col gap-2 shrink-0"
            >
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>
                  Message to <strong className="text-white">{selectedUser.nickname}</strong>:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-pink-400 hover:underline text-[11px]"
                >
                  Change User
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !sending && handleSendDirectMessage()}
                  placeholder="Type inbox message..."
                  className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  disabled={!messageText.trim() || sending}
                  onClick={handleSendDirectMessage}
                  className="w-10 h-10 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white disabled:opacity-40 shadow-lg shadow-purple-500/30 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
