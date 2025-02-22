const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    fallback: {
      "assert": require.resolve("assert/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "timers": require.resolve("timers-browserify"),
      "process": require.resolve("process/browser"),
      "buffer": require.resolve("buffer/"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url/"),
      "zlib": require.resolve("browserify-zlib"),
      "fs": false,
      "net": false,
      "tls": false,
      "child_process": false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    }),
    // Handle source map warnings
    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map'
    }),
    // Handle node polyfills
    new webpack.NormalModuleReplacementPlugin(/node:/, (resource) => {
      const mod = resource.request.replace(/^node:/, '');
      switch (mod) {
        case 'buffer':
          resource.request = 'buffer';
          break;
        case 'stream':
          resource.request = 'readable-stream';
          break;
        default:
          throw new Error(`Not found ${mod}`);
      }
    })
  ],
  optimization: {
    moduleIds: 'deterministic',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  },
  devServer: {
    historyApiFallback: true,
    hot: true,
    open: true,
    port: 3000
  },
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map'
};