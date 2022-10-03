export default {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>'],
  testRegex: '/__tests__/.*\\.(ts|tsx)$',
  transform: {
    '\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig/base.json' }],
  },
  verbose: true,
};
