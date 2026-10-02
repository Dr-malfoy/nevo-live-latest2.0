const STORAGE_PREFIX = 'nevo_deleted_chats_';

/**
 * Returns a set of all deleted chat IDs and official notice keys for the current user.
 */
export const getDeletedChatIds = (userId?: string): Set<string> => {
  try {
    const key = `${STORAGE_PREFIX}${userId || 'anonymous'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

/**
 * Marks a conversation or official notice as deleted for the current user.
 * Persists to localStorage so it will not reappear after page refresh.
 */
export const markChatDeleted = (chatIdOrKey: string, userId?: string) => {
  if (!chatIdOrKey) return;
  try {
    const set = getDeletedChatIds(userId);
    set.add(chatIdOrKey);
    if (chatIdOrKey.startsWith('official_')) {
      set.add(chatIdOrKey.replace('official_', ''));
    } else {
      set.add(`official_${chatIdOrKey}`);
    }
    const key = `${STORAGE_PREFIX}${userId || 'anonymous'}`;
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Checks if a chat ID or official key is marked as deleted.
 */
export const isChatDeleted = (chatIdOrKey?: string, userId?: string): boolean => {
  if (!chatIdOrKey) return false;
  const set = getDeletedChatIds(userId);
  if (set.has(chatIdOrKey)) return true;
  if (chatIdOrKey.startsWith('official_') && set.has(chatIdOrKey.replace('official_', ''))) return true;
  if (set.has(`official_${chatIdOrKey}`)) return true;
  return false;
};
