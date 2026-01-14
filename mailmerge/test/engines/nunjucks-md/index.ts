import { promises as fs } from "fs";
import nunjucks from "nunjucks";

import getTemplateFields from "../../../src/engines/nunjucks-md/getFields.js";
import {
    NunjucksMarkdownEngine,
    TemplateEngineOptions,
    TemplatePreviews,
} from "../../../src/index.js";
import { renderMarkdownToHtml } from "../../../src/markdown/toHtml.js";
import { MappedRecord } from "../../../src/util/types.js";

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
    },
}));
jest.mock("nunjucks");
jest.mock("../../../src/markdown/toHtml.js");
jest.mock("../../../src/engines/nunjucks-md/getFields.js");

describe("NunjucksMarkdownEngine", () => {
    let engine: NunjucksMarkdownEngine;
    const templateOptions: TemplateEngineOptions = {
        rootHtmlTemplate: "rootHtmlTemplate.html",
        templatePath: "template.md",
    };

    beforeEach(() => {
        jest.clearAllMocks();
        engine = new NunjucksMarkdownEngine(templateOptions);
    });

    test("loadTemplate should load the template", async () => {
        (fs.readFile as jest.Mock).mockResolvedValue("template content");

        await engine.loadTemplate();

        expect(fs.readFile).toHaveBeenCalledWith("template.md", "utf-8");
        expect(engine["loadedTemplate"]).toBe("template content");
    });

    test("extractFields should extract fields from the loaded template", () => {
        engine["loadedTemplate"] = "template content";
        (getTemplateFields as jest.Mock).mockReturnValue(["field1", "field2"]);

        const fields = engine.extractFields();

        expect(getTemplateFields).toHaveBeenCalledWith("template content");
        expect(fields).toEqual(["field1", "field2"]);
    });

    test("renderPreview should render previews correctly", async () => {
        engine["loadedTemplate"] = "template content";
        (fs.readFile as jest.Mock).mockReturnValue("html wrapper content");
        const markdownRenderer = jest.fn().mockReturnValue("expanded markdown");
        const htmlRenderer = jest.fn().mockReturnValue("rendered html");
        (nunjucks.compile as jest.Mock)
            .mockReturnValueOnce({
                render: markdownRenderer,
            })
            .mockReturnValueOnce({
                render: htmlRenderer,
            });

        (renderMarkdownToHtml as jest.Mock).mockReturnValue("rendered markdown html");

        const record: MappedRecord = { name: "John Doe", otherField: "other" };
        const previews = await engine.renderPreview(record);
        expect(nunjucks.compile).toHaveBeenNthCalledWith(1, "template content", undefined);
        expect(nunjucks.compile).toHaveBeenNthCalledWith(2, "html wrapper content", undefined);
        expect(markdownRenderer).toHaveBeenCalledWith(record);
        expect(htmlRenderer).toHaveBeenCalledWith({ content: "rendered markdown html" });
        expect(renderMarkdownToHtml).toHaveBeenCalledWith("expanded markdown");
        expect(previews).toEqual([
            {
                name: "Preview-Markdown.md",
                content: "expanded markdown",
                metadata: { type: "markdown" },
            },
            {
                name: "Preview-HTML.html",
                content: "rendered html",
                metadata: { type: "html" },
            },
        ]);
    });

    test("rerenderPreviews should re-render previews correctly", async () => {
        const loadedPreviews: TemplatePreviews = [
            {
                name: "Preview-Markdown.md",
                content: "markdown content",
                metadata: { type: "markdown" },
            },
            {
                name: "Preview-HTML.html",
                content: "html content",
                metadata: { type: "html" },
            },
        ];
        (fs.readFile as jest.Mock).mockResolvedValue("html wrapper content");
        (renderMarkdownToHtml as jest.Mock).mockReturnValue("re-rendered html");
        (nunjucks.compile as jest.Mock).mockReturnValue({
            render: ({ content }: { content: string }) => content,
        });

        const previews = await engine.rerenderPreviews(loadedPreviews);

        expect(renderMarkdownToHtml).toHaveBeenCalledWith("markdown content");
        expect(previews).toEqual([
            loadedPreviews[0],
            {
                ...loadedPreviews[1],
                content: "re-rendered html",
            },
        ]);
    });

    test("getHTMLToSend should return the correct HTML", async () => {
        const loadedPreviews: TemplatePreviews = [
            {
                name: "Preview-Markdown.md",
                content: "markdown content",
                metadata: { type: "markdown" },
            },
            {
                name: "Preview-HTML.html",
                content: "html content",
                metadata: { type: "html" },
            },
        ];

        const html = await engine.getHTMLToSend(loadedPreviews);

        expect(html).toBe("html content");
    });

    test("refuse to render previews if template is not loaded", async () => {
        engine["loadedTemplate"] = undefined;

        await expect(engine.renderPreview({})).rejects.toThrow("Template not loaded");
    });

    test("can render dicts & arrays", async () => {
        const template = `{{ dict.name }}
{% for item in items %}{{ item }}
{% endfor %}`;
        const record = {
            dict: { name: "John Doe" },
            items: ["item1", "item2"],
        };

        engine["loadedTemplate"] = template;
        (nunjucks.compile as jest.Mock).mockImplementation(jest.requireActual("nunjucks").compile);

        const result = await engine.renderPreview(record);
        expect(result[0].content).toBe("John Doe\nitem1\nitem2\n");
    });
});
