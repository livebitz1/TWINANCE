import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@clerk/nextjs"],
  webpack: (config, { isServer, dev }) => {
    // Client-side configuration
    if (!isServer) {
      // Add fallbacks for Node.js modules (client-side only)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        path: false,
        http: false,
        https: false,
        url: false,
        zlib: false,
        'pdf-parse': false, // Prevent pdf-parse from being bundled on client
        'child_process': false,
        'worker_threads': false,
      };

      // Ignore canvas module on client side
      config.plugins.push(
        new (require('webpack')).IgnorePlugin({
          resourceRegExp: /^canvas$/,
        })
      );

      // Handle PDF.js worker files
      config.module.rules.push({
        test: /pdf\.worker\.(min\.)?js/,
        loader: 'file-loader',
        options: {
          name: 'static/[contenthash].[ext]',
          publicPath: '/_next/',
        },
      });
    } else {
      // Server-side: Handle pdf-parse properly
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'pdf-parse': 'commonjs pdf-parse',
          'canvas': 'canvas'
        });
      }
    }

    // Global webpack configuration (both client and server)
    // More comprehensive ignore patterns for pdf-parse test files
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /test\/data/,
        contextRegExp: /pdf-parse/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /\.pdf$/,
        contextRegExp: /pdf-parse.*test/,
      })
    );

    // Handle PDF files as assets
    config.module.rules.push({
      test: /\.pdf$/,
      type: 'asset/resource',
    });

    return config;
  },
};

export default nextConfig;
