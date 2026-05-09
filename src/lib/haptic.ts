/**
 * Haptic feedback via Vibration API (Android + some iOS PWA).
 * Fails silently on unsupported devices.
 */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // unsupported — silent fail
  }
}

/** Soft confirmation — single short pulse */
export const hapticLight  = () => haptic(10);
/** Success — double tap feeling */
export const hapticSuccess = () => haptic([15, 60, 25]);
/** Celebration — three-pulse warmth */
export const hapticCelebrate = () => haptic([20, 50, 20, 50, 30]);
