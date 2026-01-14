module.exports = {
    testMatch: ['**/+(*.)+(spec|test).+(ts|js)?(x)'],
    transform: {
        '^.+\.(ts|tsx)$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json',
        }],
    },
		moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
    coverageReporters: ['html', 'text', 'lcov'],
    testEnvironment: 'node',
};
