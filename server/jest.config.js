export default {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Tell Jest to preserve ES module syntax
  transformIgnorePatterns: [],
  // Indicates whether the coverage information should be collected
  collectCoverage: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage"
};
