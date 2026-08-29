/** Pembulatan maksimum sumbu Y ke angka cantik (1/2/5 × 10^n). */
export function niceCeil(n: number): number {
  if (n <= 0) return 1000;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Format ringkas untuk label sumbu: 75000 → "75 rb", 1200000 → "1,2 jt". */
export function formatShortRp(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`;
  return `${Math.round(n)}`;
}

/** Format sisa waktu manusiawi: "3j 20m", "2 hari", "1 hari 3j". */
export function formatSisaWaktu(minutesLeft: number): string {
  if (minutesLeft <= 0) return "0";
  const days = Math.floor(minutesLeft / (60 * 24));
  const hours = Math.floor((minutesLeft % (60 * 24)) / 60);
  const minutes = minutesLeft % 60;
  if (days > 0) return hours > 0 ? `${days} hari ${hours}j` : `${days} hari`;
  if (hours > 0) return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
  return `${minutes}m`;
}

/** Inisial nama untuk avatar (2 huruf). */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
