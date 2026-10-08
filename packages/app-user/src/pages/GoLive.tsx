import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiVideoCameraFill as Video, PiMicrophoneFill as Mic, PiGameControllerFill as Gamepad2, PiUploadSimpleBold as Upload } from 'react-icons/pi';
import { Button, Input, VerificationGateModal } from '../components/ui';
import { streamsApi, uploadApi, agencyApi } from '../api';
import { optional } from '../api/pending';
import { roomsApi } from '../api/rooms.api';
import { useAuthStore, useUIStore } from '../stores';
import { canUseLiveFeatures } from '../services/verification';
import { getMediaUrl } from '../lib/media';
import { GenderSelectionModal } from '../components/user';

const streamTypes = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'voice', label: 'Voice Party', icon: Mic },
  { value: 'game', label: 'Game', icon: Gamepad2 },
] as const;

export const GoLive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const showToast = useUIStore((s) => s.showToast);
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const paramType = searchParams.get('type');
  const [type, setType] = useState<'video' | 'voice' | 'game'>(
    paramType === 'voice' || paramType === 'party' ? 'voice' : paramType === 'game' ? 'game' : 'video'
  );
  const [loading, setLoading] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

  useEffect(() => {
    const t = searchParams.get('type');
    if (t === 'party' || t === 'voice') {
      setType('voice');
    } else if (t === 'game') {
      setType('game');
    }
  }, [searchParams]);

  const handleGoLive = async () => {
    if (!title.trim()) return;

    // Mandatory Gender check
    if (!user?.gender || user.gender === 'unspecified') {
      setShowGenderModal(true);
      return;
    }

    // Live Face Verification gate for going live
    if (!canUseLiveFeatures(user?.verification, user?.role)) {
      setShowGate(true);
      return;
    }

    // Check if Agency Quit Request is pending
    try {
      const statusRes = await optional(agencyApi.getLeaveStatus()).catch(() => null);
      const isPending =
        (statusRes as any)?.data?.hasPending ||
        (statusRes as any)?.data?.request?.status === 'pending' ||
        (statusRes as any)?.hasPending ||
        localStorage.getItem('agencyQuitStatus') === 'pending';

      if (isPending) {
        showToast('You cannot go live while your agency quit request is pending', 'error');
        return;
      }
    } catch {
      // ignore
    }

    setLoading(true);
    let coverUrl = '';
    if (thumbnail) {
      try {
        coverUrl = await uploadApi.upload(thumbnail);
      } catch (err) {
        showToast('Failed to upload thumbnail', 'error');
        setLoading(false);
        return;
      }
    }
    
    try {
      if (type === 'voice') {
        const { data } = await roomsApi.create({
          name: title.trim(),
          seatCount: 16,
        });
        if (data.success && data.data?._id) {
          showToast('Party room created!', 'success');
          navigate(`/party/${data.data._id}`, { replace: true });
          return;
        }
      }

      // One user = one active live session. Check before creating a new one.
      const active = await streamsApi.getMyActiveStream();
      if (active.data.success && active.data.data?._id) {
        showToast('You are already live on another session', 'info');
        navigate(`/live/${active.data.data._id}`, { replace: true });
        return;
      }

      const { data } = await streamsApi.createStream({
        title: title.trim(),
        type,
        category: type === 'game' ? 'game' : 'talk',
        cover: coverUrl,
      });
      if (data.success && data.data) {
        navigate(`/live/${data.data._id}`, { replace: true });
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to start stream', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-mesh">
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h1 className="text-2xl font-bold mb-2">Go Live</h1>
      <p className="text-ink-muted mb-8">Start broadcasting to your audience</p>

      <div className="space-y-6">
        <Input
          label="Stream Title"
          placeholder="What's your stream about?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-sm text-ink-muted mb-2">Thumbnail</label>
          <input
            type="file"
            ref={thumbnailInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setThumbnail(file);
                setThumbnailPreview(URL.createObjectURL(file));
              }
            }}
          />
          <button
            onClick={() => thumbnailInputRef.current?.click()}
            className="w-full aspect-video flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong hover:border-brand-primary transition-all bg-surface-sunken"
          >
            {thumbnailPreview ? (
              <img src={getMediaUrl(thumbnailPreview)} alt="Thumbnail preview" className="w-full h-full object-cover rounded-xl" crossOrigin="anonymous" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-ink-muted" />
                <span className="text-sm text-ink-muted">Upload thumbnail</span>
              </>
            )}
          </button>
        </div>

        {type !== 'voice' && (
          <div>
            <label className="block text-sm text-ink-muted mb-2">Stream Type</label>
            <div className="grid grid-cols-3 gap-3">
              {streamTypes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    type === value
                      ? 'border-brand-primary bg-brand-primary/20 shadow-glow-sm'
                      : 'border-line-strong bg-surface-sunken hover:border-dark-500'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={handleGoLive}
          loading={loading}
          disabled={!title.trim()}
        >
          {type === 'voice' ? (
            'Start Party'
          ) : (
            <>
              <Video className="w-4 h-4" />
              Start Live Stream
            </>
          )}
        </Button>
      </div>

      <VerificationGateModal isOpen={showGate} onClose={() => setShowGate(false)} type="face" />
      <GenderSelectionModal
        isOpen={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        onSuccess={() => handleGoLive()}
        title="Gender Required to Go Live"
        reason="Please select your gender before starting a live stream. Gender selection is mandatory and cannot be changed for 60 days."
      />
    </div>
  );
};
