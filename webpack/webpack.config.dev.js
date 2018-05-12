'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const defaultConfig = require('./webpack.config');
const statics = require('./webpackStatics');

const PORT = 3000;

module.exports = Object.assign({}, defaultConfig, {
  devServer: {
    contentBase: path.join(statics.ROOT, 'dist'),
    host: 'localhost',
    inline: true,
    lazy: false,
    noInfo: false,
    quiet: false,
    port: PORT,
    stats: {
      colors: true,
      progress: true
    }
  },

  entry: [path.resolve(statics.ROOT, 'DEV_ONLY', 'index.js')],

  module: Object.assign({}, defaultConfig.module, {
    rules: defaultConfig.module.rules.map((rule) => {
      if (rule.loader === 'babel-loader') {
        return Object.assign({}, rule, {
          include: rule.include.concat([path.resolve(statics.ROOT, 'DEV_ONLY')]),
          options: {
            cacheDirectory: true,
            presets: ['react']
          }
        });
      }

      if (rule.loader === 'eslint-loader') {
        return Object.assign({}, rule, {
          options: Object.assign({}, rule.options, {
            failOnWarning: false
          })
        });
      }

      return rule;
    })
  }),

  node: {
    fs: 'empty'
  },

  output: Object.assign({}, defaultConfig.output, {
    publicPath: `http://localhost:${PORT}/`
  }),

  plugins: defaultConfig.plugins.concat([new HtmlWebpackPlugin()])
});
