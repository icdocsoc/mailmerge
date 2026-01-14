import { render } from "@react-email/render";
import React from "react";

import ReactEmailEngine, {
    PropTypes,
    ReactEmailEngineExports,
    ReactEmailEngineOptions,
} from "../../../src/engines/react/index";
import { TemplatePreviews } from "../../../src/engines/types.js";
import { MappedRecord } from "../../../src/util/types.js";

// Mock the render function from @react-email/render
jest.mock("@react-email/render", () => ({
    render: jest.fn(),
}));

const mockTemplate = {
    parameters: () => ({ name: PropTypes.String }),
    default: (props: Record<string, unknown>) => <div>Hello, {props["name"] as string}!</div>,
} satisfies ReactEmailEngineExports;

const mockOptions: ReactEmailEngineOptions = {
    templatePath: "./mockTemplate.js",
};

describe("ReactEmailEngine", () => {
    let engine: ReactEmailEngine;

    beforeEach(() => {
        engine = new ReactEmailEngine(mockOptions);
        jest.resetAllMocks();
    });

    it("should load the template correctly", async () => {
        jest.spyOn(engine, "loadTemplate").mockImplementation(async () => {
            engine["loadedTemplate"] = mockTemplate;
        });

        await engine.loadTemplate();
        expect(engine["loadedTemplate"]).toBe(mockTemplate);
    });

    it("should extract fields correctly", async () => {
        jest.spyOn(engine, "loadTemplate").mockImplementation(async () => {
            engine["loadedTemplate"] = mockTemplate;
        });

        await engine.loadTemplate();
        const fields = engine.extractFields();
        expect(fields).toEqual(new Set(["name"]));
    });

    it("should render preview correctly", async () => {
        jest.spyOn(engine, "loadTemplate").mockImplementation(async () => {
            engine["loadedTemplate"] = mockTemplate;
        });

        await engine.loadTemplate();
        const record: MappedRecord = { name: "John" };
        (render as jest.Mock).mockResolvedValue("<div>Hello, John!</div>");

        const previews = await engine.renderPreview(record);
        expect(previews).toHaveLength(1);
        expect(previews[0].content).toBe("<div>Hello, John!</div>");
    });

    it("should rerender previews correctly", async () => {
        jest.spyOn(engine, "loadTemplate").mockImplementation(async () => {
            engine["loadedTemplate"] = mockTemplate;
        });

        await engine.loadTemplate();
        const record: MappedRecord = { name: "John" };
        const loadedPreviews: TemplatePreviews = [
            {
                name: "Rendered-Email",
                content: "<div>Hello, John!</div>",
                metadata: { type: "react", templatePath: "./mockTemplate.js" },
            },
        ];
        (render as jest.Mock).mockResolvedValue("<div>Hello, John!</div>");

        const previews = await engine.rerenderPreviews(loadedPreviews, record);
        expect(previews).toHaveLength(1);
        expect(previews[0].content).toBe("<div>Hello, John!</div>");
    });

    it("should return the first preview's HTML content", async () => {
        const loadedPreviews: TemplatePreviews = [
            {
                name: "Rendered-Email",
                content: "<div>Hello, John!</div>",
                metadata: { type: "react", templatePath: "./mockTemplate.js" },
            },
        ];

        const htmlToSend = await engine.getHTMLToSend(loadedPreviews);
        expect(htmlToSend).toBe("<div>Hello, John!</div>");
    });
});
