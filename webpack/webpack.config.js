const ESLintWebpackPlugin = require('eslint-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  devServer: {
    port: 3000,
  },

  devtool: 'source-map',

  entry: path.join(ROOT, 'DEV_ONLY', 'index.ts'),

  mode: 'development',

  module: {
    rules: [
      {
        include: [path.resolve(ROOT, 'src'), /DEV_ONLY/],
        loader: 'ts-loader',
        options: {
          reportFiles: ['src/*.{ts|tsx}'],
        },
        test: /\.tsx?$/,
      },
    ],
  },

  output: {
    filename: 'fast-equals.js',
    library: 'fe',
    libraryTarget: 'umd',
    path: path.resolve(ROOT, 'dist'),
    umdNamedDefine: true,
  },

  plugins: [
    new ESLintWebpackPlugin(),
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new HtmlWebpackPlugin(),
  ],

  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
};
