/* eslint-disable */
export default {
    displayName: "mailmerge",
    preset: "../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
        "^(.*).js$": ["babel-jest"],
    },
    transformIgnorePatterns: ["/node_modules/(?!(@docsoc|chalk)/)", "\\.pnp\\.[^\\/]+$"],
    moduleFileExtensions: ["ts", "js", "html", "tsx"],
    coverageDirectory: "../coverage/mailmerge",
    testMatch: ["<rootDir>/test/**/*.(ts|tsx)", "<rootDir>/src/**/*.spec.ts"],
};
