const path = require('path');
const webpack = require('webpack');

module.exports = {
  style: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
    configure: {
      resolve: {
        fallback: {
          "crypto": require.resolve("crypto-browserify"),
          "stream": require.resolve("stream-browserify"),
          "assert": require.resolve("assert/"),
          "http": require.resolve("stream-http"),
          "https": require.resolve("https-browserify"),
          "os": require.resolve("os-browserify/browser"),
          "url": require.resolve("url/"),
          "buffer": require.resolve("buffer/"),
        },
      },
    },
  },
  devServer: {
    port: 3000,
    hot: true,
    open: false,
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
  }
};