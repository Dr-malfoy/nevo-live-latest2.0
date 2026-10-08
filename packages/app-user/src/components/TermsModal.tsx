import React, { useState } from 'react';
import { PiCheckBold, PiFileTextFill, PiXBold } from 'react-icons/pi';
import { legalDocs } from '../content/legal';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  subtitle?: string;
  actionText?: string;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  title = 'Terms & Conditions',
  subtitle = 'Please review and accept our Terms & Conditions before creating your account.',
  actionText = 'Accept & Continue',
}) => {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!agreed) return;
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-ink w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-line animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-surface-sunken">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4C3BFF]/10 text-[#4C3BFF] flex items-center justify-center shrink-0">
              <PiFileTextFill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">{title}</h2>
              <p className="text-xs text-ink-muted leading-tight mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-line/50 hover:bg-line text-ink-muted flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <PiXBold className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs text-ink-muted leading-relaxed">
          <div className="p-3 bg-brand/5 border border-brand/20 rounded-2xl text-brand text-[11px] font-medium">
            By creating an account, you confirm that you are at least 13 years of age and agree to comply with our platform policies and community standards.
          </div>

          {legalDocs.terms.sections.map((section, idx) => (
            <div key={idx} className="border border-line/60 rounded-2xl p-3.5 bg-surface-card space-y-1">
              <h3 className="font-bold text-ink text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4C3BFF]"></span>
                {section.heading}
              </h3>
              <p className="text-ink-muted whitespace-pre-line text-[11px] leading-normal pl-3">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer & Agreement Checkbox */}
        <div className="p-5 border-t border-line bg-surface-sunken space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                agreed
                  ? 'bg-[#4C3BFF] border-[#4C3BFF] text-white shadow-xs'
                  : 'border-line-strong bg-white hover:border-[#4C3BFF]'
              }`}
            >
              {agreed && <PiCheckBold className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <span className="text-xs text-ink font-medium leading-snug">
              I have read, understood, and agree to the <strong className="text-ink font-bold">Terms & Conditions</strong> and <strong className="text-ink font-bold">Privacy Policy</strong>.
            </span>
          </label>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-line bg-white hover:bg-surface-sunken text-ink font-bold text-xs transition-colors"
            >
              Decline & Cancel
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!agreed}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
                agreed
                  ? 'bg-[#4C3BFF] hover:bg-[#3D2DE0] shadow-[#4C3BFF]/30 cursor-pointer active:scale-98'
                  : 'bg-gray-300 opacity-60 cursor-not-allowed shadow-none'
              }`}
            >
              {actionText}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
