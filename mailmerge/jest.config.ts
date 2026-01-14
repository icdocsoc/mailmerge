/* eslint-disable */
export default {
    displayName: "mailmerge-cli",
    preset: "../../jest.preset.js",
    testEnvironment: "node",
    transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
        "^(.*).js$": ["babel-jest"],
    },
    transformIgnorePatterns: ["/node_modules/(?!(@docsoc|chalk)/)", "\\.pnp\\.[^\\/]+$"],
    moduleFileExtensions: ["ts", "js", "html", "tsx"],
    coverageDirectory: "../../coverage/email/mailmerge-cli",
    testMatch: ["<rootDir>/test/**/*.(ts|tsx)", "<rootDir>/src/**/*.spec.ts"],
};
