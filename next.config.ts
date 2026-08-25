import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server action default hanya 1 MB — tidak cukup untuk upload multi-file
  // Server action body size limit (Next.js 16.x)
  serverActions: {
    bodySizeLimit: "50mb",
  } as const,
};

export default nextConfig;
