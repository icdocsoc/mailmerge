// index.test.ts
import { stopIfCriticalFsError } from "@docsoc/util";
import fs from "fs/promises";
import { join } from "path";

import { TEMPLATE_ENGINES } from "../../src/engines/index.js";
import { TemplatePreviews } from "../../src/engines/types.js";
import {
    getRecordPreviewPrefix,
    getRecordPreviewPrefixForIndividual,
    getRecordPreviewPrefixForMetadata,
    getSidecarMetadata,
    writeMetadata,
} from "../../src/previews/sidecarData.js";
import { SidecarData } from "../../src/previews/types.js";
import { MappedRecord } from "../../src/util/types.js";

jest.mock("fs/promises");
jest.mock("@docsoc/util", () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return { createLogger: () => logger, stopIfCriticalFsError: jest.fn() };
});

describe("Sidecar Data Functions", () => {
    const mockRecord: MappedRecord = {
        id: "1",
        name: "Test Record",
        to: "meap@hotmail.com",
        subject: "Test Record",
    };
    const mockFileNamer = (record: MappedRecord) => `file_${record["id"]}`;
    const mockTemplateEngine = "nunjucks" as TEMPLATE_ENGINES;
    const mockTemplateOptions = {};
    const mockPreviews: TemplatePreviews = [
        { name: "preview1", content: "content1", metadata: { key: "value" } },
    ];
    const mockPreviewsRoot = "/mock/previews/root";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("getRecordPreviewPrefix should return correct prefix", () => {
        const result = getRecordPreviewPrefix(mockRecord, mockFileNamer);
        expect(result).toBe("file_1");
    });

    test("getRecordPreviewPrefixForIndividual should return correct prefix", () => {
        const result = getRecordPreviewPrefixForIndividual(
            mockRecord,
            mockFileNamer,
            mockTemplateEngine,
            mockPreviews[0],
        );
        expect(result).toBe(`file_1__${mockTemplateEngine}__preview1`);
    });

    test("getRecordPreviewPrefixForMetadata should return correct metadata filename", () => {
        const result = getRecordPreviewPrefixForMetadata(mockRecord, mockFileNamer);
        expect(result).toBe("file_1-metadata.json");
    });

    test("writeMetadata should write metadata to a JSON file", async () => {
        const mockSidecar: SidecarData = {
            name: "file_1",
            record: mockRecord,
            engine: mockTemplateEngine,
            engineOptions: mockTemplateOptions,
            files: [
                {
                    filename: `file_1__${mockTemplateEngine}__preview1`,
                    engineData: {
                        name: "preview1",
                        content: undefined,
                        metadata: { key: "value" },
                    },
                },
            ],
            email: {
                to: ["meap@hotmail.com"],
                cc: [],
                bcc: [],
                subject: "Test Record",
            },
            attachments: [],
        };

        (stopIfCriticalFsError as jest.Mock).mockImplementation((promise) => promise);

        await writeMetadata(
            mockRecord,
            getSidecarMetadata(
                mockFileNamer,
                mockRecord,
                mockTemplateEngine,
                mockTemplateOptions,
                [],
                mockPreviews,
            ),
            mockFileNamer,
            mockPreviewsRoot,
        );

        expect(fs.writeFile).toHaveBeenCalledWith(
            join(mockPreviewsRoot, "file_1-metadata.json"),
            JSON.stringify(mockSidecar, null, 4),
        );
    });
});
