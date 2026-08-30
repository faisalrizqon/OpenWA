// =============================================================================
// API Key Storage Helper (MudahSewa patch)
// =============================================================================
// Dashboard asli menyimpan API key di sessionStorage saja — hilang setiap kali
// tab ditutup/dibuka ulang, sehingga user harus login ulang terus.
//
// Helper ini menambah fallback chain:
//   1. sessionStorage (sesi tab berjalan)
//   2. localStorage   (persisten antar tab & restart browser)
//   3. URL hash #key=… (auto-login dari embed/iframe; hash tidak terkirim ke server)
//
// Penulisan selalu menyinkronkan sessionStorage + localStorage agar refresh,
// tab baru, dan buka-ulang browser tetap login.
// =============================================================================

const SESSION_KEY = 'openwa_api_key';
const PERSISTENT_KEY = 'openwa_api_key_persistent';
const HASH_PARAM = 'key';

function readHashKey(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  try {
    return new URLSearchParams(hash).get(HASH_PARAM);
  } catch {
    return null;
  }
}

/** Ambil API key dengan fallback chain. Sekali ketemu di hash/localStorage,
 *  langsung di-seed ke sessionStorage agar request berikutnya konsisten. */
export function getApiKey(): string | null {
  const fromSession = sessionStorage.getItem(SESSION_KEY);
  if (fromSession) return fromSession;

  const fromHash = readHashKey();
  if (fromHash) {
    sessionStorage.setItem(SESSION_KEY, fromHash);
    localStorage.setItem(PERSISTENT_KEY, fromHash);
    return fromHash;
  }

  const fromLocal = localStorage.getItem(PERSISTENT_KEY);
  if (fromLocal) {
    sessionStorage.setItem(SESSION_KEY, fromLocal);
    return fromLocal;
  }

  return null;
}

/** Simpan key (login manual dari form) — tulis ke kedua layer. */
export function setApiKey(key: string): void {
  sessionStorage.setItem(SESSION_KEY, key);
  localStorage.setItem(PERSISTENT_KEY, key);
}

/** Hapus key (logout) — bersihkan kedua layer. */
export function clearApiKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PERSISTENT_KEY);
}
