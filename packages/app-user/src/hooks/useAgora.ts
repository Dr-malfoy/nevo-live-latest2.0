import { useRef, useState, useCallback, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ICameraVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng';

// Suppress unneeded Agora SDK background log uploads and console spam
try {
  AgoraRTC.disableLogUpload();
  AgoraRTC.setLogLevel(2);
} catch {
  // Ignore in environments without window/RTC
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

interface UseAgoraOptions {
  appId: string;
  channel: string;
  token: string;
  uid?: number;
  role: 'host' | 'audience';
  /** Host captures/publishes the camera only when true (false = audio-only room). */
  videoEnabled?: boolean;
  /** Whether microphone should be ON initially upon joining. Defaults to true for host, false for audience */
  initialMicOn?: boolean;
  /** Called when the RTC connection is lost (network drop). */
  onNetworkLost?: () => void;
  /** Called when the RTC connection recovers. */
  onNetworkRecover?: () => void;
  /** Socket instance to use for WebRTC fallback signaling when Agora is unavailable */
  socket?: any;
  /** Stream ID for WebRTC fallback signaling */
  streamId?: string;
}

/**
 * Cross-browser video mirror styler.
 * Directly applies scaleX(-1) / none with !important to guarantee instant mirroring
 * across Agora and WebRTC video tracks on Android WebView and browsers.
 */
const setElementMirror = (container: HTMLElement | null, mirror: boolean) => {
  if (!container) return;
  const elements = container.querySelectorAll('video, .agora_video_player');
  elements.forEach((el: any) => {
    const transformVal = mirror ? 'scaleX(-1)' : 'none';
    el.style.setProperty('transform', transformVal, 'important');
    el.style.setProperty('-webkit-transform', transformVal, 'important');
  });
};

/**
 * Creates high-definition camera video track optimized for vertical mobile live-streaming.
 * Uses AgoraRTC.createCameraVideoTrack with portrait encoder configuration so the camera
 * hardware sensor orientation is automatically handled in true 100% vertical PORTRAIT
 * on both Android APK and browsers, preventing sideways/landscape streaming.
 */
async function createHdCameraVideoTrack(facingMode: 'user' | 'environment'): Promise<ICameraVideoTrack> {
  const isPortrait = typeof window !== 'undefined' ? window.innerHeight >= window.innerWidth : true;

  try {
    let targetCameraId: string | undefined;
    try {
      const devices = await AgoraRTC.getCameras().catch(() => []);
      if (devices.length > 0) {
        if (facingMode === 'user') {
          const front = devices.find((d, i) => /front|user|selfie/i.test(d.label || '') || i === 1);
          if (front) targetCameraId = front.deviceId;
        } else {
          const backDevices = devices.filter((d, i) => {
            const lbl = (d.label || '').toLowerCase();
            return !lbl.includes('tele') && !lbl.includes('macro') && !lbl.includes('depth');
          });
          const back =
            backDevices.find((d) => {
              const lbl = (d.label || '').toLowerCase();
              return /back|rear|environment|0/i.test(lbl) && !lbl.includes('ultra-wide') && !lbl.includes('ultrawide');
            }) || backDevices[0];
          if (back) targetCameraId = back.deviceId;
        }
      }
    } catch {}

    const track = await AgoraRTC.createCameraVideoTrack({
      facingMode,
      cameraId: targetCameraId,
      encoderConfig: isPortrait
        ? {
            width: 720,
            height: 1280,
            frameRate: 30,
            bitrateMin: 1500,
            bitrateMax: 3500,
          }
        : {
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 1500,
            bitrateMax: 3500,
          },
      optimizationMode: 'detail',
    });

    // Reset multi-lens hardware zoom to 1x (unzoomed)
    try {
      const mediaTrack = track.getMediaStreamTrack();
      const caps = (mediaTrack?.getCapabilities?.() as any) || {};
      if (caps.zoom) {
        const minZoom = caps.zoom.min ?? 1;
        await (mediaTrack?.applyConstraints as any)({
          advanced: [{ zoom: minZoom }],
        });
      }
    } catch {}

    return track;
  } catch (errAgora) {
    console.warn('[useAgora] createCameraVideoTrack with encoderConfig failed, fallback:', errAgora);
    return await AgoraRTC.createCameraVideoTrack({ facingMode });
  }
}

export const useAgora = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);

  // Fallback MediaStream and elements
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);
  const cachedLocalStreamRef = useRef<MediaStream | null>(null);

  // Fallback WebRTC P2P connections
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const streamIdRef = useRef<string | null>(null);
  const cleanupSignalingRef = useRef<(() => void) | null>(null);

  const cameraOnRef = useRef(false);
  const micOnRef = useRef(false);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const mirrorRef = useRef(true);
  const joiningRef = useRef(false);
  const togglingMicRef = useRef(false);
  const networkLostRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  const setMirror = useCallback((m: boolean) => {
    mirrorRef.current = m;
    // Mirror ONLY applies to front camera. Back camera is NEVER mirrored (never ulta).
    const shouldMirror = Boolean(m && facingModeRef.current === 'user');
    const videoArea = document.getElementById('agora-video-area');
    if (videoArea) {
      setElementMirror(videoArea, shouldMirror);
      setTimeout(() => setElementMirror(videoArea, shouldMirror), 150);
      setTimeout(() => setElementMirror(videoArea, shouldMirror), 350);
    }
  }, []);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  // Agora Beauty Effect Extension processor instance and current parameters
  const beautyProcessorRef = useRef<any>(null);
  const beautySettingsRef = useRef({ smoothness: 0, whitening: 0 });

  const applyBeautyOptions = useCallback(async (smoothness: number, whitening: number) => {
    beautySettingsRef.current = { smoothness, whitening };
    if (!localVideoRef.current) return;

    const shouldEnable = smoothness > 0 || whitening > 0;

    // Use safe built-in Agora SDK beauty effect if available (never crashes WebGL or turns screen black)
    if (typeof (localVideoRef.current as any)?.setBeautyEffect === 'function') {
      try {
        await (localVideoRef.current as any).setBeautyEffect(shouldEnable, {
          lighteningLevel: Math.min(1, Math.max(0, (whitening / 100) * 0.85)),
          smoothnessLevel: Math.min(1, Math.max(0, (smoothness / 100) * 0.85)),
          rednessLevel: 0.1,
          lighteningContrastLevel: 1,
        });
      } catch (err) {
        console.warn('[useAgora] SDK setBeautyEffect error (CSS filter active):', err);
      }
    }
  }, []);

  // Setup WebRTC P2P fallback for host and viewers
  const setupFallbackP2P = (role: 'host' | 'audience', socket: any, streamId: string) => {
    if (!socket || !streamId) return;
    socketRef.current = socket;
    streamIdRef.current = streamId;

    if (cleanupSignalingRef.current) {
      cleanupSignalingRef.current();
      cleanupSignalingRef.current = null;
    }

    if (role === 'host') {
      // Host side signaling handlers
      const onPeerJoined = async ({ peerSocketId }: { peerSocketId: string }) => {
        if (!peerSocketId) return;
        try {
          // Resolve stream to broadcast: fallback stream, Agora native tracks, or DOM video srcObject
          let streamToShare: MediaStream | null = fallbackStreamRef.current;
          if (!streamToShare || streamToShare.getTracks().length === 0) {
            const tracks: MediaStreamTrack[] = [];
            try {
              const vTrack = (localVideoRef.current as any)?.getMediaStreamTrack?.();
              if (vTrack) tracks.push(vTrack);
            } catch {}
            try {
              const aTrack = (localAudioRef.current as any)?.getMediaStreamTrack?.();
              if (aTrack) tracks.push(aTrack);
            } catch {}
            if (tracks.length > 0) {
              streamToShare = new MediaStream(tracks);
            }
          }
          if (!streamToShare || streamToShare.getTracks().length === 0) {
            const el = document.getElementById('agora-video-area')?.querySelector('video');
            if (el && el.srcObject instanceof MediaStream && el.srcObject.getTracks().length > 0) {
              streamToShare = el.srcObject;
            }
          }
          if (!streamToShare || streamToShare.getTracks().length === 0) return;

          // Close existing connection to this peer if any
          const existingPc = peerConnectionsRef.current.get(peerSocketId);
          if (existingPc) existingPc.close();

          const pc = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionsRef.current.set(peerSocketId, pc);

          streamToShare.getTracks().forEach((track) => {
            pc.addTrack(track, streamToShare!);
          });

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
              socketRef.current.emit('stream:signal:candidate', {
                toSocketId: peerSocketId,
                candidate: event.candidate,
              });
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('stream:signal:offer', {
            toSocketId: peerSocketId,
            offer,
          });
        } catch (e) {
          console.warn('[useAgora] Failed to create WebRTC offer for viewer:', e);
        }
      };

      const onSignalAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: any }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && answer && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[useAgora] Failed to set remote description from viewer:', e);
          }
        }
      };

      const onSignalCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: any }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && candidate && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            // Silently ignore late or redundant candidate
          }
        }
      };

      socket.on('stream:signal:peer-joined', onPeerJoined);
      socket.on('stream:signal:answer', onSignalAnswer);
      socket.on('stream:signal:candidate', onSignalCandidate);

      cleanupSignalingRef.current = () => {
        socket.off('stream:signal:peer-joined', onPeerJoined);
        socket.off('stream:signal:answer', onSignalAnswer);
        socket.off('stream:signal:candidate', onSignalCandidate);
      };
    } else {
      // Audience / Viewer side signaling handlers
      const onSignalOffer = async ({ fromSocketId, offer }: { fromSocketId: string; offer: any }) => {
        if (!offer) return;
        try {
          if (viewerPeerRef.current) {
            viewerPeerRef.current.close();
            viewerPeerRef.current = null;
          }

          const pc = new RTCPeerConnection(RTC_CONFIG);
          viewerPeerRef.current = pc;

          pc.ontrack = (event) => {
            if (event.receiver && typeof (event.receiver as any).playoutDelayHint !== 'undefined') {
              (event.receiver as any).playoutDelayHint = 0; // Eliminate WebRTC jitter buffer delay
            }
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            const container = document.getElementById('agora-video-area');
            if (container) {
              if (!remoteVideoElRef.current) {
                const videoEl = document.createElement('video');
                videoEl.autoplay = true;
                videoEl.playsInline = true;
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.srcObject = remoteStream;
                container.appendChild(videoEl);
                remoteVideoElRef.current = videoEl;
              } else {
                remoteVideoElRef.current.srcObject = remoteStream;
                if (remoteVideoElRef.current.parentElement !== container) {
                  container.appendChild(remoteVideoElRef.current);
                }
              }
              remoteVideoElRef.current.play().catch(() => {
                if (remoteVideoElRef.current) {
                  remoteVideoElRef.current.muted = true;
                  remoteVideoElRef.current.play().catch(() => {});
                }
              });
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
              socketRef.current.emit('stream:signal:candidate', {
                toSocketId: fromSocketId,
                candidate: event.candidate,
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('stream:signal:answer', {
            toSocketId: fromSocketId,
            answer,
          });
        } catch (e) {
          console.warn('[useAgora] Failed to handle WebRTC offer as viewer:', e);
        }
      };

      const onSignalCandidate = async ({ candidate }: { fromSocketId: string; candidate: any }) => {
        if (viewerPeerRef.current && candidate) {
          try {
            await viewerPeerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[useAgora] Failed to add ICE candidate on viewer:', e);
          }
        }
      };

      socket.on('stream:signal:offer', onSignalOffer);
      socket.on('stream:signal:candidate', onSignalCandidate);

      // Request the stream from the host now
      socket.emit('stream:signal:request-stream', { streamId });

      cleanupSignalingRef.current = () => {
        socket.off('stream:signal:offer', onSignalOffer);
        socket.off('stream:signal:candidate', onSignalCandidate);
      };
    }
  };

  // Helper to initialize local browser camera/mic when Agora is offline or lacks credentials
  const initLocalMediaFallback = async (
    videoEnabled: boolean,
    role: 'host' | 'audience',
    socket?: any,
    streamId?: string,
    shouldMicOn: boolean = false
  ) => {
    if (role === 'host' || shouldMicOn) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const isPortrait = typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true;
          let stream: MediaStream | null = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: (role === 'host' && videoEnabled) ? {
                width: isPortrait ? { ideal: 1080, min: 720 } : { ideal: 1920, min: 1080 },
                height: isPortrait ? { ideal: 1920, min: 1080 } : { ideal: 1080, min: 720 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: 'user',
              } : false,
              audio: shouldMicOn ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } : false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              video: (role === 'host' && videoEnabled) ? {
                width: isPortrait ? { ideal: 720, min: 480 } : { ideal: 1280, min: 640 },
                height: isPortrait ? { ideal: 1280, min: 640 } : { ideal: 720, min: 480 },
                frameRate: { ideal: 30, max: 30 },
                facingMode: 'user',
              } : false,
              audio: shouldMicOn ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } : false,
            });
          }
          fallbackStreamRef.current = stream;
          cameraOnRef.current = (role === 'host' && videoEnabled);
          micOnRef.current = shouldMicOn;
          setCameraOn(cameraOnRef.current);
          setMicOn(shouldMicOn);
        }
      } catch (mediaErr: any) {
        console.warn('[useAgora] Fallback media capture failed or denied:', mediaErr?.message);
      }
    } else {
      cameraOnRef.current = false;
      micOnRef.current = false;
      setCameraOn(false);
      setMicOn(false);
    }

    if (socket && streamId) {
      setupFallbackP2P(role, socket, streamId);
    }

    setJoined(true);
  };

  const joinChannel = useCallback(
    async ({
      appId,
      channel,
      token,
      uid,
      role,
      videoEnabled = true,
      initialMicOn,
      onNetworkLost,
      onNetworkRecover,
      socket,
      streamId,
    }: UseAgoraOptions) => {
      if (joiningRef.current) return;

      const shouldMicOn = initialMicOn !== undefined ? initialMicOn : (role === 'host');

      if (clientRef.current) {
        try {
          await clientRef.current.leave();
        } catch {}
        clientRef.current = null;
      }

      // Resolve Agora App ID with universal fallback
      const resolvedAppId = (appId && appId.trim() !== '' && appId !== '89383e4dfc4a43a4954a30fa9984b4f6')
        ? appId.trim()
        : 'b0b508017ff54158a6e30f30c7cbea98';

      // If no valid Agora App ID is available, gracefully fallback to local WebRTC
      if (!resolvedAppId) {
        console.warn('[useAgora] No valid Agora App ID provided. Using browser WebRTC live relay mode.');
        await initLocalMediaFallback(videoEnabled, role, socket, streamId, shouldMicOn);
        return null;
      }

      joiningRef.current = true;
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      try {
        // Guarantee default subscription is high-definition stream
        (client as any).setRemoteDefaultVideoStreamType?.(0);
      } catch {}

      // Set initial Agora client role: host or audience
      if (role === 'host' || shouldMicOn) {
        await client.setClientRole('host');
      } else {
        await client.setClientRole('audience');
      }

      // Handle browser audio autoplay policies
      if (typeof window !== 'undefined') {
        const unlockAudio = () => {
          if (clientRef.current) {
            clientRef.current.remoteUsers.forEach((remoteUser) => {
              if (remoteUser.audioTrack && !remoteUser.audioTrack.isPlaying) {
                remoteUser.audioTrack.play();
              }
            });
          }
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
        };
        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('touchstart', unlockAudio, { once: true });
      }

      client.on('connection-state-change', (cur, prev) => {
        if ((cur === 'RECONNECTING' || cur === 'DISCONNECTED') && prev === 'CONNECTED') {
          if (!networkLostRef.current) {
            networkLostRef.current = true;
            setError('Connection lost — reconnecting…');
            onNetworkLost?.();
          }
        } else if (cur === 'CONNECTED') {
          if (networkLostRef.current) {
            networkLostRef.current = false;
            setError('');
            onNetworkRecover?.();
          }
        }
      });

      // Remote user published
      client.on('user-published', async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === 'video') {
            try {
              // Guarantee high-definition (HD) video stream is requested without low-stream downgrade
              client.setRemoteVideoStreamType(user.uid, 0);
              client.setStreamFallbackOption(user.uid, 0);
            } catch (hdErr) {
              console.warn('[useAgora] setRemoteVideoStreamType error:', hdErr);
            }

            let container = document.getElementById(`remote-container-${user.uid}`);
            if (!container) {
              container = document.createElement('div');
              container.id = `remote-container-${user.uid}`;
              container.className = 'absolute inset-0 w-full h-full';
              const videoArea = document.getElementById('agora-video-area');
              if (videoArea) videoArea.appendChild(container);
            }
            if (user.videoTrack) {
              user.videoTrack.play(container, { fit: 'cover', mirror: false });
            }
          }
          if (mediaType === 'audio') {
            try {
              user.audioTrack?.play();
            } catch (playErr) {
              console.warn('[useAgora] Audio autoplay failed for remote user:', user.uid, playErr);
            }
          }
          setRemoteUsers((prev) => (prev.includes(user.uid) ? prev : [...prev, user.uid]));
        } catch (e) {
          console.warn('live subscribe/play error:', e);
        }
      });

      client.on('user-unpublished', (user, mediaType) => {
        if (!mediaType || mediaType === 'video') {
          document.getElementById(`remote-container-${user.uid}`)?.remove();
        }
        if (!user.hasAudio && !user.hasVideo) {
          setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
        }
      });

      client.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
        document.getElementById(`remote-container-${user.uid}`)?.remove();
      });

      try {
        await client.join(resolvedAppId, channel, token, uid ?? 0);

        if (role === 'host' && videoEnabled) {
          let videoTrack: ICameraVideoTrack | null = null;
          try {
            videoTrack = await createHdCameraVideoTrack(facingModeRef.current);
          } catch (createErr) {
            console.warn('[useAgora] createHdCameraVideoTrack error:', createErr);
          }
          localVideoRef.current = videoTrack;
          cameraOnRef.current = Boolean(videoTrack);
          setCameraOn(Boolean(videoTrack));

          if (videoTrack && (beautySettingsRef.current.smoothness > 0 || beautySettingsRef.current.whitening > 0)) {
            applyBeautyOptions(beautySettingsRef.current.smoothness, beautySettingsRef.current.whitening);
          }

          // Immediately render host local video in agora-video-area (mirror: false for real position)
          const videoArea = document.getElementById('agora-video-area');
          if (videoArea && videoTrack) {
            try {
              videoTrack.play(videoArea, { fit: 'cover', mirror: false });
            } catch (playErr) {
              console.warn('[useAgora] Immediate host preview error:', playErr);
            }
          }
        } else {
          localVideoRef.current = null;
          cameraOnRef.current = false;
          setCameraOn(false);
        }

        if (shouldMicOn) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            AEC: true,
            ANS: true,
            AGC: true,
          });
          localAudioRef.current = audioTrack;
          micOnRef.current = true;
          setMicOn(true);

          const tracksToPublish: any[] = [];
          if (localVideoRef.current) tracksToPublish.push(localVideoRef.current);
          if (audioTrack) tracksToPublish.push(audioTrack);
          if (tracksToPublish.length > 0) {
            await client.publish(tracksToPublish);
          }
        } else {
          // Off by default
          localAudioRef.current = null;
          micOnRef.current = false;
          setMicOn(false);

          if (localVideoRef.current) {
            await client.publish([localVideoRef.current]);
          }
        }

        if (socket && streamId) {
          setupFallbackP2P(role, socket, streamId);
        }

        setJoined(true);
        return client;
      } catch (err: any) {
        console.warn('[useAgora] Agora RTC gateway connection failed:', err?.message || err);
        try {
          await client.leave();
        } catch {}
        if (clientRef.current === client) clientRef.current = null;

        // Auto-fallback so live session stays usable with WebRTC
        await initLocalMediaFallback(videoEnabled, role, socket, streamId, shouldMicOn);
        return null;
      } finally {
        joiningRef.current = false;
      }
    },
    []
  );

  // Play local video into the container
  const playLocalVideo = useCallback((containerId: string) => {
    const tryPlay = (attempt: number) => {
      const shouldMirror = mirrorRef.current && facingModeRef.current === 'user';

      // 1. If Agora native track is available
      if (localVideoRef.current) {
        try {
          const container = document.getElementById(containerId);
          if (container) {
            localVideoRef.current.play(container, { fit: 'cover', mirror: shouldMirror });
            setElementMirror(container, shouldMirror);
            setTimeout(() => setElementMirror(container, shouldMirror), 150);
            setTimeout(() => setElementMirror(container, shouldMirror), 350);
            return;
          }
        } catch (e) {
          console.warn(`[useAgora] playLocalVideo attempt ${attempt + 1} failed:`, e);
        }
      }

      // 2. If fallback MediaStream is available (WebRTC local camera)
      if (fallbackStreamRef.current) {
        const container = document.getElementById(containerId);
        if (container) {
          if (!fallbackVideoElRef.current) {
            const videoEl = document.createElement('video');
            videoEl.autoplay = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            videoEl.style.imageRendering = '-webkit-optimize-contrast';
            videoEl.style.transform = shouldMirror ? 'scaleX(-1)' : 'none';
            videoEl.srcObject = fallbackStreamRef.current;
            container.appendChild(videoEl);
            fallbackVideoElRef.current = videoEl;
          } else if (fallbackVideoElRef.current.parentElement !== container) {
            container.appendChild(fallbackVideoElRef.current);
          }
          setElementMirror(container, shouldMirror);
          return;
        }
      }

      if (attempt < 5) {
        setTimeout(() => tryPlay(attempt + 1), 300 * (attempt + 1));
      }
    };
    tryPlay(0);
  }, []);

  // Re-verify and ensure video tracks are actively playing into the container
  const refreshVideoTracks = useCallback((containerId: string = 'agora-video-area') => {
    const videoArea = document.getElementById(containerId);
    if (!videoArea) return;
    const shouldMirror = Boolean(mirrorRef.current && facingModeRef.current === 'user');

    // 1. If host local camera track
    if (localVideoRef.current && cameraOnRef.current) {
      try {
        localVideoRef.current.play(videoArea, { fit: 'cover', mirror: shouldMirror });
        setElementMirror(videoArea, shouldMirror);
        setTimeout(() => setElementMirror(videoArea, shouldMirror), 150);
        setTimeout(() => setElementMirror(videoArea, shouldMirror), 350);
      } catch (e) {
        console.warn('[useAgora] refresh local video error:', e);
      }
    }

    // 2. If fallback host stream
    if (fallbackStreamRef.current && fallbackVideoElRef.current) {
      if (!videoArea.contains(fallbackVideoElRef.current)) {
        videoArea.appendChild(fallbackVideoElRef.current);
      }
      try {
        fallbackVideoElRef.current.play().catch(() => {});
      } catch {}
      setElementMirror(videoArea, shouldMirror);
    }

    // 3. If remote users exist
    if (clientRef.current) {
      clientRef.current.remoteUsers.forEach((user) => {
        if (user.videoTrack) {
          let container = document.getElementById(`remote-container-${user.uid}`);
          if (!container) {
            container = document.createElement('div');
            container.id = `remote-container-${user.uid}`;
            container.className = 'absolute inset-0 w-full h-full';
            videoArea.appendChild(container);
          }
          try {
            user.videoTrack.play(container, { fit: 'cover', mirror: false });
          } catch (e) {
            console.warn('[useAgora] refresh remote video error:', e);
          }
        }
      });
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);

    // Agora track
    if (localVideoRef.current) {
      try {
        await localVideoRef.current.setEnabled(next);
      } catch (e) {
        console.warn('live camera toggle error:', e);
      }
    } else if (next && clientRef.current) {
      try {
        const videoTrack = await createHdCameraVideoTrack(facingModeRef.current);
        localVideoRef.current = videoTrack;
        beautyProcessorRef.current = null;
        if (videoTrack && (beautySettingsRef.current.smoothness > 0 || beautySettingsRef.current.whitening > 0)) {
          applyBeautyOptions(beautySettingsRef.current.smoothness, beautySettingsRef.current.whitening);
        }
        await clientRef.current.publish([videoTrack]);
        const videoArea = document.getElementById('agora-video-area');
        if (videoArea) {
          const shouldMirror = Boolean(mirrorRef.current && facingModeRef.current === 'user');
          videoTrack.play(videoArea, { fit: 'cover', mirror: shouldMirror });
          setElementMirror(videoArea, shouldMirror);
          setTimeout(() => setElementMirror(videoArea, shouldMirror), 150);
          setTimeout(() => setElementMirror(videoArea, shouldMirror), 350);
        }
      } catch (e) {
        console.warn('[useAgora] live camera enable error:', e);
      }
    }

    // Fallback stream
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  }, []);

  const toggleMic = useCallback(async (desiredState?: boolean): Promise<boolean> => {
    if (togglingMicRef.current) return micOnRef.current;
    togglingMicRef.current = true;

    try {
      const next = typeof desiredState === 'boolean' ? desiredState : !micOnRef.current;

      if (next) {
        // Turning mic ON
        // 1. If Agora client active
        if (clientRef.current) {
          try {
            await clientRef.current.setClientRole('host');
          } catch (roleErr) {
            console.warn('[useAgora] setClientRole error:', roleErr);
          }

          const isTrackEnded =
            !localAudioRef.current ||
            localAudioRef.current.getMediaStreamTrack()?.readyState === 'ended';

          if (isTrackEnded) {
            if (localAudioRef.current) {
              try {
                localAudioRef.current.close();
              } catch {}
              localAudioRef.current = null;
            }
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              ANS: true,
              AGC: true,
              encoderConfig: 'high_quality_stereo',
            });
            localAudioRef.current = audioTrack;
            const isPublished = clientRef.current.localTracks.includes(audioTrack);
            if (!isPublished) {
              await clientRef.current.publish([audioTrack]);
            }
            if (typeof (audioTrack as any).setMuted === 'function') {
              await (audioTrack as any).setMuted(false);
            }
          } else if (localAudioRef.current) {
            const isPublished = clientRef.current.localTracks.includes(localAudioRef.current);
            if (!isPublished) {
              await clientRef.current.publish([localAudioRef.current]);
            }
            if (typeof (localAudioRef.current as any).setMuted === 'function') {
              await (localAudioRef.current as any).setMuted(false);
            }
          }
        }

        // 2. Fallback stream handling
        if (fallbackStreamRef.current) {
          const existingAudio = fallbackStreamRef.current.getAudioTracks()[0];
          if (existingAudio) {
            existingAudio.enabled = true;
          } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const newAudioTrack = micStream.getAudioTracks()[0];
            if (newAudioTrack) {
              fallbackStreamRef.current.addTrack(newAudioTrack);
              peerConnectionsRef.current.forEach((pc) => {
                pc.addTrack(newAudioTrack, fallbackStreamRef.current!);
              });
            }
          }
        } else if (!clientRef.current && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            fallbackStreamRef.current = micStream;
          } catch (e) {
            console.warn('[useAgora] Failed to get user media for mic:', e);
          }
        }

        micOnRef.current = true;
        setMicOn(true);
        setError('');
        return true;
      } else {
        // Turning mic OFF - mute non-destructively without shutting down device
        if (localAudioRef.current) {
          try {
            if (typeof (localAudioRef.current as any).setMuted === 'function') {
              await (localAudioRef.current as any).setMuted(true);
            }
          } catch (e) {
            console.warn('[useAgora] live mic mute error:', e);
          }
        }

        if (fallbackStreamRef.current) {
          fallbackStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        }

        micOnRef.current = false;
        setMicOn(false);
        return false;
      }
    } catch (err: any) {
      console.error('[useAgora] Mic toggle failed:', err);
      micOnRef.current = false;
      setMicOn(false);
      const isPermErr =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.code === 'PERMISSION_DENIED';
      const errMsg = isPermErr
        ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
        : `Microphone error: ${err?.message || 'unknown error'}`;
      setError(errMsg);
      return false;
    } finally {
      togglingMicRef.current = false;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const currentMode = facingModeRef.current;
    const targetFacing: 'user' | 'environment' = currentMode === 'user' ? 'environment' : 'user';

    const isFront = (label: string, idx: number) => {
      const lbl = label.toLowerCase();
      if (/front|user|facetime|selfie|forward/i.test(lbl)) return true;
      if (/back|rear|environment|world/i.test(lbl)) return false;
      if (/camera2?\s*1\b/i.test(lbl)) return true;
      if (!lbl && idx === 1) return true;
      return false;
    };

    const isBack = (label: string, idx: number) => {
      const lbl = label.toLowerCase();
      if (/back|rear|environment|world/i.test(lbl)) return true;
      if (/front|user|facetime|selfie|forward/i.test(lbl)) return false;
      if (/camera2?\s*0\b/i.test(lbl)) return true;
      if (!lbl && idx === 0) return true;
      return false;
    };

    // 1. Agora native camera switch
    if (localVideoRef.current) {
      try {
        const devices = await AgoraRTC.getCameras();

        let targetDevice: { deviceId: string; label: string } | undefined;
        if (targetFacing === 'user') {
          // Find first front camera
          targetDevice = devices.find((d, i) => isFront(d.label || '', i));
        } else {
          // Find primary 1x back camera (avoid auxiliary telephoto zoom and macro lenses)
          const backDevices = devices.filter((d, i) => isBack(d.label || '', i));
          targetDevice =
            backDevices.find((d) => {
              const lbl = (d.label || '').toLowerCase();
              return (
                !lbl.includes('tele') &&
                !lbl.includes('macro') &&
                !lbl.includes('depth') &&
                !lbl.includes('ultra-wide') &&
                !lbl.includes('ultrawide')
              );
            }) || backDevices[0] || devices[0];
        }

        if (targetDevice && typeof (localVideoRef.current as any)?.setDevice === 'function') {
          try {
            await (localVideoRef.current as any).setDevice(targetDevice.deviceId);
            facingModeRef.current = targetFacing;
            setFacingMode(targetFacing);
            const videoArea = document.getElementById('agora-video-area');
            if (videoArea) {
              const shouldMirror = Boolean(mirrorRef.current && targetFacing === 'user');
              localVideoRef.current.play(videoArea, { fit: 'cover', mirror: shouldMirror });
              setElementMirror(videoArea, shouldMirror);
              setTimeout(() => setElementMirror(videoArea, shouldMirror), 150);
              setTimeout(() => setElementMirror(videoArea, shouldMirror), 350);
            }
            return;
          } catch (setDeviceErr) {
            console.warn('[useAgora] setDevice failed, will release and recreate track:', setDeviceErr);
          }
        }

        // Fallback: Recreate track with clean hardware camera release for Android
        const oldTrack = localVideoRef.current;
        if (clientRef.current && oldTrack) {
          try {
            await clientRef.current.unpublish([oldTrack]);
          } catch {}
        }
        if (oldTrack) {
          try {
            oldTrack.stop();
            oldTrack.close();
          } catch {}
        }
        localVideoRef.current = null;

        // Allow Android Camera2 service to fully release hardware sensor lock
        await new Promise((resolve) => setTimeout(resolve, 150));

        let newTrack: ICameraVideoTrack | null = null;
        try {
          newTrack = await createHdCameraVideoTrack(targetFacing);
        } catch (switchErr) {
          console.warn('[useAgora] switch createHdCameraVideoTrack error:', switchErr);
        }

        if (newTrack) {
          localVideoRef.current = newTrack;
          facingModeRef.current = targetFacing;
          setFacingMode(targetFacing);

          if (clientRef.current) {
            try {
              await clientRef.current.publish([newTrack]);
            } catch (pubErr) {
              console.warn('[useAgora] publish switch track error:', pubErr);
            }
          }

          const videoArea = document.getElementById('agora-video-area');
          if (videoArea) {
            const shouldMirror = Boolean(mirrorRef.current && targetFacing === 'user');
            newTrack.play(videoArea, { fit: 'cover', mirror: shouldMirror });
            setElementMirror(videoArea, shouldMirror);
            setTimeout(() => setElementMirror(videoArea, shouldMirror), 150);
            setTimeout(() => setElementMirror(videoArea, shouldMirror), 350);
          }
          return;
        }
      } catch (e) {
        console.warn('[useAgora] Agora switch camera error:', e);
      }
    }

    // 2. WebRTC Fallback device switch
    if (fallbackStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const isPortrait = typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true;
        const oldTrack = fallbackStreamRef.current.getVideoTracks()[0];
        oldTrack?.stop();

        let newStream: MediaStream | null = null;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: isPortrait ? 720 : 1280 },
              height: { ideal: isPortrait ? 1280 : 720 },
              aspectRatio: { ideal: isPortrait ? 9 / 16 : 16 / 9 },
              frameRate: { ideal: 30, max: 30 },
            },
            audio: false,
          });
        } catch {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: isPortrait ? 540 : 960 },
              height: { ideal: isPortrait ? 960 : 540 },
              aspectRatio: { ideal: isPortrait ? 9 / 16 : 16 / 9 },
              frameRate: { ideal: 30, max: 30 },
            },
            audio: false,
          });
        }
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          fallbackStreamRef.current.removeTrack(oldTrack);
          fallbackStreamRef.current.addTrack(newVideoTrack);
          if (fallbackVideoElRef.current) {
            fallbackVideoElRef.current.srcObject = fallbackStreamRef.current;
          }
          const shouldMirror = Boolean(mirrorRef.current && targetFacing === 'user');
          setElementMirror(document.getElementById('agora-video-area'), shouldMirror);
          // Update peers with new video track
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack).catch(() => {});
            }
          });
          facingModeRef.current = targetFacing;
          setFacingMode(targetFacing);
        }
      } catch (e) {
        console.warn('[useAgora] Failed to switch fallback camera:', e);
      }
    }
  }, []);

  const leaveChannel = useCallback(async () => {
    try {
      if (cleanupSignalingRef.current) {
        cleanupSignalingRef.current();
        cleanupSignalingRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      if (viewerPeerRef.current) {
        viewerPeerRef.current.close();
        viewerPeerRef.current = null;
      }

      if (localVideoRef.current) {
        try {
          localVideoRef.current.stop();
          localVideoRef.current.close();
        } catch {}
        localVideoRef.current = null;
      }
      if (localAudioRef.current) {
        try {
          localAudioRef.current.stop();
          localAudioRef.current.close();
        } catch {}
        localAudioRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
      }
      if (beautyProcessorRef.current) {
        try {
          beautyProcessorRef.current.unpipe?.();
        } catch {}
        beautyProcessorRef.current = null;
      }
      if (fallbackStreamRef.current) {
        fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
        fallbackStreamRef.current = null;
      }
      if (fallbackVideoElRef.current) {
        fallbackVideoElRef.current.remove();
        fallbackVideoElRef.current = null;
      }
      if (remoteVideoElRef.current) {
        remoteVideoElRef.current.remove();
        remoteVideoElRef.current = null;
      }
    } catch (e) {
      console.warn('leave error:', e);
    }
    setJoined(false);
    cameraOnRef.current = false;
    micOnRef.current = false;
    setCameraOn(false);
    setMicOn(false);
    setRemoteUsers([]);
    setError('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupSignalingRef.current) {
        cleanupSignalingRef.current();
        cleanupSignalingRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      if (viewerPeerRef.current) viewerPeerRef.current.close();
      if (beautyProcessorRef.current) {
        try {
          beautyProcessorRef.current.unpipe?.();
        } catch {}
        beautyProcessorRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.stop();
        localVideoRef.current.close();
      }
      if (localAudioRef.current) {
        localAudioRef.current.stop();
        localAudioRef.current.close();
      }
      if (clientRef.current) clientRef.current.leave();
      if (fallbackStreamRef.current) {
        fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (fallbackVideoElRef.current) {
        fallbackVideoElRef.current.remove();
      }
      if (remoteVideoElRef.current) {
        remoteVideoElRef.current.remove();
      }
    };
  }, []);

  return {
    clientRef,
    localVideoRef,
    localAudioRef,
    joined,
    cameraOn,
    micOn,
    facingMode,
    micOnRef,
    remoteUsers,
    error,
    joinChannel,
    playLocalVideo,
    refreshVideoTracks,
    toggleCamera,
    toggleMic,
    switchCamera,
    setMirror,
    leaveChannel,
    getLocalStream: () => {
      // 1. Fallback stream if active with tracks
      if (fallbackStreamRef.current && fallbackStreamRef.current.getTracks().length > 0) {
        return fallbackStreamRef.current;
      }
      // 2. Agora camera & audio tracks converted to native MediaStream
      const tracks: MediaStreamTrack[] = [];
      try {
        const vTrack = (localVideoRef.current as any)?.getMediaStreamTrack?.();
        if (vTrack) tracks.push(vTrack);
      } catch {}
      try {
        const aTrack = (localAudioRef.current as any)?.getMediaStreamTrack?.();
        if (aTrack) tracks.push(aTrack);
      } catch {}
      if (tracks.length > 0) {
        if (cachedLocalStreamRef.current) {
          const curTracks = cachedLocalStreamRef.current.getTracks();
          const same = curTracks.length === tracks.length && curTracks.every((t, i) => t.id === tracks[i].id && t.readyState === 'live');
          if (same) return cachedLocalStreamRef.current;
        }
        cachedLocalStreamRef.current = new MediaStream(tracks);
        return cachedLocalStreamRef.current;
      }
      // 3. Extract stream directly from DOM video element in agora-video-area
      if (typeof document !== 'undefined') {
        const el = document.getElementById('agora-video-area')?.querySelector('video');
        if (el && el.srcObject instanceof MediaStream && el.srcObject.getTracks().length > 0) {
          return el.srcObject;
        }
      }
      return fallbackStreamRef.current;
    },
    applyBeautyOptions,
  };
};
