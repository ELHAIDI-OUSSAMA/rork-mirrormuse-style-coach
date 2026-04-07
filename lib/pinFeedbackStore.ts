import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspirationItem, PinFeedback } from '@/types/inspiration';

const PIN_FEEDBACK_KEY = 'mirrormuse_pin_feedback_v1';

function buildFeedback(pin: InspirationItem, existing?: PinFeedback): PinFeedback {
  return {
    id: pin.id,
    pinUrl: pin.pinUrl,
    imageUrl: pin.imageUrl,
    gender: pin.gender,
    tags: pin.vibeTags,
    likedAt: existing?.likedAt,
    savedAt: existing?.savedAt,
  };
}

export async function getPinFeedbackMap(): Promise<Record<string, PinFeedback>> {
  try {
    const raw = await AsyncStorage.getItem(PIN_FEEDBACK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (error) {
    console.log('[PinFeedback] Failed to read feedback store:', error);
    return {};
  }
}

async function writePinFeedbackMap(map: Record<string, PinFeedback>): Promise<void> {
  try {
    await AsyncStorage.setItem(PIN_FEEDBACK_KEY, JSON.stringify(map));
  } catch (error) {
    console.log('[PinFeedback] Failed to persist feedback store:', error);
  }
}

export async function persistPinFeedbackMap(map: Record<string, PinFeedback>): Promise<void> {
  await writePinFeedbackMap(map);
}

export function applyLikeToMap(
  map: Record<string, PinFeedback>,
  pin: InspirationItem,
  liked: boolean
): Record<string, PinFeedback> {
  const next = { ...map };
  const current = buildFeedback(pin, map[pin.id]);
  if (liked) {
    next[pin.id] = {
      ...current,
      likedAt: new Date().toISOString(),
    };
    return next;
  }

  const remaining = {
    ...current,
    likedAt: undefined,
  };

  if (!remaining.savedAt) {
    delete next[pin.id];
    return next;
  }

  next[pin.id] = remaining;
  return next;
}

export function applySaveToMap(
  map: Record<string, PinFeedback>,
  pin: InspirationItem,
  saved: boolean
): Record<string, PinFeedback> {
  const next = { ...map };
  const current = buildFeedback(pin, map[pin.id]);
  if (saved) {
    next[pin.id] = {
      ...current,
      savedAt: new Date().toISOString(),
    };
    return next;
  }

  const remaining = {
    ...current,
    savedAt: undefined,
  };

  if (!remaining.likedAt) {
    delete next[pin.id];
    return next;
  }

  next[pin.id] = remaining;
  return next;
}
