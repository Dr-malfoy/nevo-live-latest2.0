import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PiVideoCameraFill as Video, PiLightningFill as Zap } from 'react-icons/pi';
import { streamsApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { VerificationGateModal } from '../ui';
import { canUseCreatorFeatures } from '../../services/verification';

/**
 * Floating "Go Live" action button.
 *
 * - Icon-only (no text label).
 * - Gradient background + glow + subtle pulse ring.
 * - Click flow: auth check → verification gate → active-session check → Go Live setup screen.
 *   Never bypasses the backend live validation (createStream enforces rules).
 */
export const GoLiveFab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [checking, setChecking] = useState(false);
  const [showGate, setShowGate] = useState(false);

  const handleClick = async () => {
    if (checking) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Creator gate — unverified hosts/agents are blocked up front.
    if (!canUseCreatorFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    setChecking(true);
    try {
      const { data } = await streamsApi.getMyActiveStream();
      if (data.success && data.data?._id) {
        showToast('You are already live on another session', 'info');
        navigate(`/live/${data.data._id}`, { replace: true });
        return;
      }
      navigate('/go-live');
    } catch {
      // Network hiccup — still allow navigating to the setup screen;
      // the backend re-checks active sessions at create time.
      navigate('/go-live');
    } finally {
      setChecking(false);
    }
  };

  if (location.pathname !== '/') return null;

  return (
    <div className="fixed z-30 pointer-events-none" style={{ right: 'max(1rem, calc(50vw - 12.5rem + 1rem))', bottom: '5.5rem' }}>
      <div className="relative pointer-events-auto flex flex-col items-end gap-3">
        {/* Match Button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.06 }}
          onClick={() => navigate(isAuthenticated ? '/match' : '/login')}
          className="relative h-12 px-5 rounded-full bg-gradient-to-r from-[#ff4f7a] to-[#ff2851] flex items-center justify-center shadow-card-hover text-white font-bold text-[16px] gap-2"
        >
          <Zap className="w-5 h-5 text-white" />
          <span>1:1</span>
        </motion.button>

        {/* Live Button */}
        <div className="relative">
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-accent-500/25 animate-pulse-ring" aria-hidden="true" />
          
          <motion.button
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.06 }}
            onClick={handleClick}
            aria-label="Go Live"
            title="Go Live"
            className="relative h-12 px-5 rounded-full bg-gradient-to-r from-[#ff4f7a] to-[#ff2851] flex items-center justify-center shadow-card-hover text-white font-bold text-[16px] gap-2"
          >
            <Video className="w-5 h-5 text-white" />
            <span>LIVE</span>
          </motion.button>
        </div>
      </div>

      <VerificationGateModal isOpen={showGate} onClose={() => setShowGate(false)} />
    </div>
  );
};
