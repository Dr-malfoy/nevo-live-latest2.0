import { useEffect, useState } from 'react';
import { PiClockFill as Clock, PiQuestionFill as HelpCircle, PiSlidersFill as Settings2, PiXBold as X } from 'react-icons/pi';
import { partyApi, type PkRank, type PkType, type PkTypeCard } from '../../api/party.api';
import { optional } from '../../api/pending';
import { useUIStore } from '../../stores';

interface PkTypesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

/**
 * Requirement #19 — the PK Types bottom sheet.
 *
 * Three modes; Random PK is selected by default, as in the reference.
 * `/api/pk/*` is specified in BACKEND-GUIDE.md §4.9 and not built yet, so the
 * cards render from the documented defaults and starting a battle reports that
 * it isn't connected rather than failing silently.
 */

const FALLBACK_TYPES: PkTypeCard[] = [
  { type: 'friend', title: 'Friend PK', subtitle: '1v1', emoji: '🎉' },
  { type: 'random', title: 'Random PK', subtitle: '1v1 with Gift', emoji: '🎁', isDefault: true },
  { type: 'team', title: 'Team PK', subtitle: 'Team of 3', emoji: '⚡' },
];

export const PkTypesSheet = ({ isOpen, onClose }: PkTypesSheetProps) => {
  const showToast = useUIStore((s) => s.showToast);

  const [types, setTypes] = useState<PkTypeCard[]>(FALLBACK_TYPES);
  const [rank, setRank] = useState<PkRank | null>(null);
  const [selected, setSelected] = useState<PkType>('random');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    Promise.all([
      optional(partyApi.getPkTypes()).catch(() => null),
      optional(partyApi.getPkRank()).catch(() => null),
    ]).then(([t, r]) => {
      if (cancelled) return;
      if (t?.success && t.data?.length) {
        setTypes(t.data);
        setSelected(t.data.find((x) => x.isDefault)?.type ?? t.data[0].type);
      }
      setRank(r?.data ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const start = async () => {
    setStarting(true);
    try {
      const request =
        selected === 'random'
          ? partyApi.matchPk('random')
          : selected === 'team'
            ? partyApi.teamPk([])
            : partyApi.matchPk('friend');

      const res = await optional(request);
      if (res === null) {
        showToast('PK battles are not connected yet', 'info');
        return;
      }
      if (res.success) {
        showToast('Looking for an opponent…', 'success');
        onClose();
      } else {
        showToast(res.error || 'Could not start a PK', 'error');
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-sheet animate-slide-up safe-bottom">
        {/* Header (#19A) */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-line">
          <h3 className="text-base font-bold text-ink">PK Types</h3>
          <div className="flex items-center gap-1">
            <button aria-label="Help" className="w-8 h-8 flex items-center justify-center text-ink-muted">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button aria-label="History" className="w-8 h-8 flex items-center justify-center text-ink-muted">
              <Clock className="w-5 h-5" />
            </button>
            <button aria-label="Settings" className="relative w-8 h-8 flex items-center justify-center text-ink-muted">
              <Settings2 className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-live" />
            </button>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Rank row (#19B) */}
        <div className="flex items-center gap-2.5 mx-4 mt-4 px-3 py-2.5 rounded-card bg-surface-sunken">
          <span className="h-[18px] px-1.5 rounded bg-status-live text-white text-[9px] font-bold flex items-center">
            NEW
          </span>
          <span className="w-8 h-8 rounded-full bg-ink-ghost/30 text-ink-muted flex items-center justify-center text-sm font-bold">
            R
          </span>
          <span className="flex-1 text-sm text-ink-soft">{rank?.tier ?? 'No Rank'}</span>
          {rank?.points ? (
            <span className="text-sm font-bold text-ink tabular-nums">{rank.points}</span>
          ) : null}
        </div>

        {/* Three mode cards (#19C) */}
        <div className="flex gap-2.5 px-4 pt-4 overflow-x-auto no-scrollbar">
          {types.map((card) => {
            const active = card.type === selected;
            return (
              <button
                key={card.type}
                onClick={() => setSelected(card.type)}
                className={`w-[122px] shrink-0 rounded-card p-3 text-left border-2 transition-colors ${
                  active ? 'border-[#6B7AFF] bg-[#EEF1FF]' : 'border-transparent bg-surface-sunken'
                }`}
              >
                <span className="text-2xl leading-none">{card.emoji ?? '⚔️'}</span>
                <p className="font-bold text-ink text-sm mt-2">{card.title}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{card.subtitle}</p>
              </button>
            );
          })}
        </div>

        <div className="px-4 py-4">
          <button
            onClick={start}
            disabled={starting}
            className="w-full h-12 btn-primary disabled:opacity-50"
          >
            {starting ? 'Starting…' : `Start ${types.find((t) => t.type === selected)?.title ?? 'PK'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
