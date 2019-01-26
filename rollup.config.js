import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';

import pkg from './package.json';

const UMD_CONFIG = {
  input: 'src/index.js',
  output: {
    exports: 'named',
    file: pkg.browser,
    format: 'umd',
    name: pkg.name,
    sourcemap: true,
  },
  plugins: [
    resolve({
      main: true,
      module: true,
    }),
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};

const FORMATTED_CONFIG = {
  ...UMD_CONFIG,
  output: [
    {
      ...UMD_CONFIG.output,
      file: pkg.main,
      format: 'cjs',
    },
    {
      ...UMD_CONFIG.output,
      file: pkg.module,
      format: 'es',
    },
  ],
};

export default [
  UMD_CONFIG,
  FORMATTED_CONFIG,
  {
    ...UMD_CONFIG,
    output: {
      ...UMD_CONFIG.output,
      file: pkg.browser.replace('.js', '.min.js'),
      sourcemap: false,
    },
    plugins: [...UMD_CONFIG.plugins, terser()],
  },
];
