import client from './client';
import type { ApiResponse } from '../types';
import { useAuthStore } from '../stores';

export interface NoteUser {
  _id: string;
  uid?: string;
  nickname: string;
  avatar?: string;
  level?: number;
  country?: string;
  online?: boolean;
}

export interface NoteItem {
  _id: string;
  text: string;
  emoji?: string;
  createdAt: string;
  expiresAt: string;
  isSelf: boolean;
  user: NoteUser;
}

export interface CreateNotePayload {
  text: string;
  emoji?: string;
}

const LOCAL_STORAGE_NOTES_KEY = 'nevo_local_notes_v1';
let isServerNotesSupported: boolean | null = null;

const getLocalNotes = (): NoteItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
    if (!raw) return [];
    const notes: NoteItem[] = JSON.parse(raw);
    const now = Date.now();
    const valid = notes.filter((n) => new Date(n.expiresAt).getTime() > now);
    localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(valid));
    return valid;
  } catch {
    return [];
  }
};

const saveLocalNote = (payload: CreateNotePayload): NoteItem => {
  const currentUser = useAuthStore.getState().user;
  const currentUserId = currentUser?._id || 'self_user';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const newNote: NoteItem = {
    _id: 'local_note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    text: payload.text.trim().slice(0, 60),
    emoji: payload.emoji || '💭',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isSelf: true,
    user: {
      _id: currentUserId,
      uid: currentUser?.uid,
      nickname: currentUser?.nickname || 'You',
      avatar: currentUser?.avatar,
      level: currentUser?.level,
      country: currentUser?.country,
      online: true,
    },
  };

  const currentNotes = getLocalNotes().filter((n) => !n.isSelf && n.user._id !== currentUserId);
  currentNotes.unshift(newNote);
  localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(currentNotes));
  return newNote;
};

export const noteApi = {
  getNotes: async () => {
    if (isServerNotesSupported === false) {
      return { data: { success: true, data: getLocalNotes() } } as any;
    }

    try {
      const res = await client.get<ApiResponse<NoteItem[]>>('/notes');
      if (res.data?.success && Array.isArray(res.data.data)) {
        isServerNotesSupported = true;
        return res;
      }
      return { data: { success: true, data: getLocalNotes() } } as any;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerNotesSupported = false;
        return { data: { success: true, data: getLocalNotes() } } as any;
      }
      return { data: { success: true, data: getLocalNotes() } } as any;
    }
  },

  createOrUpdateNote: async (data: CreateNotePayload) => {
    if (isServerNotesSupported === false) {
      const localNote = saveLocalNote(data);
      return { data: { success: true, data: localNote, message: 'Note saved (24h)' } } as any;
    }

    try {
      const res = await client.post<ApiResponse<NoteItem>>('/notes', data);
      isServerNotesSupported = true;
      return res;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerNotesSupported = false;
        const localNote = saveLocalNote(data);
        return { data: { success: true, data: localNote, message: 'Note saved (24h)' } } as any;
      }
      throw err;
    }
  },

  deleteNote: async () => {
    if (isServerNotesSupported === false) {
      const currentUser = useAuthStore.getState().user;
      const currentUserId = currentUser?._id || 'self_user';
      const currentNotes = getLocalNotes().filter((n) => !n.isSelf && n.user._id !== currentUserId);
      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(currentNotes));
      return { data: { success: true, data: { success: true } } } as any;
    }

    try {
      const res = await client.delete<ApiResponse<{ success: boolean }>>('/notes');
      isServerNotesSupported = true;
      return res;
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        isServerNotesSupported = false;
        const currentUser = useAuthStore.getState().user;
        const currentUserId = currentUser?._id || 'self_user';
        const currentNotes = getLocalNotes().filter((n) => !n.isSelf && n.user._id !== currentUserId);
        localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(currentNotes));
        return { data: { success: true, data: { success: true } } } as any;
      }
      throw err;
    }
  },
};
