import React, { useState, useEffect } from 'react';
import {
  PiXBold as CloseIcon,
  PiArrowsOutSimpleBold as ExpandIcon,
  PiArrowsInSimpleBold as CollapseIcon,
  PiPencilSimpleBold as EditIcon,
  PiDownloadSimpleBold as DownloadIcon,
} from 'react-icons/pi';
import { Avatar } from '../user';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  avatar?: string;
  nickname?: string;
  onClose: () => void;
  onEdit?: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Image Preview',
  subtitle,
  avatar,
  nickname,
  onClose,
  onEdit,
}) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [ratioLabel, setRatioLabel] = useState<string>('');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDimensions(null);
      setRatioLabel('');
      setIsZoomed(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w && h) {
      setDimensions({ width: w, height: h });
      const ratio = w / h;
      if (Math.abs(ratio - 1) < 0.05) {
        setRatioLabel('1:1 Square');
      } else if (Math.abs(ratio - 16 / 9) < 0.06) {
        setRatioLabel('16:9 Landscape');
      } else if (Math.abs(ratio - 9 / 16) < 0.06) {
        setRatioLabel('9:16 Portrait');
      } else if (Math.abs(ratio - 4 / 3) < 0.06) {
        setRatioLabel('4:3 Standard');
      } else if (Math.abs(ratio - 3 / 4) < 0.06) {
        setRatioLabel('3:4 Portrait');
      } else {
        setRatioLabel(`${w} × ${h}`);
      }
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `photo_${Date.now()}`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col justify-between select-none animate-fade-in"
      onClick={onClose}
    >
      {/* ── Top Bar ── */}
      <div
        className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-b from-black/80 to-transparent text-white z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          {avatar && (
            <Avatar src={avatar} nickname={nickname || 'User'} size="sm" ringed />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm sm:text-base text-white truncate drop-shadow">
                {title}
              </span>
              {ratioLabel && (
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/90 text-[10px] font-bold backdrop-blur-md border border-white/20 whitespace-nowrap">
                  {ratioLabel}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-white/60 truncate drop-shadow">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onEdit();
              }}
              className="h-8 px-3 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md backdrop-blur-md"
              title="Change / Edit Photo"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change Photo</span>
            </button>
          )}

          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-md"
            title={isZoomed ? 'Zoom Out' : 'Zoom In'}
          >
            {isZoomed ? (
              <CollapseIcon className="w-4 h-4" />
            ) : (
              <ExpandIcon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDownload}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-md"
            title="Download / Open Full Image"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:scale-95 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-md"
            aria-label="Close Preview"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Image Display (Preserves 100% Original Ratio Without Cropping) ── */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center max-w-full max-h-full">
          <img
            src={imageUrl}
            alt={title}
            onLoad={handleImageLoad}
            onClick={() => setIsZoomed(!isZoomed)}
            className={`transition-all duration-300 rounded-xl shadow-2xl object-contain select-none ${
              isZoomed
                ? 'scale-125 sm:scale-150 cursor-zoom-out max-h-none max-w-none'
                : 'max-h-[82vh] max-w-[95vw] w-auto h-auto cursor-zoom-in'
            }`}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div
        className="px-4 py-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-xs text-white/60 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <span>
          {dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'Loading ratio...'}
        </span>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white font-medium hover:underline text-[11px]"
        >
          Tap anywhere to close
        </button>
      </div>
    </div>
  );
};
