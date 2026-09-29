import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const isLocal =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (isLocal ? 'http://localhost:5000' : 'https://nevo-live.onrender.com');

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  joinRoom: (room: string, data?: any) => void;
  leaveRoom: (room: string) => void;
  joinCallRoom: (callId: string) => void;
  leaveCallRoom: (callId: string) => void;
  joinMatch: (type: string) => void;
  leaveMatch: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: (token) => {
    const existing = get().socket;
    if (existing?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => set({ connected: true }));
    socket.on('disconnect', () => set({ connected: false }));

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false });
    }
  },

  joinRoom: (room, data) => {
    // room is "stream:<id>" (or "room:<id>") — emit the FIXED "<kind>:join"
    // event the backend registers, with the payload as-is.
    const kind = room.split(':')[0];
    get().socket?.emit(`${kind}:join`, data);
  },

  leaveRoom: (room) => {
    const [kind, id] = room.split(':');
    // Backend expects { streamId } for stream rooms and { roomId } for room rooms
    get().socket?.emit(`${kind}:leave`, { [kind === 'stream' ? 'streamId' : 'roomId']: id });
  },

  joinCallRoom: (callId) => {
    get().socket?.emit('call:join-room', { callId });
  },

  leaveCallRoom: (callId) => {
    get().socket?.emit('call:leave-room', { callId });
  },

  joinMatch: (type) => {
    get().socket?.emit('match:join', { type });
  },

  leaveMatch: () => {
    get().socket?.emit('match:leave');
  },
}));
