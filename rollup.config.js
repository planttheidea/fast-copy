import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import {uglify} from 'rollup-plugin-uglify';

export default [
  {
    input: 'src/index.js',
    output: {
      exports: 'named',
      file: 'dist/fast-copy.js',
      format: 'umd',
      name: 'fastCopy',
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
  },
  {
    input: 'src/index.js',
    output: {
      exports: 'named',
      file: 'dist/fast-copy.min.js',
      format: 'umd',
      name: 'fastCopy',
    },
    plugins: [
      resolve({
        main: true,
        module: true,
      }),
      babel({
        exclude: 'node_modules/**',
      }),
      uglify(),
    ],
  },
];
