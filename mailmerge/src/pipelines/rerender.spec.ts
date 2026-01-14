import { TemplateEngineConstructor, TemplateEngine } from "../engines/types";
import { rerenderPreviews } from "./rerender";
import { StorageBackend, MergeResultWithMetadata } from "./storage/types";

jest.mock("@docsoc/util", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

describe("rerenderPreviews", () => {
    let mockStorageBackend: StorageBackend;
    let mockEngine: TemplateEngine;
    let mockEngineConstructor: jest.MockedClass<TemplateEngineConstructor>;

    beforeEach(() => {
        /// @ts-expect-error: Mocking storage backend
        mockStorageBackend = {
            loadMergeResults: jest.fn(),
            storeUpdatedMergeResults: jest.fn().mockResolvedValue(undefined),
        };

        /// @ts-expect-error: Mocking engine
        mockEngine = {
            loadTemplate: jest.fn().mockResolvedValue(undefined),
            rerenderPreviews: jest.fn().mockResolvedValue([
                {
                    name: "newPreview",
                    content: "newPreviewContent",
                    metadata: {},
                },
            ]),
        };

        mockEngineConstructor = jest.fn().mockImplementation(() => mockEngine);
    });

    it("should rerender previews with valid merge results and engine", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                previews: [
                    {
                        name: "oldPreview",
                        content: "oldPreviewContent",
                        metadata: {},
                    },
                ],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], cc: [], bcc: [], subject: "" },
                attachmentPaths: [],
                storageBackendMetadata: {},
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await rerenderPreviews(mockStorageBackend, enginesMap);

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).toHaveBeenCalled();
        expect(mockEngine.rerenderPreviews).toHaveBeenCalledWith(
            [
                {
                    name: "oldPreview",
                    content: "oldPreviewContent",
                    metadata: {},
                },
            ],
            {
                field1: "value1",
            },
        );
        expect(mockStorageBackend.storeUpdatedMergeResults).toHaveBeenCalledWith([
            {
                ...mergeResults[0],
                previews: [
                    {
                        name: "newPreview",
                        content: "newPreviewContent",
                        metadata: {},
                    },
                ],
            },
        ]);
    });

    it("should skip records with invalid engine", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                previews: [],
                engineInfo: { name: "invalidEngine", options: {} },
                email: { to: ["test@example.com"], cc: [], bcc: [], subject: "" },
                attachmentPaths: [],
                storageBackendMetadata: {},
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await rerenderPreviews(mockStorageBackend, enginesMap);

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).not.toHaveBeenCalled();
        expect(mockEngine.rerenderPreviews).not.toHaveBeenCalled();
        expect(mockStorageBackend.storeUpdatedMergeResults).toHaveBeenCalledWith([]);
    });

    it("should handle no merge results", async () => {
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue([]);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await rerenderPreviews(mockStorageBackend, enginesMap);

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).not.toHaveBeenCalled();
        expect(mockEngine.rerenderPreviews).not.toHaveBeenCalled();
        expect(mockStorageBackend.storeUpdatedMergeResults).toHaveBeenCalledWith([]);
    });

    it("should accept a custom logger", async () => {
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue([]);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };

        /// @ts-expect-error: Mocking
        await rerenderPreviews(mockStorageBackend, enginesMap, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith("Rerendering previews...");
    });
});
