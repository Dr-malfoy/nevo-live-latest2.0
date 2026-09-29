import { PiCrownFill as Crown, PiGiftFill as Gift, PiLockFill as Lock, PiMicrophoneSlashFill as MicOff, PiPlusBold as Plus, PiArmchairFill as Armchair } from 'react-icons/pi';
import type { RoomSeat } from '../../api/party.api';
import type { UserPublic } from '../../types';
import { compactNumber, initial } from '../../lib/time';

interface SeatBoardProps {
  host?: UserPublic | null;
  seats: RoomSeat[];
  seatCount: number;
  onSeatPress: (seat: RoomSeat) => void;
  onHostPress?: () => void;
}

const ROWS = [2, 3, 5, 5];

const SeatSlot = ({ seat, onPress }: { seat: RoomSeat; onPress: () => void }) => {
  const occupant = seat.userId && typeof seat.userId === 'object' ? seat.userId : null;
  const giftVal = seat.giftValue ?? 0;

  return (
    <button
      onClick={onPress}
      className="flex flex-col items-center gap-1 w-[56px] shrink-0"
      aria-label={occupant ? `Seat ${seat.index}: ${occupant.nickname}` : `Empty seat ${seat.index}`}
    >
      <span className="relative">
        <span
          className={`w-[48px] h-[48px] rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-95 ${
            occupant
              ? 'bg-white/10 ring-2 ring-purple-400/60 shadow-md'
              : 'bg-white/10 border border-white/20'
          }`}
        >
          {occupant ? (
            occupant.avatar ? (
              <img src={occupant.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-sm font-bold">
                {initial(occupant.nickname)}
              </span>
            )
          ) : seat.isLocked ? (
            <Lock className="w-4 h-4 text-white/40" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-0.5">
              <Armchair className="w-4 h-4 text-white/40" />
              <span className="text-[9px] font-bold text-white/60">{seat.index}</span>
            </div>
          )}
        </span>

        {!occupant && !seat.isLocked && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center shadow">
            <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </span>
        )}
        {occupant && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-black/60 border border-white/30 flex items-center justify-center">
            {seat.isMuted ? (
              <MicOff className="w-2.5 h-2.5 text-red-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </span>
        )}
      </span>

      <span className="text-[10px] text-white/90 font-medium truncate w-full text-center leading-tight">
        {occupant ? occupant.nickname : `Seat ${seat.index}`}
      </span>

      <span className="text-[9px] text-pink-300 font-bold flex items-center gap-0.5 leading-none">
        <Gift className="w-2.5 h-2.5 text-pink-400 shrink-0" />
        {compactNumber(giftVal)}
      </span>
    </button>
  );
};

export const SeatBoard = ({ host, seats, seatCount, onSeatPress, onHostPress }: SeatBoardProps) => {
  // Fill gaps so the board always renders a full 16-seat grid.
  const filled: RoomSeat[] = Array.from({ length: Math.max(0, seatCount - 1) }, (_, i) => {
    const index = i + 2; // seat 1 is the host's centre circle
    return seats.find((s) => s.index === index) ?? { index, isLocked: false };
  });

  // Split filled into row 1 (2 seats for flanking host), row 2 (3 seats), row 3 (5 seats), row 4 (5 seats)
  const row1Seats = filled.slice(0, 2);
  const row2Seats = filled.slice(2, 5);
  const row3Seats = filled.slice(5, 10);
  const row4Seats = filled.slice(10, 15);

  return (
    <div
      className="relative rounded-3xl px-2 py-4 border border-white/10 shadow-2xl overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 0%, rgba(168,85,247,0.3) 0%, transparent 80%), linear-gradient(180deg,#1c0d3d 0%,#12082b 100%)',
      }}
    >
      {/* Row 1 — Left Seat, Host (centre), Right Seat */}
      <div className="flex justify-center items-center gap-4 mb-4">
        {row1Seats[0] && <SeatSlot seat={row1Seats[0]} onPress={() => onSeatPress(row1Seats[0])} />}

        {/* Host — centre, large */}
        <div className="flex flex-col items-center gap-1">
          <button onClick={onHostPress} className="relative" aria-label="Host">
            <span className="w-[68px] h-[68px] rounded-full overflow-hidden bg-white/10 flex items-center justify-center ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              {host?.avatar ? (
                <img src={host.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xl font-bold">
                  {initial(host?.nickname)}
                </span>
              )}
            </span>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-4 px-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[9px] font-black tracking-wider flex items-center shadow">
              HOST
            </span>
          </button>
          <span className="text-xs text-white font-bold truncate max-w-[100px] mt-1">
            {host?.nickname ?? 'Host'}
          </span>
        </div>

        {row1Seats[1] && <SeatSlot seat={row1Seats[1]} onPress={() => onSeatPress(row1Seats[1])} />}
      </div>

      {/* Row 2 (3 seats) */}
      <div className="flex justify-center gap-3 mb-4">
        {row2Seats.map((seat) => (
          <SeatSlot key={seat.index} seat={seat} onPress={() => onSeatPress(seat)} />
        ))}
      </div>

      {/* Row 3 (5 seats) */}
      <div className="flex justify-center gap-1.5 mb-4">
        {row3Seats.map((seat) => (
          <SeatSlot key={seat.index} seat={seat} onPress={() => onSeatPress(seat)} />
        ))}
      </div>

      {/* Row 4 (5 seats) */}
      <div className="flex justify-center gap-1.5">
        {row4Seats.map((seat) => (
          <SeatSlot key={seat.index} seat={seat} onPress={() => onSeatPress(seat)} />
        ))}
      </div>
    </div>
  );
};
