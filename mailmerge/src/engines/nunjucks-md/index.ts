import { promises as fs } from "fs";
import nunjucks from "nunjucks";

import { renderMarkdownToHtml } from "../../markdown/toHtml.js";
import { MappedRecord } from "../../util/types.js";
import { TemplateEngineOptions, TemplatePreviews } from "../types.js";
import { TemplateEngine } from "../types.js";
import getTemplateFields from "./getFields.js";
import {
    assertIsNunjucksTemplateOptions,
    NunjucksMarkdownTemplateOptions,
    NunjucksSidecarMetadata,
} from "./types.js";

export { default as getNunjucksTemplateFields } from "./getFields.js";
export * from "./types.js";

/**
 * A Nunjucks Markdown template engine
 *
 * Given two templates:
 * 1. A Markdown template that contains Nunjucks variables
 * 2. An HTML template that will be used to wrap the rendered Markdown
 *
 * We produce two previews:
 * 1. A Markdown preview, where the Nunjucks variables are expanded in the Markdown template
 * 2. An HTML preview, where the Markdown preview is rendered to HTML and embedded in the HTML template.
 *
 * The HTML preview __must__ contain a `{{ content }}` variable that will be replaced with the rendered Markdown
 *
 * The HTML preview is what will be sent as the final email, however we provide
 * the Markdown preview for editing purposes - you can edit it, trigger a re-render,
 * and see the changes in the HTML preview that will be sent
 */
export default class NunjucksMarkdownEngine extends TemplateEngine {
    private loadedTemplate?: string;
    private templateOptions: NunjucksMarkdownTemplateOptions;

    constructor(templateOptions: TemplateEngineOptions) {
        super();
        assertIsNunjucksTemplateOptions(templateOptions);
        this.templateOptions = templateOptions;
    }

    private async renderMarkdownToHtmlInsideWrapper(markdown: string) {
        // Render the MD to HTML
        const htmlWrapper = await fs.readFile(this.templateOptions.rootHtmlTemplate, "utf-8");
        const htmlWrapperCompiled = nunjucks.compile(
            htmlWrapper,
            nunjucks.configure({ autoescape: false }),
        );
        const html = renderMarkdownToHtml(markdown);

        // Wrap the rendered markdown html in the wrapper
        const wrapped = htmlWrapperCompiled.render({ content: html });

        return wrapped;
    }

    public override async loadTemplate() {
        this.loadedTemplate = await fs.readFile(this.templateOptions.templatePath, "utf-8");
    }

    public override extractFields() {
        if (!this.loadedTemplate) {
            throw new Error("Template not loaded");
        }

        return getTemplateFields(this.loadedTemplate);
    }

    public override async renderPreview(record: MappedRecord) {
        if (!this.loadedTemplate) {
            throw new Error("Template not loaded");
        }

        const templateCompiled = nunjucks.compile(
            this.loadedTemplate,
            nunjucks.configure({
                throwOnUndefined: true,
            }),
        );

        // Render the Markdown template with the record, so that we have something to preview
        const expanded = templateCompiled.render(record);
        // Render the MD to HTML
        const wrappedHtml = await this.renderMarkdownToHtmlInsideWrapper(expanded);

        // Return both
        return [
            {
                name: "Preview-Markdown.md",
                content: expanded, // you can edit this and re-render
                metadata: {
                    type: "markdown",
                },
            },
            {
                name: "Preview-HTML.html",
                content: wrappedHtml, // this is what will be sent - do not edit it, re-rendering will overwrite it
                metadata: {
                    type: "html",
                },
            },
        ];
    }

    /**
     * The rerenderer is simple - we just re-render the HTML preview!
     */
    public override async rerenderPreviews(
        loadedPreviews: TemplatePreviews,
    ): Promise<TemplatePreviews> {
        const markdownPreview = loadedPreviews.find(
            (preview) => (preview.metadata as NunjucksSidecarMetadata).type === "markdown",
        );
        if (!markdownPreview) {
            throw new Error("No markdown preview found in sidecar data");
        }
        const htmlPreview = loadedPreviews.find(
            (preview) => (preview.metadata as NunjucksSidecarMetadata).type === "html",
        );
        if (!htmlPreview) {
            throw new Error("No HTML preview found in sidecar data");
        }

        // Re-render the markdown preview
        const html = await this.renderMarkdownToHtmlInsideWrapper(markdownPreview.content);

        return [
            markdownPreview,
            {
                ...htmlPreview,
                content: html,
            },
        ];
    }

    public override async getHTMLToSend(loadedPreviews: TemplatePreviews) {
        const htmlPreview = loadedPreviews.find(
            (preview) => (preview.metadata as NunjucksSidecarMetadata).type === "html",
        );
        if (!htmlPreview) {
            throw new Error("No HTML preview found in sidecar data");
        }

        return htmlPreview.content;
    }
}
