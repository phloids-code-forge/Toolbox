import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./src/lib/opportunity/migrations/*.sql'],
  },
};

export default nextConfig;
