/**
 * Parser untuk format booking digicam yang dikirim pelanggan via WhatsApp:
 *
 *   Nama Penyewa : maya okta
 *   Jenis Kamera : canon ps a4000
 *   Durasi (berapa hari) : 6jam
 *   Jaminan (KTP/SIM) : ktp
 *   Lokasi COD :
 *   Tanggal Booking/Sewa : 23 agustus 2026,minggu
 */
export interface ParsedBooking {
  nama?: string;
  kamera?: string; // nama seperti tertulis (untuk pencocokan product)
  durasiJam?: number; // 6jam → 6
  jaminan?: "ktp" | "sim" | "kartu_pelajar";
  lokasiCod?: string;
  tanggal?: Date; // tanggal sewa (waktu 00:00 — jam biasanya tak disebut)
}

const BULAN: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

/** Baris "Label : nilai" → { label, value }. Label tanpa titik dua dilewati. */
function splitBookingLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const sep = line.indexOf(":");
    if (sep <= 0) continue;
    const label = normalizeLabel(line.slice(0, sep));
    const value = line.slice(sep + 1).trim();
    if (label) out[label] = value;
  }
  return out;
}

/** "Nama Penyewa" → "namapenyewa" (buang spasi/tanda baca, lowercase). */
function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/** Ambil angka durasi + satuan: "6jam" | "6 jam" | "1 hari" | "12" → jam. */
function parseDuration(value: string): number | undefined {
  const m = value.toLowerCase().match(/(\d+)\s*(jam|hari|h)?/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (m[2] === "hari") return n * 24;
  return n; // jam / tanpa satuan → jam
}

/** "23 agustus 2026,minggu" | "23 agustus 2026" → Date lokal. */
function parseTanggalSewa(value: string): Date | undefined {
  const v = value.toLowerCase().split(",")[0].trim();
  const m = v.match(/(\d{1,2})\s+([a-z]+)\s*(\d{4})?/);
  if (!m) return undefined;
  const bulan = BULAN[m[2]];
  if (bulan === undefined) return undefined;
  const tahun = m[3] ? Number(m[3]) : new Date().getFullYear();
  const d = new Date(tahun, bulan, Number(m[1]));
  return isNaN(d.getTime()) ? undefined : d;
}

/** Normalisasi jawaban jaminan: "ktp" | "sim" | "kartu pelajar". */
function parseJaminan(value: string): ParsedBooking["jaminan"] {
  const v = value.toLowerCase();
  if (v.includes("sim")) return "sim";
  if (v.includes("ktp")) return "ktp";
  if (v.includes("pelajar") || v.includes("kartu")) return "kartu_pelajar";
  return undefined;
}

export function parseBookingMessage(text: string): ParsedBooking {
  const fields = splitBookingLines(text);
  const nama = fields["namapenyewa"]?.trim();
  const kamera = fields["jeniskamera"]?.trim();
  const lokasiCod = fields["lokasicod"]?.trim();
  const jaminanRaw = fields["jaminanktpsim"] ?? fields["jaminan"];
  const durasiRaw = fields["durasiberapahari"] ?? fields["durasi"];
  const tanggalRaw = fields["tanggalbookingsewa"] ?? fields["tanggalbooking"] ?? fields["tanggalsewa"];

  return {
    nama: nama || undefined,
    kamera: kamera || undefined,
    durasiJam: durasiRaw ? parseDuration(durasiRaw) : undefined,
    jaminan: jaminanRaw ? parseJaminan(jaminanRaw) : undefined,
    lokasiCod: lokasiCod || undefined,
    tanggal: tanggalRaw ? parseTanggalSewa(tanggalRaw) : undefined,
  };
}

/** Cocokkan teks kamera dari pesan → product id dari daftar produk.
 *  "canon ps a4000" vs "Canon PowerShot A4000 IS" → id-nya.
 *  Prioritas: kecocokan semua token angka+seri, lalu nama merek. */
export function matchProduct(
  kameraText: string,
  products: { id: number; name: string; sku: string }[]
): number | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const target = norm(kameraText);
  if (!target) return undefined;

  const tokens = target.split(" ").filter(Boolean);

  // Pass 1: product yang mengandung SEMUA token target (urutan bebas)
  let best: { id: number; score: number } | undefined;
  for (const p of products) {
    const hay = `${norm(p.name)} ${norm(p.sku)}`;
    const hits = tokens.filter((t) => hay.includes(t)).length;
    if (hits === tokens.length && tokens.length > 0) {
      const score = hits / Math.max(hay.split(" ").length, 1);
      if (!best || score > best.score) best = { id: p.id, score };
    }
  }
  if (best) return best.id;

  // Pass 2: kecocokan longgar — seri angka (mis. "a4000", "185", "fz55", "w810")
  const seri = tokens.filter((t) => /\d/.test(t));
  if (seri.length > 0) {
    for (const p of products) {
      const hay = `${norm(p.name)} ${norm(p.sku)}`;
      if (seri.every((s) => hay.includes(s))) return p.id;
    }
  }

  // Pass 3: merek saja (kodak/canon/sony) — pilih yang pertama cocok
  for (const t of tokens) {
    if (["kodak", "canon", "sony", "ixus", "pixpro", "powershot", "cybershot"].includes(t)) {
      const hit = products.find((p) => `${p.name} ${p.sku}`.toLowerCase().includes(t));
      if (hit) return hit.id;
    }
  }
  return undefined;
}
