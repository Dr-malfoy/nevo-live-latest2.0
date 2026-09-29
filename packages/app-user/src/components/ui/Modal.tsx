import { ReactNode, useEffect } from 'react';
import { PiXBold as X } from 'react-icons/pi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
      {/* Scrim stays dark — it is a dimmer, not a surface. */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-sheet w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-card-hover animate-slide-up">
        <div className="flex items-center justify-between px-4 h-14 border-b border-line">
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 hover:bg-surface-sunken rounded-full transition-colors text-ink-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
