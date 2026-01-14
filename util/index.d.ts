/**
 * Placeholder file:
 * In local dev types are compiled to dist, however when published to npm, types are in the root.
 *
 * As a result the package.json tells TSC to look in the root for types, so this is needed to redirect it to the dist folder.
 */
export * from "./dist/index";
