/**
 * Contains the different templating engines mail merge supports.
 * 
 * A `TemplateEngine` is a generic class that takes a template and a list of records, and returns the result of merging the two.
 * It also needs to be able to tell us what fields the template has, so we can map record fields
 * to the template before passing the mapped data to the template for rendering.
 *
 * Engines return a list of {@link TemplatePreview}s, which contain the content of the merged template,
 * and the fields that were used in the template.
 * The idea is that you can return multiple previews per record as you might have intermediate results you want users to be able to edit.

 * Engines also need to be able to rerender their previews, to allow for the users to edit the results of the merge.
 * For example, the {@link NunjucksMarkdownEngine} will return a markdown preview and an HTML preview,
 * and will allow the user to edit the markdown preview and then rerender the HTML preview.
 * 
 * ### Example simple usage:
 * ```typescript
 * import { NunjucksMarkdownEngine } from '@docsoc/mailmerge';
 * 
 * const yourData = [{
 *     // your data here
 *     name: 'John Doe',
 *     email: 'a@b.com'
 * }];
 * 
 * const engine = new NunjucksMarkdownEngine({
 *     templatePath: 'path/to/your/template.md'
 *     rootHtmlTemplate: 'path/to/your/root.html'
 * });
 * 
 * // Call the engine
 * await engine.loadTemplate();
 * const previews = await Promise.all(yourData.map(engine.generatePreview));
 * 
 * // Do something with the previews, e.g. commit to file or use the Mailer to email
 * ```
 * @module
 */
import nunjucksEngine from "./nunjucks-md/index.js";
import reactEngine from "./react/index.js";
import { TemplateEngineConstructor } from "./types.js";

export type TEMPLATE_ENGINES = "nunjucks" | "react";

/**
 * Default map of engine names (provided on the CLI) to constructors for those engines.
 *
 * Only includes engines bundled with mailmerge - if using a custom engine, make a custom map!
 */
export const ENGINES_MAP: Record<TEMPLATE_ENGINES, TemplateEngineConstructor> = {
    nunjucks: nunjucksEngine,
    react: reactEngine,
};

export * from "./types.js";
export * from "./nunjucks-md/index.js";
export * from "./react/index.js";
export { default as NunjucksMarkdownEngine } from "./nunjucks-md/index.js";
export { default as ReactEmailEngine } from "./react/index.js";
