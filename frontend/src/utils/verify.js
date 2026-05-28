// Internal verification mode — traces calculator output against real approved
// 33(7)(B) area statements. Activated via ?verify=1. Chairman-facing UI is
// unaffected when off.

export const VERIFY_STORAGE_KEY = 'redev-verify-v1';

export function isVerifyMode() {
  if (typeof window === 'undefined') return false;
  try { return new URLSearchParams(window.location.search).get('verify') === '1'; }
  catch { return false; }
}

export function loadVerifyStore() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VERIFY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveVerifyStore(store) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(VERIFY_STORAGE_KEY, JSON.stringify(store)); }
  catch { /* quota / private mode */ }
}

// Returns null if either value is missing/non-numeric.
export function verifyDelta(calc, expected) {
  const c = Number(calc), e = Number(expected);
  if (!Number.isFinite(c) || !Number.isFinite(e) || e === 0) return null;
  return ((c - e) / e) * 100;
}
