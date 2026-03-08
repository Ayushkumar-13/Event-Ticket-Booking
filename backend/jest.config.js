module.exports = {
    testEnvironment: 'node',
    detectOpenHandles: true,
    forceExit: true,
    verbose: true,
    testTimeout: 10000,
    setupFilesAfterEnv: ['./src/__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
};
