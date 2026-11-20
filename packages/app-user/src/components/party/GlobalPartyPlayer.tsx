import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePartyPlayerStore, useSocketStore } from '../../stores';
import { PartyRoom } from '../../pages/PartyRoom';
import { startNativeParty, stopNativeParty } from '../../services/nativeParty';

/**
 * Global Party Room Player.
 *
 * Keeps the active voice party session (Agora voice tracks, WebRTC, socket room)
 * continuously alive across the entire application.
 *
 * - When route is `/party/:id` or `/room/:id`: renders FULL-SCREEN normal party room.
 * - When navigating away (Back button, profile, chats, bottom nav, or Android hardware back):
 *   the party is NOT destroyed; it seamlessly switches to a draggable, floating
 *   MINIMIZED window (mini player / PiP widget) with live speaker audio and microphone!
 * - Tapping the mini player or its maximize button returns to `/party/:id` full size.
 * - Tapping (✕) on the mini player or confirming Close/Leave terminates the session cleanly.
 */
export const GlobalPartyPlayer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activePartyId, isMinimized, partyName, setActivePartyId, setMinimized, closeParty } = usePartyPlayerStore();
  const socket = useSocketStore((s) => s.socket);
  const closedPartyRef = useRef<string | null>(null);

  useEffect(() => {
    if (activePartyId) {
      startNativeParty(partyName || 'Party Room');
    }
  }, [activePartyId, partyName]);

  const handleCloseParty = useCallback((partyIdToClose?: string | null) => {
    const id = partyIdToClose || activePartyId;
    if (id) {
      closedPartyRef.current = id;
    }
    stopNativeParty();
    closeParty();
    if (location.pathname.match(/^\/(?:party|room)\//)) {
      navigate('/party', { replace: true });
    }
  }, [activePartyId, closeParty, location.pathname, navigate]);

  // Listen for room closing events from socket so minimized floating widget automatically vanishes
  useEffect(() => {
    if (!socket || !activePartyId) return;

    const onRoomClosed = (data: { roomId?: string }) => {
      const state = usePartyPlayerStore.getState();
      if ((!data?.roomId || String(data.roomId) === String(state.activePartyId)) && state.isMinimized) {
        handleCloseParty(data?.roomId || state.activePartyId);
      }
    };

    socket.on('room:closed', onRoomClosed);
    socket.on('room:ended', onRoomClosed);

    return () => {
      socket.off('room:closed', onRoomClosed);
      socket.off('room:ended', onRoomClosed);
    };
  }, [socket, activePartyId, handleCloseParty]);

  useEffect(() => {
    const match = location.pathname.match(/^\/(?:party|room)\/([^/]+)/);
    if (match) {
      const routePartyId = match[1];
      // If this party was just closed, navigate to /party and don't re-activate it
      if (closedPartyRef.current === routePartyId) {
        navigate('/party', { replace: true });
        return;
      }
      closedPartyRef.current = null;
      if (activePartyId !== routePartyId) {
        setActivePartyId(routePartyId);
      }
      if (isMinimized) {
        setMinimized(false);
      }
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    } else {
      closedPartyRef.current = null;
      // User is on a different route (e.g. /, /party, /profile, /chats, etc.)
      // If a party room is active, minimize it to floating player instead of terminating!
      if (activePartyId && !isMinimized) {
        setMinimized(true);
      }
    }
  }, [location.pathname, activePartyId, isMinimized, setActivePartyId, setMinimized, navigate]);

  const handleMaximize = useCallback(() => {
    setMinimized(false);
    navigate(`/party/${activePartyId}`);
  }, [activePartyId, navigate, setMinimized]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    navigate(-1);
  }, [navigate, setMinimized]);

  const handleClose = useCallback(() => {
    handleCloseParty(activePartyId);
  }, [activePartyId, handleCloseParty]);

  if (!activePartyId) return null;

  return (
    <div className={isMinimized ? 'contents' : 'fixed inset-0 z-50 bg-[#150B2E] overflow-hidden'}>
      <PartyRoom
        key={activePartyId}
        partyIdProp={activePartyId}
        isMinimized={isMinimized}
        onMaximize={handleMaximize}
        onMinimize={handleMinimize}
        onClose={handleClose}
      />
    </div>
  );
};
