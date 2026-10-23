/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react',
          allowJs: true,
          module: 'commonjs',
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
  // marked and eventsource-parser ship ESM only
  transformIgnorePatterns: ['/node_modules/(?!(marked|eventsource-parser)/)'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/src/test/styleMock.ts',
    '^vega$': '<rootDir>/src/test/vegaMock.ts',
    '^vega-embed$': '<rootDir>/src/test/vegaEmbedMock.ts',
    '^vega-interpreter$': '<rootDir>/src/test/vegaInterpreterMock.ts',
  },
};
