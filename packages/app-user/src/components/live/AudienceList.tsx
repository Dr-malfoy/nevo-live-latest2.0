import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiXBold as X, PiUsersFill as Users } from 'react-icons/pi';
import { Avatar } from '../user';
import { streamsApi } from '../../api';

export interface Viewer {
  userId: string;
  nickname: string;
  avatar?: string;
  level?: number;
  wealthLevel?: number;
  liveLevel?: number;
  diamonds?: number;
  coins?: number;
  isVip?: boolean;
  noble?: { type: string; expiry: string | Date };
}

interface AudienceListProps {
  open: boolean;
  streamId?: string;
  viewers: Viewer[];
  onClose: () => void;
  onViewerClick?: (viewer: Viewer) => void;
}

export const AudienceList = ({ open, streamId, viewers: initialViewers, onClose, onViewerClick }: AudienceListProps) => {
  const [apiViewers, setApiViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // When audience modal opens, fetch the full active viewer list with complete levels from DB
  useEffect(() => {
    if (open && streamId) {
      setLoading(true);
      streamsApi.getViewers(streamId)
        .then(({ data }) => {
          if (data?.success && Array.isArray(data.data)) {
            setApiViewers(data.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, streamId]);

  // Merge initial (socket/chat) viewers with API viewers, prioritising richer level data
  const mergedViewers = (() => {
    const map = new Map<string, Viewer>();
    // First seed with props
    for (const v of initialViewers) {
      if (v.userId) map.set(v.userId, v);
    }
    // Overlay with API viewers
    for (const v of apiViewers) {
      if (v.userId) {
        const existing = map.get(v.userId);
        map.set(v.userId, {
          ...existing,
          ...v,
          diamonds: v.diamonds !== undefined ? v.diamonds : existing?.diamonds,
          coins: v.coins !== undefined ? v.coins : existing?.coins,
          level: v.level || existing?.level || 1,
          wealthLevel: v.wealthLevel || existing?.wealthLevel || v.level || 1,
          liveLevel: v.liveLevel || existing?.liveLevel || v.level || 1,
          isVip: Boolean(v.isVip || existing?.isVip || (v.diamonds && v.diamonds > 0) || (existing?.diamonds && existing.diamonds > 0)),
        });
      }
    }
    return [...map.values()];
  })();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Viewers"
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#181528] text-white border-t sm:border border-white/10 shadow-2xl p-4 pb-8 max-h-[70dvh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-pink-400" />
                <span>Audience</span>
                <span className="text-xs text-white/60 font-semibold px-2 py-0.5 rounded-full bg-white/10">
                  {mergedViewers.length}
                </span>
              </h3>
              <button
                onClick={onClose}
                aria-label="Close viewers"
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer list */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
              <AnimatePresence>
                {mergedViewers.map((v, index) => {
                  return (
                    <motion.div
                      key={v.userId || index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => onViewerClick?.(v)}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-colors cursor-pointer"
                    >
                      {/* Left: Avatar + Nickname */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative">
                          <Avatar
                            src={v.avatar}
                            nickname={v.nickname}
                            size="sm"
                            className="!w-10 !h-10 text-xs rounded-full border border-white/20"
                          />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-bold truncate text-white">
                            {v.nickname || 'Viewer'}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {index === 0 ? 'Top viewer' : `Viewer #${index + 1}`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {mergedViewers.length === 0 && !loading && (
                <div className="text-center text-white/40 text-sm py-12 flex flex-col items-center gap-2">
                  <Users className="w-8 h-8 opacity-40 text-pink-400" />
                  <p>No viewers yet — waiting for audience to join!</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
