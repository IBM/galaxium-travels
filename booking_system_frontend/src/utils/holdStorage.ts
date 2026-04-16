import type { StoredHold } from '../types';

const KEY_PREFIX = 'galaxium_holds_';

export const getStoredHolds = (userId: number): StoredHold[] => {
  try {
    const data = localStorage.getItem(`${KEY_PREFIX}${userId}`);
    if (!data) return [];
    return JSON.parse(data) as StoredHold[];
  } catch {
    return [];
  }
};

export const storeHold = (userId: number, hold: StoredHold): void => {
  const holds = getStoredHolds(userId);
  const updated = [...holds.filter((h) => h.holdId !== hold.holdId), hold];
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(updated));
};

export const removeHold = (userId: number, holdId: string): void => {
  const holds = getStoredHolds(userId);
  const updated = holds.filter((h) => h.holdId !== holdId);
  localStorage.setItem(`${KEY_PREFIX}${userId}`, JSON.stringify(updated));
};

// Made with Bob
