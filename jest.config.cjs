module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/qa/*.test.cjs'],
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      babelrc: false, configFile: false,
      presets: [['@babel/preset-env', {targets: {node: 'current'}}], '@babel/preset-typescript'],
    }],
  },
};
