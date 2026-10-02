import { useRef, useState, useCallback, useEffect } from 'react';
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ICameraVideoTrack,
  UID,
} from 'agora-rtc-sdk-ng';

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
  const joiningRef = useRef(false);
  const togglingMicRef = useRef(false);
  const networkLostRef = useRef(false);

  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
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
          const stream = await navigator.mediaDevices.getUserMedia({
            video: (role === 'host' && videoEnabled) ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
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
          const videoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: { width: 640, height: 480, frameRate: 30 },
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
      const next = desiredState !== undefined ? desiredState : !micOnRef.current;

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
          } else {
            const isPublished = clientRef.current.localTracks.includes(localAudioRef.current);
            if (!isPublished) {
              await clientRef.current.publish([localAudioRef.current]);
            }
            await localAudioRef.current.setEnabled(true);
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
      throw new Error(errMsg);
    } finally {
      togglingMicRef.current = false;
    }
  }, []);

  const switchCamera = useCallback(async () => {
    if (localVideoRef.current) {
      const devices = await AgoraRTC.getCameras();
      if (devices.length < 2) return;
      const currentLabel = (await localVideoRef.current.getTrackLabel()) || '';
      const idx = devices.findIndex((d) => d.label === currentLabel);
      const next = devices[(idx + 1) % devices.length];
      await localVideoRef.current.setDevice(next.deviceId);
      return;
    }

    // Fallback device switch
    if (fallbackStreamRef.current && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === 'videoinput'
        );
        if (devices.length < 2) return;
        const currentTrack = fallbackStreamRef.current.getVideoTracks()[0];
        const currentDeviceId = currentTrack?.getSettings()?.deviceId;
        const idx = devices.findIndex((d) => d.deviceId === currentDeviceId);
        const nextDevice = devices[(idx + 1) % devices.length];

        currentTrack?.stop();
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: nextDevice.deviceId } },
          audio: false,
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          fallbackStreamRef.current.removeTrack(currentTrack);
          fallbackStreamRef.current.addTrack(newVideoTrack);
          if (fallbackVideoElRef.current) {
            fallbackVideoElRef.current.srcObject = fallbackStreamRef.current;
          }
          // Update peers with new video track
          peerConnectionsRef.current.forEach((pc) => {
            const senders = pc.getSenders();
            const videoSender = senders.find((s) => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack).catch(() => {});
            }
          });
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
    leaveChannel,
  };
};
