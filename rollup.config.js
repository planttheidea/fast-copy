import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

import pkg from './package.json';

const EXTERNALS = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const UMD_CONFIG = {
  external: EXTERNALS,
  input: 'src/index.ts',
  output: {
    file: pkg.browser,
    format: 'umd',
    globals: EXTERNALS.reduce((globals, name) => {
      globals[name] = name;

      return globals;
    }, {}),
    name: pkg.name,
    sourcemap: true,
  },
  plugins: [
    resolve({
      mainFields: ['module', 'browser', 'main'],
    }),
    typescript({
      typescript: require('typescript'),
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

const MINIFIED_CONFIG = {
  ...UMD_CONFIG,
  output: {
    ...UMD_CONFIG.output,
    file: pkg.browser.replace('.js', '.min.js'),
    sourcemap: false,
  },
  plugins: [...UMD_CONFIG.plugins, terser()],
};

export default [UMD_CONFIG, FORMATTED_CONFIG, MINIFIED_CONFIG];
