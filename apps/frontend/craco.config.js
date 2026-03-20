const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Fix for ESM modules in node_modules (MUI x-date-pickers issue)
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Production optimizations
      if (env === 'production') {
        // Add compression plugin
        webpackConfig.plugins.push(
          new CompressionPlugin({
            filename: '[path][base].gz',
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8,
          })
        );

        // Optimize chunk splitting
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Vendor chunk for node_modules
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 10,
                reuseExistingChunk: true,
              },
              // MUI chunk
              mui: {
                test: /[\\/]node_modules[\\/]@mui[\\/]/,
                name: 'mui',
                priority: 20,
                reuseExistingChunk: true,
              },
              // FullCalendar chunk
              fullcalendar: {
                test: /[\\/]node_modules[\\/]@fullcalendar[\\/]/,
                name: 'fullcalendar',
                priority: 20,
                reuseExistingChunk: true,
              },
              // Common chunk for shared code
              common: {
                minChunks: 2,
                priority: 5,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
          // Runtime chunk for better caching
          runtimeChunk: 'single',
        };
      }

      return webpackConfig;
    },
  },
};
