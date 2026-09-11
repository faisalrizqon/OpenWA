/**
 * Store kecil (pola useSyncExternalStore) untuk mode pseudo-fullscreen mobile.
 *
 * Kenapa store, bukan classList.add imperatif: elemen `.chats-layout` dirender
 * React dengan template className di Chats.tsx — setiap re-render (mis. saat
 * user membuka chat personal) React menulis ulang atribut class dan menghapus
 * class yang ditambah imperatif. Dengan store, class dipasang DEKLARATIF dari
 * state sehingga selamat dari re-render apa pun.
 *
 * Store ini juga mengabstraksi dua efek samping:
 * 1. Mengunci scroll body (class `__pseudo_fullscreen_lock`).
 * 2. Memberitahu induk yang menanam dashboard via iframe (halaman admin
 *    MudahSewa) supaya bingkai iframe-nya ikut melebar sepenuh layar ponsel —
 *    pseudo-fullscreen di dalam iframe hanya menutup viewport iframe, bukan
 *    layar perangkat. Komunikasi pakai postMessage dua arah.
 */
type Listener = () => void;

let active = false;
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
  getSnapshot: (): boolean => active,
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setActive(next: boolean): void {
    if (active === next) return;
    active = next;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('__pseudo_fullscreen_lock', active);
    }
    notifyParent(active);
    emit();
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
