import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, ILocalAudioTrack, UID } from 'agora-rtc-sdk-ng';

try {
  AgoraRTC.disableLogUpload();
  AgoraRTC.setLogLevel(2);
} catch {}

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID || 'b0b508017ff54158a6e30f30c7cbea98';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

interface UseCallOptions {
  channel: string;
  token: string;
  type: 'audio' | 'video';
  socket?: any;
  callId?: string;
  currentUserId?: string;
}

export interface CallChatMessage {
  id: string;
  callId: string;
  senderId: string;
  sender: {
    _id?: string;
    nickname: string;
    avatar?: string;
  };
  text: string;
  createdAt: string;
}

/**
 * Resolves whether a camera feed should be mirrored horizontally.
 * When mirror is enabled by user, both front and back cameras are mirrored horizontally.
 */
const shouldMirrorFeed = (facingMode: 'user' | 'environment', mirrorEnabled: boolean) => {
  return mirrorEnabled && facingMode === 'user';
};

/**
 * Cross-browser video mirror styler.
 * Directly applies scaleX(-1) / none with !important to guarantee exact mirroring
 * across Agora and WebRTC video tracks on both front and rear cameras.
 */
const setElementMirror = (container: HTMLElement | null, mirror: boolean) => {
  if (!container) return;
  if (mirror) {
    container.classList.add('video-mirrored');
    container.classList.remove('video-unmirrored');
  } else {
    container.classList.add('video-unmirrored');
    container.classList.remove('video-mirrored');
  }
  const videoEl = container.querySelector('video');
  if (videoEl) {
    const transformVal = mirror ? 'scaleX(-1)' : 'none';
    videoEl.style.setProperty('transform', transformVal, 'important');
    videoEl.style.setProperty('-webkit-transform', transformVal, 'important');
  }
};

/**
 * 1:1 and group audio/video calls over Agora with WebRTC fallback.
 * Tracks (audio/video) are managed independently to prevent black-screens on mic toggles.
 * Supports camera flipping (switchCamera), beauty filters, and live in-call messaging.
 */
export const useCall = () => {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackVideoElRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteVideoTracksRef = useRef<Map<UID, any>>(new Map());
  const remoteAudioTracksRef = useRef<Map<UID, any>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteFacingModesRef = useRef<Map<string, 'user' | 'environment'>>(new Map());

  const joinedRef = useRef(false);
  const micOnRef = useRef(true);
  const cameraOnRef = useRef(true);
  const speakerOnRef = useRef(false);
  const mirrorOnRef = useRef(true);
  const remoteMirrorRef = useRef(true);
  const joiningRef = useRef(false);
  const networkLostRef = useRef(false);
  const currentFacingModeRef = useRef<'user' | 'environment'>('user');
  const socketRef = useRef<any>(null);
  const callIdRef = useRef<string>('');

  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [mirrorOn, setMirrorOn] = useState(true);
  const [remoteMirror, setRemoteMirror] = useState(true);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [remoteFacingMode, setRemoteFacingMode] = useState<'user' | 'environment'>('user');
  const [connectionState, setConnectionState] = useState<'IDLE' | 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>('IDLE');

  /** Remove every per-UID remote container from the call video area. */
  const clearRemoteContainers = useCallback(() => {
    const area = document.getElementById('call-video-area');
    if (!area) return;
    area.querySelectorAll('[id^="remote-container-"]').forEach((el) => el.remove());
  }, []);

  /**
   * Dedicated remote video player that plays into either the provided target element or the DOM container.
   * Auto-retries smoothly if React is still rendering the container.
   */
  const playRemoteVideo = useCallback((uid: UID, targetEl?: HTMLElement | null) => {
    const play = (attempt = 0) => {
      const container = targetEl || document.getElementById(`remote-container-${uid}`);
      if (!container) {
        if (attempt < 15) {
          setTimeout(() => play(attempt + 1), 120);
        }
        return;
      }

      const remoteFacing = remoteFacingModesRef.current.get(String(uid)) || remoteFacingMode || 'user';
      const shouldMirror = shouldMirrorFeed(remoteFacing, remoteMirrorRef.current);

      // 1. Check Agora remote video track
      const track = remoteVideoTracksRef.current.get(uid);
      if (track) {
        try {
          track.play(container, { fit: 'cover', mirror: shouldMirror });
          setElementMirror(container, shouldMirror);
          setTimeout(() => setElementMirror(container, shouldMirror), 150);
          setTimeout(() => setElementMirror(container, shouldMirror), 350);
          return;
        } catch (e) {
          console.warn('[useCall] Agora video play error:', e);
        }
      }

      // 2. Check WebRTC fallback remote stream
      const stream = remoteStreamsRef.current.get(String(uid));
      if (stream) {
        let videoEl = container.querySelector('video') as HTMLVideoElement | null;
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.muted = false;
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'cover';
          container.appendChild(videoEl);
        }
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
        setElementMirror(container, shouldMirror);
        videoEl.play().catch(() => {});
        return;
      }

      if (attempt < 15) {
        setTimeout(() => play(attempt + 1), 150);
      }
    };

    play(0);
  }, []);

  /**
   * Adjusts audio output route and volume between Loudspeaker (external speaker / 100% volume)
   * and Earpiece/Normal mode (receiver / 35% volume).
   */
  const applyAudioOutputRoute = useCallback(async (isLoud: boolean) => {
    // 1. Set Agora remote audio tracks volume (100 for loud speaker, 35 for earpiece)
    remoteAudioTracksRef.current.forEach((track) => {
      try {
        if (typeof track.setVolume === 'function') {
          track.setVolume(isLoud ? 100 : 35);
        }
      } catch (e) {
        console.warn('[useCall] setVolume error:', e);
      }
    });

    // 2. Adjust volume on HTMLMediaElements for WebRTC fallback and Agora media
    try {
      const mediaEls = document.querySelectorAll<HTMLMediaElement>('audio, video');
      mediaEls.forEach((el) => {
        if (!el.muted) {
          el.volume = isLoud ? 1.0 : 0.35;
        }
      });
    } catch {}

    // 3. Hardware device routing via setPlaybackDevice / setSinkId when supported by browser
    try {
      if (typeof AgoraRTC.getPlaybackDevices === 'function') {
        const devices = await AgoraRTC.getPlaybackDevices();
        if (devices && devices.length > 0) {
          const targetDevice = isLoud
            ? devices.find((d) => /speaker|loudspeaker|external|built-in speaker/i.test(d.label)) || devices[0]
            : devices.find((d) => /earpiece|headset|earphone|receiver|communication/i.test(d.label)) || devices[0];

          if (targetDevice?.deviceId) {
            remoteAudioTracksRef.current.forEach(async (track) => {
              try {
                if (typeof track.setPlaybackDevice === 'function') {
                  await track.setPlaybackDevice(targetDevice.deviceId);
                }
              } catch {}
            });

            const mediaEls = document.querySelectorAll<HTMLMediaElement>('audio, video');
            mediaEls.forEach(async (el) => {
              if (typeof (el as any).setSinkId === 'function' && !el.muted) {
                try {
                  await (el as any).setSinkId(targetDevice.deviceId);
                } catch {}
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('[useCall] audio output route error:', e);
    }
  }, []);

  // WebRTC P2P fallback signaling setup
  const setupWebRTCFallback = useCallback(
    (socket: any, callId: string) => {
      if (!socket || !callId) return;
      socketRef.current = socket;
      callIdRef.current = callId;

      const onSignalOffer = async ({ fromSocketId, offer }: { fromSocketId: string; offer: any }) => {
        if (!offer || fromSocketId === socket.id) return;
        try {
          const pc = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionsRef.current.set(fromSocketId, pc);

          if (fallbackStreamRef.current) {
            fallbackStreamRef.current.getTracks().forEach((track) => {
              pc.addTrack(track, fallbackStreamRef.current!);
            });
          }

          pc.ontrack = (event) => {
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            remoteStreamsRef.current.set(fromSocketId, remoteStream);
            setRemoteUsers((prev) => (prev.includes(fromSocketId as any) ? prev : [...prev, fromSocketId as any]));
            playRemoteVideo(fromSocketId as any);
            applyAudioOutputRoute(speakerOnRef.current);
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
              socketRef.current.emit('call:signal:candidate', {
                callId,
                toSocketId: fromSocketId,
                candidate: event.candidate,
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal:answer', {
            callId,
            toSocketId: fromSocketId,
            answer,
          });
        } catch (e) {
          console.warn('[useCall] Fallback WebRTC offer error:', e);
        }
      };

      const onSignalAnswer = async ({ fromSocketId, answer }: { fromSocketId: string; answer: any }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && answer) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[useCall] Fallback WebRTC answer error:', e);
          }
        }
      };

      const onSignalCandidate = async ({ fromSocketId, candidate }: { fromSocketId: string; candidate: any }) => {
        const pc = peerConnectionsRef.current.get(fromSocketId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[useCall] Fallback ICE candidate error:', e);
          }
        }
      };

      socket.on('call:signal:offer', onSignalOffer);
      socket.on('call:signal:answer', onSignalAnswer);
      socket.on('call:signal:candidate', onSignalCandidate);
    },
    [playRemoteVideo]
  );

  const setupCameraSyncListeners = useCallback((socket: any, callId: string) => {
    if (!socket || !callId) return;
    socketRef.current = socket;
    callIdRef.current = callId;

    // Join room so socket receives broadcasts for this call
    socket.emit('call:join-room', { callId });

    const applyRemoteMirror = (mirror: boolean = remoteMirrorRef.current) => {
      document.querySelectorAll('[id^="remote-container-"]').forEach((container) => {
        setElementMirror(container as HTMLElement, mirror);
        setTimeout(() => setElementMirror(container as HTMLElement, mirror), 150);
        setTimeout(() => setElementMirror(container as HTMLElement, mirror), 350);
      });
    };

    socket.off('call:camera:facingMode');
    socket.on('call:camera:facingMode', ({ facingMode, senderId }: { facingMode: 'user' | 'environment'; senderId?: string }) => {
      setRemoteFacingMode(facingMode);
      if (senderId) {
        remoteFacingModesRef.current.set(String(senderId), facingMode);
      }
      applyRemoteMirror();
    });

    socket.off('call:camera:mirror');
    socket.on('call:camera:mirror', ({ mirror }: { mirror: boolean }) => {
      remoteMirrorRef.current = mirror;
      setRemoteMirror(mirror);
      applyRemoteMirror(mirror);
    });

    // Broadcast our initial camera state to the room
    socket.emit('call:camera:facingMode', {
      callId,
      facingMode: currentFacingModeRef.current,
    });
    socket.emit('call:camera:mirror', {
      callId,
      mirror: mirrorOnRef.current,
    });
  }, []);

  const broadcastCameraState = useCallback(() => {
    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:join-room', { callId: callIdRef.current });
      socketRef.current.emit('call:camera:facingMode', {
        callId: callIdRef.current,
        facingMode: currentFacingModeRef.current,
      });
      socketRef.current.emit('call:camera:mirror', {
        callId: callIdRef.current,
        mirror: mirrorOnRef.current,
      });
    }
  }, []);

  const initLocalMediaFallback = useCallback(
    async (type: 'audio' | 'video', socket?: any, callId?: string) => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video' ? {
              facingMode: currentFacingModeRef.current,
              width: { ideal: 640 },
              height: { ideal: 480 },
            } : false,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          fallbackStreamRef.current = stream;
          cameraOnRef.current = type === 'video';
          micOnRef.current = true;
          setCameraOn(type === 'video');
          setMicOn(true);

          // Play local video preview
          const playFallbackPreview = (attempt = 0) => {
            const container = document.getElementById('call-local-video-container');
            if (container) {
              if (!fallbackVideoElRef.current) {
                const videoEl = document.createElement('video');
                videoEl.autoplay = true;
                videoEl.muted = true;
                videoEl.playsInline = true;
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = 'cover';
                videoEl.srcObject = stream;
                container.appendChild(videoEl);
                fallbackVideoElRef.current = videoEl;
              } else {
                fallbackVideoElRef.current.srcObject = stream;
                if (fallbackVideoElRef.current.parentElement !== container) {
                  container.appendChild(fallbackVideoElRef.current);
                }
              }
              const shouldMirror = shouldMirrorFeed(currentFacingModeRef.current, mirrorOnRef.current);
              setElementMirror(container, shouldMirror);
            } else if (attempt < 15) {
              setTimeout(() => playFallbackPreview(attempt + 1), 120);
            }
          };
          playFallbackPreview();
        }
      } catch (e: any) {
        console.warn('[useCall] getUserMedia fallback error:', e);
      }

      const defaultSpeaker = type === 'video';
      speakerOnRef.current = defaultSpeaker;
      setSpeakerOn(defaultSpeaker);

      if (socket && callId) {
        setupCameraSyncListeners(socket, callId);
        setupWebRTCFallback(socket, callId);
      }
      applyAudioOutputRoute(defaultSpeaker);

      setJoined(true);
      joinedRef.current = true;
      setConnectionState('CONNECTED');
    },
    [setupWebRTCFallback, setupCameraSyncListeners, applyAudioOutputRoute]
  );

  const playLocalPreview = useCallback(() => {
    const tryPlay = (attempt: number) => {
      const el = document.getElementById('call-local-video-container');
      if (el) {
        const shouldMirror = shouldMirrorFeed(currentFacingModeRef.current, mirrorOnRef.current);
        if (localVideoRef.current) {
          try {
            localVideoRef.current.play(el, { fit: 'cover', mirror: shouldMirror });
          } catch {
            // retry
          }
          setElementMirror(el, shouldMirror);
          setTimeout(() => setElementMirror(el, shouldMirror), 150);
          setTimeout(() => setElementMirror(el, shouldMirror), 350);
          setTimeout(() => setElementMirror(el, shouldMirror), 700);
          setTimeout(() => setElementMirror(el, shouldMirror), 1200);
        } else if (fallbackStreamRef.current) {
          if (!fallbackVideoElRef.current) {
            const videoEl = document.createElement('video');
            videoEl.autoplay = true;
            videoEl.muted = true;
            videoEl.playsInline = true;
            videoEl.style.width = '100%';
            videoEl.style.height = '100%';
            videoEl.style.objectFit = 'cover';
            videoEl.srcObject = fallbackStreamRef.current;
            el.appendChild(videoEl);
            fallbackVideoElRef.current = videoEl;
          } else if (fallbackVideoElRef.current.parentElement !== el) {
            el.appendChild(fallbackVideoElRef.current);
          }
          setElementMirror(el, shouldMirror);
          setTimeout(() => setElementMirror(el, shouldMirror), 150);
        }
      } else if (attempt < 15) {
        setTimeout(() => tryPlay(attempt + 1), 120);
      }
    };
    tryPlay(0);
  }, []);

  const startCall = useCallback(
    async ({ channel, token, type, socket, callId }: UseCallOptions) => {
      if (joinedRef.current || joiningRef.current) return;
      joiningRef.current = true;
      setError('');

      const defaultSpeaker = type === 'video';
      speakerOnRef.current = defaultSpeaker;
      setSpeakerOn(defaultSpeaker);

      if (socket && callId) {
        setupCameraSyncListeners(socket, callId);
      }

      try {
        if (!clientRef.current) {
          const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
          clientRef.current = client;

          client.on('user-published', async (user, mediaType) => {
            try {
              await client.subscribe(user, mediaType);
              if (mediaType === 'video' && user.videoTrack) {
                remoteVideoTracksRef.current.set(user.uid, user.videoTrack);
                setRemoteUsers((prev) => (prev.includes(user.uid) ? prev : [...prev, user.uid]));
                playRemoteVideo(user.uid);
                broadcastCameraState();
              }
              if (mediaType === 'audio' && user.audioTrack) {
                remoteAudioTracksRef.current.set(user.uid, user.audioTrack);
                try {
                  user.audioTrack.setVolume(speakerOnRef.current ? 100 : 35);
                } catch {}
                user.audioTrack.play();
                applyAudioOutputRoute(speakerOnRef.current);
              }
            } catch (e) {
              console.warn('call subscribe/play error:', e);
            }
          });

          client.on('user-unpublished', (user, mediaType) => {
            if (mediaType === 'video') {
              remoteVideoTracksRef.current.delete(user.uid);
              setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
            }
            if (mediaType === 'audio') {
              remoteAudioTracksRef.current.delete(user.uid);
            }
          });

          client.on('user-left', (user) => {
            remoteVideoTracksRef.current.delete(user.uid);
            remoteAudioTracksRef.current.delete(user.uid);
            remoteStreamsRef.current.delete(String(user.uid));
            setRemoteUsers((prev) => prev.filter((id) => id !== user.uid));
          });

          client.on('connection-state-change', (cur, prev) => {
            if (!joinedRef.current) return;
            setConnectionState(cur as any);

            if (cur === 'RECONNECTING') {
              if (!networkLostRef.current) {
                networkLostRef.current = true;
                setError('Connection lost — reconnecting…');
              }
            } else if (cur === 'CONNECTED') {
              networkLostRef.current = false;
              setError('');
            } else if (cur === 'DISCONNECTED') {
              if ((prev === 'CONNECTED' || prev === 'RECONNECTING') && joinedRef.current) {
                setError('Connection lost — reconnecting…');
              }
            }
          });
        }


        const client = clientRef.current;
        setConnectionState('CONNECTING');
        await client.join(AGORA_APP_ID, channel, token, undefined);
        joinedRef.current = true;
        setJoined(true);
        setConnectionState('CONNECTED');

        // Check for any already published remote users on join (important when answering an existing call)
        for (const remoteUser of client.remoteUsers) {
          if (remoteUser.hasVideo) {
            try {
              await client.subscribe(remoteUser, 'video');
              if (remoteUser.videoTrack) {
                remoteVideoTracksRef.current.set(remoteUser.uid, remoteUser.videoTrack);
                setRemoteUsers((prev) => (prev.includes(remoteUser.uid) ? prev : [...prev, remoteUser.uid]));
                playRemoteVideo(remoteUser.uid);
              }
            } catch (e) {
              console.warn('Initial remote video subscribe error:', e);
            }
          }
          if (remoteUser.hasAudio) {
            try {
              await client.subscribe(remoteUser, 'audio');
              if (remoteUser.audioTrack) {
                remoteAudioTracksRef.current.set(remoteUser.uid, remoteUser.audioTrack);
                try {
                  remoteUser.audioTrack.setVolume(speakerOnRef.current ? 100 : 35);
                } catch {}
                remoteUser.audioTrack.play();
                applyAudioOutputRoute(speakerOnRef.current);
              }
            } catch (e) {
              console.warn('Initial remote audio subscribe error:', e);
            }
          }
        }

        const tracksToPublish: any[] = [];

        // 1. Microphone track (with graceful error handling)
        try {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
          localAudioRef.current = audioTrack;
          micOnRef.current = true;
          setMicOn(true);
          tracksToPublish.push(audioTrack);
        } catch (audioErr) {
          console.warn('[useCall] Microphone permission or capture failed:', audioErr);
          micOnRef.current = false;
          setMicOn(false);
        }

        // 2. Camera track (with graceful error handling)
        if (type === 'video') {
          try {
            const videoTrack = await AgoraRTC.createCameraVideoTrack({
              encoderConfig: { width: 640, height: 480, frameRate: 30 },
              facingMode: currentFacingModeRef.current,
            });
            localVideoRef.current = videoTrack;
            cameraOnRef.current = true;
            setCameraOn(true);
            tracksToPublish.push(videoTrack);
            playLocalPreview();
          } catch (videoErr) {
            console.warn('[useCall] Camera permission or capture failed:', videoErr);
            cameraOnRef.current = false;
            setCameraOn(false);
          }
        }

        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
        }
      } catch (err: any) {
        if (err?.name === 'OPERATION_ABORTED' || err?.code === 'OPERATION_ABORTED' || String(err?.message || err).includes('OPERATION_ABORTED')) {
          // Token or connection was intentionally cancelled on teardown
          return;
        }
        console.warn('[useCall] Agora RTC connect error, falling back to WebRTC:', err?.message || err);
        // Fallback gracefully so call never breaks
        await initLocalMediaFallback(type, socket, callId);
      } finally {
        joiningRef.current = false;
      }
    },
    [initLocalMediaFallback, playLocalPreview, playRemoteVideo, applyAudioOutputRoute]
  );

  const toggleMic = useCallback(async () => {
    const next = !micOnRef.current;
    micOnRef.current = next;
    setMicOn(next);

    // 1. If Agora local audio track exists, mute/unmute it without touching video
    if (localAudioRef.current) {
      try {
        await localAudioRef.current.setEnabled(next);
      } catch (e) {
        console.warn('[useCall] Agora mic toggle error:', e);
      }
    }

    // 2. Fallback stream audio tracks
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  }, []);

  const toggleSpeaker = useCallback(async () => {
    const next = !speakerOnRef.current;
    speakerOnRef.current = next;
    setSpeakerOn(next);
    await applyAudioOutputRoute(next);
    return next;
  }, [applyAudioOutputRoute]);

  const setSpeaker = useCallback(
    async (enabled: boolean) => {
      speakerOnRef.current = enabled;
      setSpeakerOn(enabled);
      await applyAudioOutputRoute(enabled);
    },
    [applyAudioOutputRoute]
  );

  const toggleCamera = useCallback(async () => {
    const next = !cameraOnRef.current;
    cameraOnRef.current = next;
    setCameraOn(next);

    // 1. Agora video track
    if (localVideoRef.current) {
      try {
        await localVideoRef.current.setEnabled(next);
      } catch (e) {
        console.warn('[useCall] Agora camera toggle error:', e);
      }
    }

    // 2. Fallback stream video tracks
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }
  }, []);

  /** Switch / flip camera between user (front) and environment (rear) directly without secondary lens hopping */
  const switchCamera = useCallback(async () => {
    const nextMode = currentFacingModeRef.current === 'user' ? 'environment' : 'user';
    currentFacingModeRef.current = nextMode;
    setFacingMode(nextMode);

    // Notify remote participant about camera facing mode and mirror state
    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:join-room', { callId: callIdRef.current });
      socketRef.current.emit('call:camera:facingMode', {
        callId: callIdRef.current,
        facingMode: nextMode,
      });
      socketRef.current.emit('call:camera:mirror', {
        callId: callIdRef.current,
        mirror: mirrorOnRef.current,
      });
    }

    const baseVideoConfig = {
      width: { ideal: 640 },
      height: { ideal: 480 },
    };

    let newMediaTrack: MediaStreamTrack | null = null;
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        // exact facingMode prevents mobile browsers from selecting secondary/wide/tele back lenses
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...baseVideoConfig,
            facingMode: { exact: nextMode },
          },
          audio: false,
        });
        newMediaTrack = stream.getVideoTracks()[0] || null;
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              ...baseVideoConfig,
              facingMode: nextMode,
            },
            audio: false,
          });
          newMediaTrack = stream.getVideoTracks()[0] || null;
        } catch (e) {
          console.warn('[useCall] switchCamera getUserMedia fallback error:', e);
        }
      }
    }

    // 1. Agora camera switch
    if (localVideoRef.current) {
      try {
        if (newMediaTrack && typeof (localVideoRef.current as any).replaceTrack === 'function') {
          await (localVideoRef.current as any).replaceTrack(newMediaTrack, true);
        } else {
          try {
            await (localVideoRef.current as any).setDevice({ facingMode: nextMode });
          } catch {
            const devices = await AgoraRTC.getCameras();
            const target = devices.find((d) => {
              const lbl = (d.label || '').toLowerCase();
              return nextMode === 'user'
                ? /front|user|facetime|selfie|forward/i.test(lbl) || /camera2?\s*1\b/i.test(lbl)
                : (/back|rear|environment|world/i.test(lbl) || /camera2?\s*0\b/i.test(lbl)) &&
                    !lbl.includes('tele') && !lbl.includes('macro') && !lbl.includes('depth') && !lbl.includes('zoom');
            }) || devices[0];
            if (target?.deviceId) {
              await localVideoRef.current.setDevice(target.deviceId);
            }
          }
        }

        const shouldMirror = mirrorOnRef.current;
        // Replay local preview with mirror configuration
        const el = document.getElementById('call-local-video-container');
        if (el) {
          try {
            localVideoRef.current.stop();
          } catch {}
          try {
            localVideoRef.current.play(el, { fit: 'cover', mirror: shouldMirror });
          } catch {}
          setElementMirror(el, shouldMirror);
          setTimeout(() => setElementMirror(el, shouldMirror), 150);
          setTimeout(() => setElementMirror(el, shouldMirror), 350);
          setTimeout(() => setElementMirror(el, shouldMirror), 700);
          setTimeout(() => setElementMirror(el, shouldMirror), 1200);
        }
        return;
      } catch (e) {
        console.warn('[useCall] Agora switch camera error:', e);
      }
    }

    // 2. WebRTC Fallback camera switch
    if (fallbackStreamRef.current && newMediaTrack) {
      try {
        const oldTrack = fallbackStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          fallbackStreamRef.current.removeTrack(oldTrack);
        }
        fallbackStreamRef.current.addTrack(newMediaTrack);

        if (fallbackVideoElRef.current) {
          fallbackVideoElRef.current.srcObject = fallbackStreamRef.current;
        }
        const el = document.getElementById('call-local-video-container');
        if (el) {
          const shouldMirror = mirrorOnRef.current;
          setElementMirror(el, shouldMirror);
          setTimeout(() => setElementMirror(el, shouldMirror), 150);
          setTimeout(() => setElementMirror(el, shouldMirror), 350);
          setTimeout(() => setElementMirror(el, shouldMirror), 700);
          setTimeout(() => setElementMirror(el, shouldMirror), 1200);
        }

        peerConnectionsRef.current.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(newMediaTrack!).catch(() => {});
          }
        });
      } catch (e) {
        console.warn('[useCall] Fallback switch camera error:', e);
      }
    }
  }, []);

  const toggleMirror = useCallback(() => {
    const next = !mirrorOnRef.current;
    mirrorOnRef.current = next;
    setMirrorOn(next);

    // 1. Immediately apply mirror transform to local preview
    const localEl = document.getElementById('call-local-video-container');
    if (localEl) {
      const shouldMirror = shouldMirrorFeed(currentFacingModeRef.current, next);
      setElementMirror(localEl, shouldMirror);
      setTimeout(() => setElementMirror(localEl, shouldMirror), 150);
      setTimeout(() => setElementMirror(localEl, shouldMirror), 350);
    }
    playLocalPreview();

    // 2. Broadcast mirror mode to remote peer via socket so output mirrors identically
    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:join-room', { callId: callIdRef.current });
      socketRef.current.emit('call:camera:mirror', {
        callId: callIdRef.current,
        mirror: next,
      });
    }
  }, [playLocalPreview]);

  const endCall = useCallback(async () => {
    joinedRef.current = false;
    joiningRef.current = false;
    networkLostRef.current = false;
    setError('');

    try {
      socketRef.current?.off('call:camera:facingMode');
      socketRef.current?.off('call:camera:mirror');
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      remoteAudioTracksRef.current.clear();
      remoteFacingModesRef.current.clear();

      if (localVideoRef.current) {
        localVideoRef.current.close();
        localVideoRef.current = null;
      }
      if (localAudioRef.current) {
        localAudioRef.current.close();
        localAudioRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        await clientRef.current.leave().catch(() => {});
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
    } catch (e) {
      console.warn('call leave error:', e);
    }
    setJoined(false);
    setConnectionState('IDLE');
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
      joinedRef.current = false;
      joiningRef.current = false;
      networkLostRef.current = false;

      socketRef.current?.off('call:camera:facingMode');
      socketRef.current?.off('call:camera:mirror');
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      remoteAudioTracksRef.current.clear();
      remoteFacingModesRef.current.clear();
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      if (fallbackStreamRef.current) {
        fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave().catch(() => {});
        clientRef.current = null;
      }
      clearRemoteContainers();
    };
  }, [clearRemoteContainers]);


  return {
    joined,
    remoteUsers,
    micOn,
    cameraOn,
    speakerOn,
    mirrorOn,
    remoteMirror,
    facingMode,
    remoteFacingMode,
    connectionState,
    error,
    startCall,
    toggleMic,
    toggleCamera,
    toggleSpeaker,
    toggleMirror,
    setSpeaker,
    switchCamera,
    broadcastCameraState,
    playLocalPreview,
    playRemoteVideo,
    endCall,
  };
};
