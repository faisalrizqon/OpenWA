/** Util nomor telepon/WA Indonesia — dipakai client (form) & server (actions).
 *
 *  Menerima input bebas: "+62 851-7956-3295", "6285179563295",
 *  "0851 7956 3295", "85179563295", "(0851) 7956.3295", dst.
 *  Semua separator (spasi, dash, titik, kurung, plus) dibuang otomatis. */

/** Buang semua karakter non-digit dari input nomor. */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Normalisasi nomor WA Indonesia ke format kanonik `08xxx…`
 *  (format yang disimpan di DB & dipakai validasi `^0\d{8,13}$`).
 *
 *  - `+62 851-7956-3295` / `6285179563295` → `085179563295`
 *  - `0851 7956 3295`                        → `085179563295`
 *  - `85179563295`                           → `085179563295`
 *  - input kosong                            → `""` */
export function parseWhatsAppPhone(input: string): string {
  const digits = phoneDigits(input);
  if (!digits.length) return "";
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}

/** Validasi nomor WA kanonik: `08xxx` dengan total 9–14 digit. */
export function isValidWaPhone(input: string): boolean {
  return /^0\d{8,13}$/.test(parseWhatsAppPhone(input));
}
