import { PiVideoCameraFill as Video, PiVideoCameraSlashFill as VideoOff, PiMicrophoneFill as Mic, PiMicrophoneSlashFill as MicOff, PiCameraFill as Camera, PiPhoneSlashFill as PhoneOff, PiArrowsLeftRightBold as FlipHorizontal } from 'react-icons/pi';

interface StreamControlsProps {
  isHost: boolean;
  cameraOn: boolean;
  micOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSwitchCamera?: () => void;
  onEnd?: () => void;
  onLeave?: () => void;
}

export const StreamControls = ({
  isHost,
  cameraOn,
  micOn,
  onToggleCamera,
  onToggleMic,
  onSwitchCamera,
  onEnd,
  onLeave,
}: StreamControlsProps) => (
  <div className="flex items-center justify-center gap-4 p-4">
    {isHost && (
      <>
        <button
          onClick={onToggleCamera}
          className={`p-3 rounded-full transition-all ${cameraOn ? 'bg-surface-sunken' : 'bg-red-600'} backdrop-blur-sm hover:scale-105 active:scale-95`}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={onSwitchCamera}
          className="p-3 rounded-full bg-surface-sunken backdrop-blur-sm hover:scale-105 active:scale-95"
        >
          <FlipHorizontal className="w-5 h-5" />
        </button>
      </>
    )}
    <button
      onClick={onToggleMic}
      className={`p-3 rounded-full transition-all ${micOn ? 'bg-surface-sunken' : 'bg-red-600'} backdrop-blur-sm hover:scale-105 active:scale-95`}
    >
      {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
    </button>
    {isHost ? (
      <button
        onClick={onEnd}
        className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    ) : (
      <button
        onClick={onLeave}
        className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-all hover:scale-105 active:scale-95"
      >
        <PhoneOff className="w-5 h-5" />
      </button>
    )}
  </div>
);
