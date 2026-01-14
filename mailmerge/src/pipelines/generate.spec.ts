import { TemplateEngine, TemplateEngineOptions, TemplatePreviews } from "../engines/index.js";
import { validateRecord, createEmailData } from "../previews/index.js";
import { generatePreviews, GenerateOptions } from "./generate";
import { DataSource } from "./loaders";
import { StorageBackend } from "./storage/types";

jest.mock("@docsoc/util");
jest.mock("@docsoc/util", () => ({
    createLogger: () => ({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
    move: jest.fn(),
}));
jest.mock("../engines/index.js");
jest.mock("../previews/index.js");
jest.mock("./loaders");
jest.mock("./storage/types");

describe("generatePreviews", () => {
    let mockDataSource: DataSource;
    let mockStorageBackend: StorageBackend;
    let mockEngine: TemplateEngine;

    beforeEach(() => {
        mockDataSource = {
            loadRecords: jest.fn().mockResolvedValue({
                headers: new Set(["header1", "header2"]),
                records: [{ header1: "value1", header2: "value2", addThis: "./test.txt" }],
            }),
        };

        /// @ts-expect-error: Mocking storage backend
        mockStorageBackend = {
            storeOriginalMergeResults: jest.fn().mockResolvedValue(undefined),
        };

        /// @ts-expect-error: Mocking engine
        mockEngine = {
            loadTemplate: jest.fn().mockResolvedValue(undefined),
            extractFields: jest.fn().mockReturnValue(new Set(["field1", "field2"])),
            /// @ts-expect-error: Mocking engine method
            renderPreview: jest.fn().mockResolvedValue({ preview: "preview" } as TemplatePreviews),
        };

        (validateRecord as jest.Mock).mockReturnValue({ valid: true });
        (createEmailData as jest.Mock).mockReturnValue({ email: "emailData" });
    });

    it("should generate previews with minimal valid options", async () => {
        const options: GenerateOptions = {
            engineInfo: {
                name: "testEngine",
                options: {} as TemplateEngineOptions,
                engine: mockEngine,
            },
            features: {},
            dataSource: mockDataSource,
            storageBackend: mockStorageBackend,
            mappings: {
                headersToTemplateMap: new Map([
                    ["header1", "field1"],
                    ["header2", "field2"],
                ]),
                keysForAttachments: ["addThis"],
            },
        };

        await generatePreviews(options);

        expect(mockDataSource.loadRecords).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).toHaveBeenCalled();
        expect(mockEngine.extractFields).toHaveBeenCalled();
        expect(mockEngine.renderPreview).toHaveBeenCalled();
        expect(mockStorageBackend.storeOriginalMergeResults).toHaveBeenCalledWith(
            [
                {
                    record: {
                        field1: "value1",
                        field2: "value2",
                    },
                    previews: { preview: "preview" },
                    engineInfo: {
                        name: "testEngine",
                        options: {},
                    },
                    attachmentPaths: ["./test.txt"],
                    email: { email: "emailData" },
                },
            ],
            {
                headers: new Set(["header1", "header2"]),
                records: [{ header1: "value1", header2: "value2", addThis: "./test.txt" }],
            },
        );
    });

    it("should handle attachments provided in options", async () => {
        const options: GenerateOptions = {
            engineInfo: {
                name: "testEngine",
                options: {} as TemplateEngineOptions,
                engine: mockEngine,
            },
            features: {},
            dataSource: mockDataSource,
            storageBackend: mockStorageBackend,
            mappings: {
                headersToTemplateMap: new Map([
                    ["header1", "field1"],
                    ["header2", "field2"],
                ]),
                keysForAttachments: [],
            },
            attachments: ["attachment1", "attachment2"],
        };

        await generatePreviews(options);
    });

    it("should enable CC and BCC mapping from records", async () => {
        const options: GenerateOptions = {
            engineInfo: {
                name: "testEngine",
                options: {} as TemplateEngineOptions,
                engine: mockEngine,
            },
            features: {
                enableCC: true,
                enableBCC: true,
            },
            dataSource: mockDataSource,
            storageBackend: mockStorageBackend,
            mappings: {
                headersToTemplateMap: new Map([
                    ["header1", "field1"],
                    ["header2", "field2"],
                ]),
                keysForAttachments: [],
            },
        };

        await generatePreviews(options);
    });

    it("should skip invalid records", async () => {
        (validateRecord as jest.Mock).mockReturnValueOnce({ valid: false, reason: "Invalid data" });

        const options: GenerateOptions = {
            engineInfo: {
                name: "testEngine",
                options: {} as TemplateEngineOptions,
                engine: mockEngine,
            },
            features: {},
            dataSource: mockDataSource,
            storageBackend: mockStorageBackend,
            mappings: {
                headersToTemplateMap: new Map([
                    ["header1", "field1"],
                    ["header2", "field2"],
                ]),
                keysForAttachments: [],
            },
        };

        await generatePreviews(options);
    });

    it("should use the provided logger", async () => {
        // Write the test
        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };

        const options = {
            engineInfo: {
                name: "testEngine",
                options: {} as TemplateEngineOptions,
                engine: mockEngine,
            },
            features: {},
            dataSource: mockDataSource,
            storageBackend: mockStorageBackend,
            mappings: {
                headersToTemplateMap: new Map([
                    ["header1", "field1"],
                    ["header2", "field2"],
                ]),
                keysForAttachments: [],
            },
        };

        /// @ts-expect-error: Mocking
        await generatePreviews(options, mockLogger);

        expect(mockLogger.info).toHaveBeenCalled();
    });
});
