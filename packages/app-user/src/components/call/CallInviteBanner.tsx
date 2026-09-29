import { motion, AnimatePresence } from 'framer-motion';
import { PiPhoneCallFill as PhoneCall, PiPhoneSlashFill as PhoneOff, PiUsersFill as Users } from 'react-icons/pi';
import { Avatar } from '../user';

export interface IncomingGroupInvite {
  callId: string;
  channel: string;
  type: 'audio' | 'video';
  initiatorId: string;
  token: string;
  initiator?: { nickname: string; avatar?: string } | null;
  participantCount?: number;
  maxParticipants?: number;
}

interface CallInviteBannerProps {
  invite: IncomingGroupInvite | null;
  onAccept: (invite: IncomingGroupInvite) => void;
  onDecline: (invite: IncomingGroupInvite) => void;
}

/**
 * In-app banner for incoming group-call invites (shown globally so a group
 * invite is never missed when the user isn't inside that chat thread).
 */
export const CallInviteBanner = ({ invite, onAccept, onDecline }: CallInviteBannerProps) => (
  <AnimatePresence>
    {invite && (
      <motion.div
        key={invite.callId}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="fixed top-4 inset-x-4 z-[120] mx-auto max-w-sm rounded-2xl bg-dark-800/95 backdrop-blur-md border border-primary-500/30 shadow-card p-4"
        role="alert"
        aria-label="Incoming group call"
      >
        <div className="flex items-center gap-3">
          <Avatar src={invite.initiator?.avatar} nickname={invite.initiator?.nickname || '?'} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">
              {invite.initiator?.nickname || 'Someone'} invited you
            </p>
            <p className="text-xs text-dark-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {invite.type === 'video' ? 'Video' : 'Audio'} call · {invite.participantCount || '?'}/
              {invite.maxParticipants || 10} members
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onDecline(invite)}
            aria-label="Decline group call"
            className="flex-1 py-2.5 rounded-xl bg-dark-700 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <PhoneOff className="w-4 h-4 text-red-400" /> Decline
          </button>
          <button
            onClick={() => onAccept(invite)}
            aria-label="Accept group call"
            className="flex-1 py-2.5 rounded-xl bg-green-600 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <PhoneCall className="w-4 h-4" /> Join
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
