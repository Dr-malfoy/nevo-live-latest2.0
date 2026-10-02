import { useState, useEffect } from 'react';
import {
  PiXBold as X,
  PiChatCircleDotsFill as ThoughtIcon,
  PiClockFill as Clock,
  PiTrashFill as Trash,
  PiSparkleFill as Sparkle,
} from 'react-icons/pi';
import { noteApi, type NoteItem } from '../../api';
import { useUIStore } from '../../stores';
import { Avatar } from '../user';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteUpdated: () => void;
  existingNote?: NoteItem | null;
  currentUser?: {
    _id: string;
    nickname: string;
    avatar?: string;
  } | null;
}

const QUICK_EMOJIS = ['💭', '✨', '🔥', '☕', '🎧', '💡', '🚀', '💫', '🎉', '😎', '🌸', '🎮', '🍕', '💪', '❤️', '🌙', '👀'];

export const CreateNoteModal = ({
  isOpen,
  onClose,
  onNoteUpdated,
  existingNote,
  currentUser,
}: CreateNoteModalProps) => {
  const showToast = useUIStore((s) => s.showToast);

  const [text, setText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💭');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (existingNote) {
      setText(existingNote.text || '');
      setSelectedEmoji(existingNote.emoji || '💭');
    } else {
      setText('');
      setSelectedEmoji('💭');
    }
  }, [existingNote, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!text.trim()) {
      showToast('Please type a thought for your note', 'info');
      return;
    }

    setSubmitting(true);
    try {
      await noteApi.createOrUpdateNote({
        text: text.trim(),
        emoji: selectedEmoji,
      });

      showToast('Note posted! Visible for 24 hours 💬', 'success');
      onNoteUpdated();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to save note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await noteApi.deleteNote();
      showToast('Note removed', 'success');
      onNoteUpdated();
      onClose();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to delete note', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <ThoughtIcon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-base text-ink">
                {existingNote ? 'Your Active Note' : 'Share a Note'}
              </h3>
              <p className="text-[11px] text-ink-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" /> Disappears after 24 hours
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

        {/* Note Interactive Preview */}
        <div className="p-6 flex flex-col items-center bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="relative flex flex-col items-center">
            {/* Thought Bubble floating above avatar */}
            <div className="mb-2 max-w-[220px] px-3.5 py-2 rounded-2xl bg-white border border-indigo-100 shadow-md shadow-indigo-100/50 flex items-center gap-2 animate-bounce duration-1000 relative">
              <span className="text-xl shrink-0 select-none">{selectedEmoji}</span>
              <span className="text-xs font-bold text-ink truncate">
                {text.trim() || 'Share what is on your mind…'}
              </span>
              {/* Bubble Tail */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-indigo-100 rotate-45" />
            </div>

            {/* User Avatar */}
            <div className="mt-1">
              <Avatar
                src={currentUser?.avatar}
                nickname={currentUser?.nickname || 'You'}
                size="lg"
                className="ring-4 ring-indigo-50"
              />
            </div>
          </div>
        </div>

        {/* Input & Emojis */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                Note Message
              </label>
              <span className={`text-[11px] font-bold ${text.length > 50 ? 'text-amber-500' : 'text-ink-faint'}`}>
                {text.length}/60
              </span>
            </div>
            <input
              type="text"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 60))}
              placeholder="What's on your mind? (max 60 chars)"
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 text-sm text-ink placeholder:text-ink-muted border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              Choose an Emoji
            </label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform ${
                    selectedEmoji === emoji
                      ? 'bg-indigo-50 ring-2 ring-indigo-500 scale-110 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50">
          {existingNote && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3.5 py-3 rounded-2xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 transition-all text-xs font-bold flex items-center justify-center"
              title="Delete current note"
            >
              <Trash className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-ink active:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-xs font-black text-white shadow-md shadow-indigo-600/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Saving Note…' : existingNote ? 'Update Note' : 'Share Note (24h)'}
          </button>
        </div>
      </div>
    </div>
  );
};
