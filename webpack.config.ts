import path from 'path';

import Webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import PNPWebpackPlugin from 'pnp-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

import 'ts-loader';
import 'cache-loader';
import 'brfs';
import 'transform-loader';

const mainConfig: Webpack.Configuration = {
  entry: './src/electron.ts',
  target: 'electron-main',
  output: {
    path: path.join(__dirname, 'src'),
    // path: path.join(__dirname, 'dist'),
    // path: __dirname,
    filename: 'electron.js',
  },
  cache: true,
  resolve: {
    plugins: [PNPWebpackPlugin],
    extensions: ['.ts', '.js', '.json'],
  },
  resolveLoader: { plugins: [PNPWebpackPlugin.moduleLoader(module)] },
  module: {
    rules: [
      {
        test: /\.ts$/i,
        include: /src/,
        use: ['cache-loader', 'ts-loader'],
      },

      // https://stackoverflow.com/a/34407395
      // { test: /aws-sdk/, loaders: ['cache-loader', 'transform?brfs'] },
      // { test: /\.json$/, loaders: ['cache-loader', 'json-loader'] },
    ],
  },
  plugins: [new ForkTsCheckerWebpackPlugin()],
  externals: [nodeExternals()],
  // externals: ['aws-sdk'],
  node: {
    __dirname: false, // Otherwise (?!) __dirname → /
  },
};

const renderConfig: Webpack.Configuration = {
  entry: './src/client/index.tsx',
  target: 'electron-renderer',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'client.js',
  },
  cache: true,
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: true,
          ecma: 2018,
          ie8: false,
          safari10: false,
          keep_classnames: false,
          keep_fnames: false,
          sourceMap: true,
          output: {
            comments: false,
          },
        },
      }),
    ],
  },
  resolve: {
    plugins: [PNPWebpackPlugin],
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },
  resolveLoader: { plugins: [PNPWebpackPlugin.moduleLoader(module)] },
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        use: ['cache-loader', 'ts-loader'],
      },
      {
        test: /\.scss$/,
        use: ['cache-loader', 'style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/,
        use: ['cache-loader', 'style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif|woff|woff2|ttf|svg|eot)$/,
        use: [
          'cache-loader',
          { loader: 'file-loader', options: { emit: true } },
        ],
      },
    ],
  },
  devServer: {
    port: 3000,
    open: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: './public/favicon.ico',
    }),
    new ForkTsCheckerWebpackPlugin(),
  ],
};

export default [mainConfig, renderConfig];
