import { createRollupConfig } from '@planttheidea/build-tools';

export default createRollupConfig({
  cjs: true,
  config: 'config',
  source: 'src',
  sourceMap: true,
  umd: true,
});
