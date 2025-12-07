import { createEslintConfig } from '@planttheidea/build-tools';

export default createEslintConfig({
  config: 'config',
  development: 'dev',
  react: false,
  source: 'src',
});
