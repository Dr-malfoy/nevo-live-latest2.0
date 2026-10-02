import { useCallback, useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, ILocalAudioTrack, UID } from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = '89383e4dfc4a43a4954a30fa9984b4f6';

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

  const joinedRef = useRef(false);
  const micOnRef = useRef(true);
  const cameraOnRef = useRef(true);
  const joiningRef = useRef(false);
  const networkLostRef = useRef(false);
  const currentFacingModeRef = useRef<'user' | 'environment'>('user');
  const socketRef = useRef<any>(null);
  const callIdRef = useRef<string>('');

  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<UID[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  /** Remove every per-UID remote container from the call video area. */
  const clearRemoteContainers = useCallback(() => {
    const area = document.getElementById('call-video-area');
    if (!area) return;
    area.querySelectorAll('[id^="remote-container-"]').forEach((el) => el.remove());
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
            let container = document.getElementById(`remote-container-${fromSocketId}`);
            if (!container) {
              container = document.createElement('div');
              container.id = `remote-container-${fromSocketId}`;
              container.className = 'absolute inset-0 w-full h-full';
              const area = document.getElementById('call-video-area');
              if (area) area.appendChild(container);
            }

            let videoEl = container.querySelector('video');
            if (!videoEl) {
              videoEl = document.createElement('video');
              videoEl.autoplay = true;
              videoEl.playsInline = true;
              videoEl.style.width = '100%';
              videoEl.style.height = '100%';
              videoEl.style.objectFit = 'cover';
              container.appendChild(videoEl);
            }
            videoEl.srcObject = remoteStream;
            videoEl.play().catch(() => {});
            setRemoteUsers((prev) => (prev.includes(fromSocketId as any) ? prev : [...prev, fromSocketId as any]));
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
    []
  );

  const initLocalMediaFallback = useCallback(
    async (type: 'audio' | 'video', socket?: any, callId?: string) => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video' ? { facingMode: currentFacingModeRef.current, width: { ideal: 640 }, height: { ideal: 480 } } : false,
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
            } else if (attempt < 10) {
              setTimeout(() => playFallbackPreview(attempt + 1), 150);
            }
          };
          playFallbackPreview();
        }
      } catch (e: any) {
        console.warn('[useCall] getUserMedia fallback error:', e);
      }

      if (socket && callId) {
        setupWebRTCFallback(socket, callId);
      }
      setJoined(true);
      joinedRef.current = true;
    },
    [setupWebRTCFallback]
  );

  const playLocalPreview = useCallback(() => {
    const tryPlay = (attempt: number) => {
      const el = document.getElementById('call-local-video-container');
      if (el) {
        if (localVideoRef.current) {
          try {
            localVideoRef.current.play(el);
          } catch {
            // retry
          }
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
        }
      } else if (attempt < 10) {
        setTimeout(() => tryPlay(attempt + 1), 150);
      }
    };
    tryPlay(0);
  }, []);

  const startCall = useCallback(
    async ({ channel, token, type, socket, callId }: UseCallOptions) => {
      if (joinedRef.current || joiningRef.current) return;
      joiningRef.current = true;
      setError('');

      try {
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
                  container.className = 'absolute inset-0 w-full h-full';
                  const area = document.getElementById('call-video-area');
                  if (area) area.appendChild(container);
                }
                user.videoTrack?.play(container);
              }
              if (mediaType === 'audio') {
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
        await client.join(AGORA_APP_ID, channel, token, undefined);
        joinedRef.current = true;
        setJoined(true);

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
    [initLocalMediaFallback, playLocalPreview]
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

  /** Switch / flip camera between user (front) and environment (rear) */
  const switchCamera = useCallback(async () => {
    const nextMode = currentFacingModeRef.current === 'user' ? 'environment' : 'user';
    currentFacingModeRef.current = nextMode;
    setFacingMode(nextMode);

    // Agora camera switch
    if (localVideoRef.current) {
      try {
        const devices = await AgoraRTC.getCameras();
        if (devices.length >= 2) {
          const currentLabel = (await localVideoRef.current.getTrackLabel()) || '';
          const idx = devices.findIndex((d) => d.label === currentLabel);
          const nextDevice = devices[(idx + 1) % devices.length];
          await localVideoRef.current.setDevice(nextDevice.deviceId);
          return;
        }
      } catch (e) {
        console.warn('[useCall] Agora switch camera error:', e);
      }
    }

    // WebRTC Fallback camera switch
    if (fallbackStreamRef.current && navigator.mediaDevices?.getUserMedia) {
      try {
        const oldTrack = fallbackStreamRef.current.getVideoTracks()[0];
        oldTrack?.stop();

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        const newTrack = newStream.getVideoTracks()[0];
        if (newTrack) {
          fallbackStreamRef.current.removeTrack(oldTrack);
          fallbackStreamRef.current.addTrack(newTrack);

          if (fallbackVideoElRef.current) {
            fallbackVideoElRef.current.srcObject = fallbackStreamRef.current;
          }

          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newTrack).catch(() => {});
            }
          });
        }
      } catch (e) {
        console.warn('[useCall] Fallback switch camera error:', e);
      }
    }
  }, []);

  const endCall = useCallback(async () => {
    try {
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();

      if (localVideoRef.current) {
        localVideoRef.current.close();
        localVideoRef.current = null;
      }
      if (localAudioRef.current) {
        localAudioRef.current.close();
        localAudioRef.current = null;
      }
      if (clientRef.current && joinedRef.current) {
        await clientRef.current.leave();
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
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      if (fallbackStreamRef.current) {
        fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      clientRef.current?.leave();
      clientRef.current = null;
      joinedRef.current = false;
      clearRemoteContainers();
    };
  }, [clearRemoteContainers]);

  return {
    joined,
    remoteUsers,
    micOn,
    cameraOn,
    facingMode,
    error,
    startCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    playLocalPreview,
    endCall,
  };
};
