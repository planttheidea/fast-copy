import baseConfig from './config.base';
import pkg from '../package.json';

export default {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    file: pkg.main,
    format: 'cjs',
  },
};
