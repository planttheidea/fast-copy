import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

import pkg from './package.json';

const EXTERNALS = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const UMD_CONFIG = {
  external: EXTERNALS,
  input: 'src/index.ts',
  output: {
    exports: 'default',
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
    nodeResolve({
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
    file: pkg.browser.replace('umd', 'minified').replace('.js', '.min.js'),
  },
  plugins: [...UMD_CONFIG.plugins, terser()],
};

export default [UMD_CONFIG, FORMATTED_CONFIG, MINIFIED_CONFIG];
