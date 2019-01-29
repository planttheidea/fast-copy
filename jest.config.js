module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  roots: ["<rootDir>"],
  testRegex: "/__tests__/.*\\.(ts|tsx)$",
  transform: {
    "\\.(ts|tsx)$": "ts-jest"
  },
  verbose: true
};
