import { PiBellRingingFill as BellRing, PiCurrencyDollarSimpleFill as CircleDollarSign, PiChatTeardropFill as MessageSquare, PiUserPlusFill as UserPlus, PiWalletFill as Wallet } from 'react-icons/pi';
import type { OfficialChatRow } from '../../api/chat.api';
import { timeAgo } from '../../lib/time';

interface OfficialRowProps {
  row: OfficialChatRow;
  onClick: () => void;
}

/**
 * Requirement #16C / #65 — the four coloured official inbox rows.
 * Each key gets its own icon and tint so they stay recognisable at a glance.
 */
const STYLES: Record<string, { Icon: typeof MessageSquare; tint: string }> = {
  system: { Icon: MessageSquare, tint: 'bg-[#3B82F6]' },
  arrival_notice: { Icon: CircleDollarSign, tint: 'bg-[#A855F7]' },
  new_followers: { Icon: UserPlus, tint: 'bg-[#14B8A6]' },
  income_reminder: { Icon: Wallet, tint: 'bg-[#10B981]' },
};

export const OfficialRow = ({ row, onClick }: OfficialRowProps) => {
  const { Icon, tint } = STYLES[row.key] ?? { Icon: BellRing, tint: 'bg-ink-ghost' };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white active:bg-surface-sunken transition-colors text-left"
    >
      <span className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
        <Icon className="w-6 h-6 text-white" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-ink truncate">{row.title}</span>
          <span className="shrink-0 text-[10px] font-bold text-role-official bg-role-official/10 px-1.5 py-0.5 rounded">
            Official
          </span>
        </div>
        <p className="text-sm text-ink-muted truncate mt-0.5">{row.subtitle}</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[11px] text-ink-faint">{timeAgo(row.time)}</span>
        {row.unread > 0 && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-status-live text-white text-[11px] font-bold flex items-center justify-center">
            {row.unread > 99 ? '99+' : row.unread}
          </span>
        )}
      </div>
    </button>
  );
};
