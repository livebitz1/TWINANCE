import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@clerk/nextjs"],
  webpack: (config, { isServer }) => {
    // PDF.js handling for client-side only
    if (!isServer) {
      // Add fallbacks for Node.js modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        path: false,
        http: false,
        https: false,
        url: false,
        zlib: false,
      };

      // Exclude PDF.js worker from server-side bundling
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js/,
        loader: 'file-loader',
        options: {
          name: 'static/[contenthash].[ext]',
          publicPath: '/_next/',
        },
      });
    }

    // Exclude Node.js specific modules
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };

    return config;
  },
};

export default nextConfig;
