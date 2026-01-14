/**
 * Pipelines provide a way to chain together the different parts of the mailmerge process automatically & headlessly.
 *
 * They are designed to be generic, and accept instances of:
 *
 * 1. A `DataSource` (`src/pipelines/loaders/`), to get records to merge on from.
 *     1. This library includes these data sources:
 *         1. `CSVBackend` - loads records from a CSV file
 * 2. A `TemplateEngine` (`src/engines/`), to merge the records with a template
 *     1. This library includes these engines:
 *         1. `NunjucksMarkdownEngine` - uses Nunjucks to render markdown templates, which it then renders to HTML
 *     2. Future engines you might want to write might include e.g. one to use `react-email` or the equivalent for Vue.
 * 3. A `StorageBackend` (`src/pipelines/storage/`), to store the results of the merge somehow, and later load them back in and update them on disk after a regeneration.
 *     1. This library includes these storage backends:
 *         1. `JSONSidecarsBackend` - stores the results of a merge to the filesystem, with JSON sidecar files placed next to each record
 *
 * Each of these folders has a `types.ts` files, that you should check out if you want to write your own.
 *
 * Checks the typedoc for more info on how to make your own & instantiate the provided ones.
 * You can also check the CLI tool `mailmerge-cli` for examples of how to use them.
 *
 * ### Example pipeline usage:
 * ```typescript
 * import { generate, GenerateOptions, DataSource, StorageBackend, MergeResultWithMetadata, MergeResult, RawRecord, MappedRecord } from '@docsoc/mailmerge';
 * import { mapFieldsInteractive } from '@docsoc/mailmerge-cli';
 *
 * class DatabaseDataSource implements DataSource {
 *     async loadRecords(): Promise<{ headers: Set<String>; records: RawRecord[] }[]> {
 *         // Load records from your database, somehow
 *         const headers = db.findHeaders();
 *         const records = db.findRecords();
 *
 *         // And return them
 *         return {
 *             headers,
 *             records,
 *         };
 *     }
 * }
 *
 * class DatabaseStorageBackend implements StorageBackend<TableModel> {
 *     async loadMergeResults(): AsyncGenerator<MergeResultWithMetadata<TableModel>> {
 *         // Load the merge results from your database, somehow
 *         // The storageBackendMetadata is so that you know how to put it back into the database.
 *         return db
 *             .findMergeResults()
 *             .map((item) => ({
 *                 ...transformItemToFormatRequired(item),
 *                 storageBackendMetadata: item,
 *             }))
 *             .asAsyncGenerator();
 *     }
 *
 *     async storeMergeResults(
 *         results: MergeResult[],
 *         rawData: { headers: Set<string>; records: MappedRecord[] },
 *     ): Promise<void> {
 *         // Store the merge results in your database, somehow
 *         for (const result of results) {
 *             db.storeMergeResult(transformResultForDB(result));
 *         }
 *     }
 *
 *     async storeUpdatedMergeResults(results: MergeResultWithMetadata<TableModel>[]): Promise<void> {
 *         // Store the merge results in your database, somehow
 *         for (const result of results) {
 *             db.replaceMergeResult(transformResultForDB(result), result.storageBackendMetadata);
 *         }
 *     }
 *
 *     async postSendAction(resultSent: MergeResultWithMetadata<TableModel>) {
 *         // Mark as sent
 *         db.markAsSent(resultSent.storageBackendMetadata);
 *     }
 * }
 *
 * // We'll use the NunjucksMarkdownEngine
 * const pipelineOptions: GenerateOptions = {
 *     engineInfo: {
 *         name: "nunjucks",
 *         options: {
 *             templatePath: "path/to/your/template.md",
 *             rootHtmlTemplate: "path/to/your/root.html",
 *         }
 *         engine: NunjucksMarkdownEngine,
 *     },
 *     mappings: {
 *         // Ask the user to do the mapping on the CLI using one of the built-in helpers
 *         // imported from @docsoc/mailmerge-cli
 *         headersToTemplatMap: mapFieldsInteractive
 *         // We know our DB record has these keys
 *         keysForAttachments: ["attachment"],
 *     },
 *     dataSource: new DatabaseDataSource(),
 *     storageBackend: new DatabaseStorageBackend(),
 *     // ... other propertis (check typedoc) ...
 * };
 *
 * // Call the pipeline
 * await generate(pipelineOptions);
 * ```
 * @module
 */
export * from "./loaders/index.js";
export * from "./storage/index.js";
export * from "./generate.js";
export * from "./rerender.js";
export * from "./send.js";
export * from "./uploadDrafts.js";
