import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "www.assosmetal.com.tr",
        pathname: "/public_html/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
