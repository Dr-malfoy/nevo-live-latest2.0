import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, ILocalAudioTrack, UID } from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = '89383e4dfc4a43a4954a30fa9984b4f6';

interface UseCallOptions {
  channel: string;
  token: string;
  type: 'audio' | 'video';
}

/**
 * 1:1 and group audio/video calls over Agora (mode 'rtc' — all members publish).
 * Each remote user renders into a per-UID container (`remote-container-<uid>`)
 * appended under `#call-video-area`, so N participants each get their own tile.
 * Tokens are wildcard (uid 0) — the client picks its own uid.
 * Cleanup is idempotent — safe to call multiple times.
 */
export const useCall = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const joinedRef = useRef(false);
  const micOnRef = useRef(true);
  const cameraOnRef = useRef(true);
  const joiningRef = useRef(false);
  const networkLostRef = useRef(false);

  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState('');

  /** Remove every per-UID remote container from the call video area. */
  const clearRemoteContainers = useCallback(() => {
    const area = document.getElementById('call-video-area');
    if (!area) return;
    area.querySelectorAll('[id^="remote-container-"]').forEach((el) => el.remove());
  }, []);

  const startCall = useCallback(async ({ channel, token, type }: UseCallOptions) => {
    if (joinedRef.current || joiningRef.current) return;
    joiningRef.current = true;
    setError('');

    // Reuse a single client across calls
    if (!clientRef.current) {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            let container = document.getElementById(`remote-container-${user.uid}`);
            if (!container) {
              container = document.createElement('div');
              container.id = `remote-container-${user.uid}`;
              container.className = 'absolute inset-0';
              const area = document.getElementById('call-video-area');
              if (area) area.appendChild(container);
            }
            user.videoTrack?.play(container);
          }
          if (mediaType === 'audio') {
            // Audio plays globally (no container) — one stream per remote user.
            user.audioTrack?.play();
          }
          setRemoteUsers((prev) => (prev.includes(user.uid) ? prev : [...prev, user.uid]));
        } catch (e) {
          console.warn('call subscribe/play error:', e);
        }
      });

      client.on('user-unpublished', (user) => {
        setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
        document.getElementById(`remote-container-${user.uid}`)?.remove();
      });

      client.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
        document.getElementById(`remote-container-${user.uid}`)?.remove();
      });

      // Track network state for recovery messaging (never a hard error state).
      client.on('connection-state-change', (cur, prev) => {
        if (cur === 'DISCONNECTED' && prev !== 'DISCONNECTED') {
          if (!networkLostRef.current) {
            networkLostRef.current = true;
            setError('Connection lost — reconnecting…');
          }
        } else if (cur === 'CONNECTED') {
          networkLostRef.current = false;
          setError('');
        }
      });
    }

    const client = clientRef.current;
    try {
      // Client-chosen uid — the wildcard (uid 0) token accepts any uid.
      await client.join(AGORA_APP_ID, channel, token, undefined);
      joinedRef.current = true;
      setJoined(true);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
      localAudioRef.current = audioTrack;
      micOnRef.current = true;
      setMicOn(true);

      if (type === 'video') {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: { width: 640, height: 480, frameRate: 30 } });
        localVideoRef.current = videoTrack;
        cameraOnRef.current = true;
        setCameraOn(true);
        await client.publish([videoTrack, audioTrack]);
        // Play local preview into the PiP container (retry until the DOM is ready)
        const tryPlay = (attempt: number) => {
          const el = document.getElementById('call-local-video');
          if (el) {
            try { videoTrack.play(el); } catch { /* retry */ }
          } else if (attempt < 10) {
            setTimeout(() => tryPlay(attempt + 1), 150);
          }
        };
        tryPlay(0);
      } else {
        await client.publish([audioTrack]);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Failed to connect the call');
      throw err;
    } finally {
      joiningRef.current = false;
    }
  }, []);

  const toggleMic = useCallback(async () => {
    const track = localAudioRef.current;
    if (!track) return;
    const next = !micOnRef.current;
    micOnRef.current = next;
    setMicOn(next);
    try {
      await track.setEnabled(next);
    } catch (e) {
      console.warn('mic toggle error:', e);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const track = localVideoRef.current;
    if (!track) return;
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);
    try {
      await track.setEnabled(next);
    } catch (e) {
      console.warn('camera toggle error:', e);
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      if (localVideoRef.current) { localVideoRef.current.close(); localVideoRef.current = null; }
      if (localAudioRef.current) { localAudioRef.current.close(); localAudioRef.current = null; }
      if (clientRef.current && joinedRef.current) {
        await clientRef.current.leave();
      }
    } catch (e) {
      console.warn('call leave error:', e);
    }
    joinedRef.current = false;
    setJoined(false);
    setRemoteUsers([]);
    setMicOn(true);
    micOnRef.current = true;
    setCameraOn(true);
    cameraOnRef.current = true;
    setError('');
    clearRemoteContainers();
  }, [clearRemoteContainers]);

  // Hard cleanup on unmount
  useEffect(() => {
    return () => {
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      clientRef.current?.leave();
      clientRef.current = null;
      joinedRef.current = false;
      clearRemoteContainers();
    };
  }, [clearRemoteContainers]);

  return { joined, remoteUsers, micOn, cameraOn, error, startCall, toggleMic, toggleCamera, endCall };
};
