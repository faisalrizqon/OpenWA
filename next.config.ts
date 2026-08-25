import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server action default hanya 1 MB — tidak cukup untuk upload multi-file
  // (galeri produk maks 8 foto × 5 MB, foto return, bukti bayar, dll).
  // Next 16: konfigurasi pindah ke experimental.serverActions
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
