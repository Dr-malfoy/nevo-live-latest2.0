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

/**
 * Selects the single primary camera device ID for the requested facing mode:
 * - 'user': Primary front selfie camera (Camera 1 / front).
 * - 'environment': Single 1x MAIN rear camera (Camera 0 / primary back).
 * Strictly excludes any secondary / auxiliary lenses (ultra-wide, macro, telephoto, depth, bokeh).
 */
export async function getOptimalCameraId(facingMode: 'user' | 'environment'): Promise<string | undefined> {
  try {
    let devices: any[] = [];
    if (typeof AgoraRTC !== 'undefined' && typeof AgoraRTC.getCameras === 'function') {
      devices = await AgoraRTC.getCameras().catch(() => []);
    }
    if ((!devices || devices.length === 0) && typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      devices = (await navigator.mediaDevices.enumerateDevices().catch(() => []))
        .filter((d) => d.kind === 'videoinput');
    }
    if (!devices || devices.length === 0) return undefined;

    const videoDevices = devices.filter((d: any) => !d.kind || d.kind === 'videoinput');
    if (videoDevices.length === 0) return undefined;

    if (facingMode === 'user') {
      // 1. Android Camera2 standard front camera is camera2 1
      const cam1 = videoDevices.find((d) => /camera2?\s*1\b/i.test(d.label || ''));
      if (cam1?.deviceId) return cam1.deviceId;

      // 2. Front / selfie / facetime label
      const front = videoDevices.find((d) =>
        /front|user|facetime|selfie|forward/i.test(d.label || '')
      );
      if (front?.deviceId) return front.deviceId;

      // If multiple front devices exist, select the first
      const allFront = videoDevices.filter((d) =>
        /front|user|facetime|selfie|forward/i.test(d.label || '')
      );
      if (allFront[0]?.deviceId) return allFront[0].deviceId;

      return undefined;
    } else {
      // 1. Android Camera2 standard primary main rear camera is camera2 0
      const cam0 = videoDevices.find((d) => /camera2?\s*0\b/i.test(d.label || ''));
      if (cam0?.deviceId) return cam0.deviceId;

      // 2. Rear devices excluding secondary lenses (telephoto, macro, depth, ultra-wide)
      const backDevices = videoDevices.filter((d) =>
        /back|rear|environment|world/i.test(d.label || '') ||
        /camera2?\s*[02345]\b/i.test(d.label || '')
      );

      // Select main rear camera, strictly ignoring extra lenses
      const mainBack = backDevices.find((d) => {
        const lbl = (d.label || '').toLowerCase();
        const isExcluded =
          lbl.includes('tele') ||
          lbl.includes('macro') ||
          lbl.includes('depth') ||
          lbl.includes('ultra') ||
          lbl.includes('0.5') ||
          lbl.includes('0.6') ||
          lbl.includes('zoom') ||
          lbl.includes('wide-angle') ||
          lbl.includes('aux') ||
          lbl.includes('bokeh');
        return !isExcluded;
      });
      if (mainBack?.deviceId) return mainBack.deviceId;

      // Fallback: first back device
      if (backDevices[0]?.deviceId) return backDevices[0].deviceId;

      return undefined;
    }
  } catch (err) {
    console.warn('[useAgora] getOptimalCameraId error:', err);
    return undefined;
  }
}

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

export const useAgora = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);

  // Fallback MediaStream and elements
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackVideoElRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElRef = useRef<HTMLVideoElement | null>(null);

  // Fallback WebRTC P2P connections
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<any>(null);
  const streamIdRef = useRef<string | null>(null);
  const cleanupSignalingRef = useRef<(() => void) | null>(null);

  const cameraOnRef = useRef(false);
  const micOnRef = useRef(false);
  const facingModeRef = useRef<'user' | 'environment'>('user');
  const joiningRef = useRef(false);
  const togglingMicRef = useRef(false);
  const networkLostRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

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
        if (!peerSocketId || !fallbackStreamRef.current) return;
        try {
          // Close existing connection to this peer if any
          const existingPc = peerConnectionsRef.current.get(peerSocketId);
          if (existingPc) existingPc.close();

          const pc = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionsRef.current.set(peerSocketId, pc);

          fallbackStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, fallbackStreamRef.current!);
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
        if (pc && answer) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[useAgora] Failed to set remote description from viewer:', e);
          }
        }
      };

      const onSignalCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: any }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[useAgora] Failed to add ICE candidate from viewer:', e);
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
          facingModeRef.current = 'user';
          setFacingMode('user');

          const targetDeviceId = await getOptimalCameraId('user');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: (role === 'host' && videoEnabled) ? {
              deviceId: targetDeviceId ? { ideal: targetDeviceId } : undefined,
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            } : false,
            audio: shouldMicOn,
          });
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

      // If no valid Agora App ID is provided or in dev placeholder, gracefully fallback to local WebRTC
      if (!appId || appId === '89383e4dfc4a43a4954a30fa9984b4f6' || appId.trim() === '') {
        console.warn('[useAgora] No valid Agora App ID provided. Using browser WebRTC live relay mode.');
        await initLocalMediaFallback(videoEnabled, role, socket, streamId, shouldMicOn);
        return null;
      }

      joiningRef.current = true;
      const client = AgoraRTC.createClient({ mode: 'live', codec: 'vp8' });
      clientRef.current = client;

      // Set initial Agora client role: if host or shouldMicOn is true, 'host', otherwise 'audience'
      const initialClientRole = (role === 'host' || shouldMicOn) ? 'host' : 'audience';
      await client.setClientRole(initialClientRole);

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
        if (cur === 'DISCONNECTED' && prev !== 'DISCONNECTED') {
          if (!networkLostRef.current) {
            networkLostRef.current = true;
            setError('Connection lost ΓÇö reconnectingΓÇª');
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
            let container = document.getElementById(`remote-container-${user.uid}`);
            if (!container) {
              container = document.createElement('div');
              container.id = `remote-container-${user.uid}`;
              container.className = 'absolute inset-0 w-full h-full';
              const videoArea = document.getElementById('agora-video-area');
              if (videoArea) videoArea.appendChild(container);
            }
            user.videoTrack?.play(container);
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
        await client.join(appId, channel, token, uid ?? 0);

        if (role === 'host' && videoEnabled) {
          facingModeRef.current = 'user';
          setFacingMode('user');

          const targetDeviceId = await getOptimalCameraId('user');
          const videoTrack = await AgoraRTC.createCameraVideoTrack({
            facingMode: 'user',
            cameraId: targetDeviceId,
            encoderConfig: { width: 640, height: 480, frameRate: 30 },
            optimizationMode: 'motion',
          });
          localVideoRef.current = videoTrack;
          cameraOnRef.current = true;
          setCameraOn(true);
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
      // 1. If Agora native track is available
      if (localVideoRef.current) {
        try {
          localVideoRef.current.play(containerId);
          return;
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
            videoEl.srcObject = fallbackStreamRef.current;
            container.appendChild(videoEl);
            fallbackVideoElRef.current = videoEl;
          } else if (fallbackVideoElRef.current.parentElement !== container) {
            container.appendChild(fallbackVideoElRef.current);
          }
          return;
        }
      }

      if (attempt < 5) {
        setTimeout(() => tryPlay(attempt + 1), 300 * (attempt + 1));
      }
    };
    tryPlay(0);
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

          if (!localAudioRef.current) {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              ANS: true,
              AGC: true,
            });
            localAudioRef.current = audioTrack;
            await clientRef.current.publish([audioTrack]);
            await audioTrack.setEnabled(true);
            if (typeof (audioTrack as any).setMuted === 'function') {
              await (audioTrack as any).setMuted(false);
            }
          } else {
            const isPublished = clientRef.current.localTracks.includes(localAudioRef.current);
            if (!isPublished) {
              await clientRef.current.publish([localAudioRef.current]);
            }
            await localAudioRef.current.setEnabled(true);
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
        // Turning mic OFF
        if (localAudioRef.current) {
          try {
            await localAudioRef.current.setEnabled(false);
            if (typeof (localAudioRef.current as any).setMuted === 'function') {
              await (localAudioRef.current as any).setMuted(true);
            }
          } catch (e) {
            console.warn('live mic disable error:', e);
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
      const isPermErr = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.code === 'PERMISSION_DENIED';
      const errMsg = isPermErr
        ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
        : 'Failed to access microphone. Please check your audio device.';
      setError(errMsg);
      return false;
    } finally {
      togglingMicRef.current = false;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    const currentMode = facingModeRef.current;
    const targetFacing: 'user' | 'environment' = currentMode === 'user' ? 'environment' : 'user';

    console.log(`[useAgora] switchCamera: ${currentMode} -> ${targetFacing}`);

    // 1. Agora camera track
    if (localVideoRef.current) {
      try {
        const targetDeviceId = await getOptimalCameraId(targetFacing);
        let switched = false;

        // Attempt setDevice using exact target deviceId
        if (targetDeviceId && typeof (localVideoRef.current as any).setDevice === 'function') {
          try {
            await (localVideoRef.current as any).setDevice(targetDeviceId);
            switched = true;
          } catch (devErr) {
            console.warn('[useAgora] setDevice with deviceId failed:', devErr);
          }
        }

        // Fallback: setDevice using facingMode object
        if (!switched && typeof (localVideoRef.current as any).setDevice === 'function') {
          try {
            await (localVideoRef.current as any).setDevice({ facingMode: targetFacing });
            switched = true;
          } catch (facingErr) {
            console.warn('[useAgora] setDevice with facingMode failed:', facingErr);
          }
        }

        // If setDevice failed (common on mobile Android WebViews when changing camera sensor), recreate track cleanly
        if (!switched) {
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

          // Brief pause for Android Camera2 service to release hardware lock
          await new Promise((resolve) => setTimeout(resolve, 150));

          const newTrack = await AgoraRTC.createCameraVideoTrack({
            facingMode: targetFacing,
            cameraId: targetDeviceId,
            encoderConfig: { width: 640, height: 480, frameRate: 30 },
            optimizationMode: 'motion',
          });

          localVideoRef.current = newTrack;
          if (clientRef.current) {
            try {
              await clientRef.current.publish([newTrack]);
            } catch (pubErr) {
              console.warn('[useAgora] publish new track error:', pubErr);
            }
          }
        }

        facingModeRef.current = targetFacing;
        setFacingMode(targetFacing);

        const videoArea = document.getElementById('agora-video-area');
        if (videoArea && localVideoRef.current) {
          try {
            localVideoRef.current.play(videoArea);
          } catch {}
        }
        return;
      } catch (e) {
        console.warn('[useAgora] Agora switch camera error:', e);
      }
    }

    // 2. WebRTC Fallback device switch
    if (fallbackStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const targetDeviceId = await getOptimalCameraId(targetFacing);
        const oldTrack = fallbackStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
        }

        let newStream: MediaStream | null = null;
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
              facingMode: targetFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: targetFacing,
            },
            audio: false,
          });
        }

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          if (oldTrack) {
            fallbackStreamRef.current.removeTrack(oldTrack);
          }
          fallbackStreamRef.current.addTrack(newVideoTrack);
          if (fallbackVideoElRef.current) {
            fallbackVideoElRef.current.srcObject = fallbackStreamRef.current;
            try {
              fallbackVideoElRef.current.play().catch(() => {});
            } catch {}
          }
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
        localVideoRef.current.stop();
        localVideoRef.current.close();
        localVideoRef.current = null;
      }
      if (localAudioRef.current) {
        localAudioRef.current.stop();
        localAudioRef.current.close();
        localAudioRef.current = null;
      }
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current = null;
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
    micOnRef,
    remoteUsers,
    error,
    joinChannel,
    playLocalVideo,
    toggleCamera,
    toggleMic,
    switchCamera,
    refreshVideoTracks: (containerId: string = 'agora-video-area') => {
      if (localVideoRef.current) {
        try {
          localVideoRef.current.play(containerId);
        } catch {}
      }
    },
    facingMode,
    setMirror: (_mirror: boolean) => {},
    getLocalStream: () => {
      if (fallbackStreamRef.current && fallbackStreamRef.current.getTracks().length > 0) {
        return fallbackStreamRef.current;
      }
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
        return new MediaStream(tracks);
      }
      return null;
    },
    applyBeautyOptions: async (_smoothness: number, _whitening: number) => {},
    leaveChannel,
  };
};

export function getScreenCaptureResolution() {
  return {
    width: 640,
    height: 480,
    aspectRatio: 9 / 16,
    screenRatio: 16 / 9,
    isPortrait: true,
  };
}
