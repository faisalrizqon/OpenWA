import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server action default hanya 1 MB — tidak cukup untuk upload multi-file
  // (galeri produk maks 10 foto × 5 MB, foto return, bukti bayar, dll).
  experimental: {
    serverActions: {
      bodySizeLimit: "240mb",
    },
    // Body clone limit di Next 16 (di next-server.ts:getCloneableBody) default 10MB.
    // Harus diset agar server action multipart dengan banyak file tidak terpotong.
    // 10 foto galeri × 20MB = maks 200MB body + overhead multipart -> 240MB.
    proxyClientMaxBodySize: "240mb",
  },
  // NFT (output file tracing) mengikuti referensi `process.cwd()` di server action
  // openwa-gateway.ts sampai ke openwa-server/data — folder berisi file auth sesi
  // WhatsApp yang TERKUNCI oleh proses gateway hidup (Chromium Cookies-journal),
  // sehingga `next build` gagal dengan "file being used by another process".
  // Exclusion ini membuat tracing tidak membaca isi folder tersebut.
  outputFileTracingExcludes: {
    "*": ["openwa-server/**"],
  },
};

export default nextConfig;
