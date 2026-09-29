import { motion, AnimatePresence } from 'framer-motion';
import { PiVideoCameraFill as Video, PiVideoCameraSlashFill as VideoOff } from 'react-icons/pi';

interface HostCameraPreviewProps {
  cameraOn: boolean;
}

/** Small always-visible glass pill showing the host's camera state. */
export const HostCameraPreview = ({ cameraOn }: HostCameraPreviewProps) => (
  <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20">
    <AnimatePresence mode="wait">
      <motion.div
        key={cameraOn ? 'on' : 'off'}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={`glass-chip flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold ${
          cameraOn ? 'text-emerald-300' : 'text-red-400'
        }`}
        role="status"
      >
        {cameraOn ? (
          <>
            <Video className="w-3 h-3" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Camera On
          </>
        ) : (
          <>
            <VideoOff className="w-3 h-3" />
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Camera Off
          </>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
);
