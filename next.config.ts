import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@clerk/nextjs"],
  webpack: (config, { isServer, dev }) => {
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
        'pdf-parse': false, // Prevent pdf-parse from being bundled on client
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
    } else {
      // Server-side: completely ignore pdf-parse test files and problematic paths
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ignore all test files from pdf-parse
        './test/data/05-versions-space.pdf': false,
        './test/data': false,
      };

      // Add module rule to ignore test files completely
      config.module.rules.push({
        test: /pdf-parse.*test.*\.pdf$/,
        loader: 'null-loader',
      });

      // Ignore problematic files during require
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          './test/data/05-versions-space.pdf': 'commonjs ./test/data/05-versions-space.pdf',
        });
      }
    }

    // Exclude Node.js specific modules and test files
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };

    // Ignore specific test files from pdf-parse
    config.module.rules.push({
      test: /\.pdf$/,
      type: 'asset/resource',
    });

    // Add ignore plugin for problematic files
    const IgnorePlugin = config.plugins.find((plugin: any) => 
      plugin.constructor.name === 'IgnorePlugin'
    );
    
    if (!IgnorePlugin) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /test\/data\/.*\.pdf$/,
          contextRegExp: /pdf-parse/,
        })
      );
    }

    return config;
  },
};

export default nextConfig;
