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
};

export default nextConfig;
