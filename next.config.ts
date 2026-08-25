import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server action default hanya 1 MB — tidak cukup untuk upload multi-file
  // (galeri produk maks 10 foto × 5 MB, foto return, bukti bayar, dll).
  // Next 16: bodySizeLimit dibaca dari experimental.serverActions
  // (lihat next/dist/server/config.js — divalidasi di sana).
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
