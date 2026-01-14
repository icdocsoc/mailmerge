/**
 * Markdown template renderer
 */
import markdownit from "markdown-it";

const md = markdownit({
    html: true,
    linkify: true,
    typographer: false,
    breaks: true,
});

/**
 * Render a markdown string to HTML using the package markdown-it.
 *
 * The setting this will render using are:
 * - html: true
 * - linkify: true
 * - typographer: false
 * - breaks: true
 *
 * See local constant {@link md} for more details.
 *
 * TODO: Applying any custom transformations here, or refactor to use unified
 */
export const renderMarkdownToHtml = (markdown: string): string => md.render(markdown);
