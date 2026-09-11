/**
 * Store kecil (pola useSyncExternalStore) untuk mode pseudo-fullscreen.
 *
 * Kenapa store, bukan classList.add imperatif: elemen `.chats-layout` dirender
 * React dengan template className di Chats.tsx — setiap re-render (mis. saat
 * user membuka chat personal) React menulis ulang atribut class dan menghapus
 * class yang ditambah imperatif. Dengan store, class dipasang DEKLARATIF dari
 * state sehingga selamat dari re-render apa pun.
 *
 * Ada DUA tingkat pseudo-fullscreen:
 * - 'chat': hanya area `.chats-layout` (sidebar chat + room) yang memenuhi
 *   layar; chrome dashboard (sidebar navigasi, header halaman) tetap ada.
 *   Dipakai tombol maximize di dalam sidebar chat.
 * - 'page': SELURUH halaman Chats memenuhi layar — chrome dashboard
 *   (sidebar navigasi + header mobile) disembunyikan. Dipakai tombol
 *   fullscreen TERLUAR di header halaman; di desktop tombol yang sama memakai
 *   Fullscreen API asli pada documentElement sehingga terasa seperti app WA.
 *
 * Efek samping yang diabstraksi store:
 * 1. Mengunci scroll body (class `__pseudo_fullscreen_lock`).
 * 2. Menandai body dengan class `__page_fullscreen` saat mode 'page' aktif,
 *    dipakai CSS untuk menyembunyikan chrome dashboard.
 * 3. Memberitahu induk yang menanam dashboard via iframe (halaman admin
 *    MudahSewa) supaya bingkai iframe-nya ikut melebar sepenuh layar ponsel —
 *    pseudo-fullscreen di dalam iframe hanya menutup viewport iframe, bukan
 *    layar perangkat. Komunikasi pakai postMessage dua arah.
 */
type Listener = () => void;

export type PseudoFullscreenMode = 'none' | 'chat' | 'page';

let mode: PseudoFullscreenMode = 'none';
const listeners = new Set<Listener>();

const emit = () => {
  listeners.forEach(listener => listener());
};

/** Kabari induk (bila dashboard ditanam via iframe) agar bingkainya melebar/menyempit. */
const notifyParent = (isActive: boolean) => {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ source: 'openwa-dashboard', type: 'pseudo-fullscreen', active: isActive }, '*');
};

export const pseudoFullscreenStore = {
  getSnapshot: (): PseudoFullscreenMode => mode,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setMode(next: PseudoFullscreenMode): void {
    if (mode === next) return;
    const wasActive = mode !== 'none';
    const isActive = next !== 'none';
    mode = next;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('__pseudo_fullscreen_lock', isActive);
      document.body.classList.toggle('__page_fullscreen', next === 'page');
    }
    if (wasActive !== isActive) notifyParent(isActive);
    emit();
  },
  /** Kompatibilitas pemanggil lama: true = 'chat', false = 'none'. */
  setActive(next: boolean): void {
    pseudoFullscreenStore.setMode(next ? 'chat' : 'none');
  },
};

/**
 * Dengarkan permintaan keluar dari induk (tombol minimize di halaman admin).
 * Return fungsi cleanup untuk dipakai di useEffect.
 */
export function listenForParentExitRequest(onExit: () => void): () => void {
  const handler = (event: MessageEvent) => {
    const data = event.data as { source?: string; type?: string } | null;
    if (data && data.source === 'openwa-parent' && data.type === 'pseudo-fullscreen-exit') {
      onExit();
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
