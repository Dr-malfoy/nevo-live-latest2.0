import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLivePlayerStore, useSocketStore } from '../../stores';
import { LiveStreamPage } from '../../pages/LiveStream';

/**
 * Global Live Stream Player.
 *
 * Keeps the active live stream session (Agora tracks, WebRTC, socket room)
 * alive across the entire application.
 *
 * - When route is `/live/:id` or `/stream/:id`: renders FULL-SCREEN normal live room.
 * - When navigating away (Back button, profile, chats, minimize button):
 *   the stream is NOT destroyed; it seamlessly switches to a draggable,
 *   floating MINIMIZED window (mini player / PiP) with live video & audio!
 * - Tapping the mini player or its maximize button returns to `/live/:id` full size.
 * - Tapping (✕) on the mini player or confirming Leave/End terminates the session cleanly.
 */
export const GlobalLivePlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeStreamId, isMinimized, setActiveStreamId, setMinimized, closeStream } = useLivePlayerStore();
  const socket = useSocketStore((s) => s.socket);

  // Listen for stream ending events from socket so minimized window automatically vanishes
  useEffect(() => {
    if (!socket || !activeStreamId) return;

    const onLiveStatus = (data: { userId?: string; isLive?: boolean; streamId?: string }) => {
      if (data?.streamId === activeStreamId && data.isLive === false) {
        closeStream();
      }
    };

    const onStreamEnded = (data: { streamId?: string }) => {
      if (!data?.streamId || data.streamId === activeStreamId) {
        closeStream();
      }
    };

    socket.on('user:live-status', onLiveStatus);
    socket.on('stream:ended', onStreamEnded);

    return () => {
      socket.off('user:live-status', onLiveStatus);
      socket.off('stream:ended', onStreamEnded);
    };
  }, [socket, activeStreamId, closeStream]);

  useEffect(() => {
    const match = location.pathname.match(/^\/(?:live|stream)\/([^/]+)/);
    if (match) {
      const routeStreamId = match[1];
      if (activeStreamId !== routeStreamId) {
        setActiveStreamId(routeStreamId);
      }
      if (isMinimized) {
        setMinimized(false);
      }
    } else {
      // User is on a different route (e.g. /, /profile, /chats, etc.)
      // If a live stream is active, minimize it to floating player instead of terminating!
      if (activeStreamId && !isMinimized) {
        setMinimized(true);
      }
    }
  }, [location.pathname, activeStreamId, isMinimized, setActiveStreamId, setMinimized]);

  if (!activeStreamId) return null;

  return (
    <div className={isMinimized ? 'contents' : 'fixed inset-0 z-40 bg-black'}>
      <LiveStreamPage
        key={activeStreamId}
        streamIdProp={activeStreamId}
        isMinimized={isMinimized}
        onMaximize={() => {
          setMinimized(false);
          navigate(`/live/${activeStreamId}`);
        }}
        onMinimize={() => {
          setMinimized(true);
          navigate(-1);
        }}
        onClose={() => {
          closeStream();
        }}
      />
    </div>
  );
};
