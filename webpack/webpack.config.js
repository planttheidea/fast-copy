import ESLintWebpackPlugin from 'eslint-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

export default {
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
          configFile: path.resolve(ROOT, 'tsconfig', 'base.json'),
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
