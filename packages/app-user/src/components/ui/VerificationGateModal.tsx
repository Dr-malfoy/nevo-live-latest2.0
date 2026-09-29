import { useNavigate } from 'react-router-dom';
import { PiLockFill as Lock, PiSealCheckFill as BadgeCheck, PiCameraFill as Camera, PiCreditCardFill as CreditCard } from 'react-icons/pi';
import { Modal } from './Modal';

interface VerificationGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'face' | 'nid' | 'general';
  title?: string;
  message?: string;
}

/**
 * Shown when an unverified user taps a restricted action:
 * - Live face verification required for: Go Live, Party rooms, Chat messages, Moments
 * - NID verification required for: Trading coins, Buying & Selling diamonds
 */
export const VerificationGateModal = ({
  isOpen,
  onClose,
  type = 'face',
  title,
  message,
}: VerificationGateModalProps) => {
  const navigate = useNavigate();

  const isFace = type === 'face';
  const isNid = type === 'nid';

  const defaultTitle = isFace
    ? 'Live Face Verification Required'
    : isNid
    ? 'NID Verification Required'
    : 'Verification Required';

  const defaultMessage = isFace
    ? 'You must complete Live Face Verification to go Live, host Party rooms, send messages, and post Moments. Verification is fast and automatic!'
    : isNid
    ? 'NID Verification is required to trade coins and buy/sell diamonds. Please submit your Government NID to unlock financial & trading features.'
    : 'You need to verify your account before accessing this feature.';

  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={displayTitle}>
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${
          isFace
            ? 'bg-purple-50 border-purple-200 text-purple-600'
            : isNid
            ? 'bg-amber-50 border-amber-200 text-amber-600'
            : 'bg-sky-50 border-sky-200 text-sky-600'
        }`}>
          {isFace ? (
            <Camera className="w-8 h-8" />
          ) : isNid ? (
            <CreditCard className="w-8 h-8" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        <p className="text-sm text-ink-muted leading-relaxed px-2">
          {displayMessage}
        </p>

        <div className="w-full space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              navigate(`/verification${isFace ? '?tab=face' : isNid ? '?tab=nid' : ''}`);
            }}
            className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-white shadow-md transition-all active:scale-[0.99] ${
              isFace
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/25'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
            }`}
          >
            <BadgeCheck className="w-5 h-5" />
            {isFace ? 'Verify Live Face Now' : isNid ? 'Verify NID Now' : 'Verify Now'}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </Modal>
  );
};
