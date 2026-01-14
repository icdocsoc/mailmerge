import { jest } from "@jest/globals";
import fs from "fs/promises";
import { join } from "path";

import Mailer from "../../src/mailer/mailer.js";
import {
    getRecordPreviewPrefix,
    getRecordPreviewPrefixForIndividual,
    getRecordPreviewPrefixForMetadata,
    validateRecord,
    writeMetadata,
    getSidecarMetadata,
    writeSidecarFile,
    loadSidecars,
} from "../../src/previews/sidecarData.js";

jest.mock("fs/promises");
jest.mock("../../src/mailer/mailer.js");
jest.mock("@docsoc/util", () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return { createLogger: () => logger };
});

describe("sidecarData", () => {
    const record = {
        id: "1",
        name: "Test Record",
        to: "testmail@outlook.com",
        subject: "Test Subject",
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileNamer = (record: any) => `file_${record.id}`;
    const templateEngine = "nunjucks";
    const preview = { name: "preview1.txt", content: "content1", metadata: { key: "value" } };
    const sidecarData = {
        /* mock sidecar data */
    };
    const previewsRoot = "/mock/previews/root";
    const templateOptions = {
        /* mock template options */
    };
    const attachments = ["/path/to/attachment"];
    const previews = [{ name: "preview1.txt", content: "content1", metadata: { key: "value" } }];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("getRecordPreviewPrefix", () => {
        const result = getRecordPreviewPrefix(record, fileNamer);
        expect(result).toBe("file_1");
    });

    test("getRecordPreviewPrefixForIndividual", () => {
        const result = getRecordPreviewPrefixForIndividual(
            record,
            fileNamer,
            templateEngine,
            preview,
        );
        expect(result).toBe("file_1__nunjucks__preview1.txt");
    });

    test("getRecordPreviewPrefixForMetadata", () => {
        const result = getRecordPreviewPrefixForMetadata(record, fileNamer);
        expect(result).toBe("file_1-metadata.json");
    });

    test("validateRecord with valid record", () => {
        /// @ts-expect-error: Mocking Mailer
        Mailer.validateEmail.mockReturnValue(true);
        const result = validateRecord(record);
        expect(result).toEqual({ valid: true });
    });

    test("validateRecord with invalid email", () => {
        /// @ts-expect-error: Mocking Mailer
        Mailer.validateEmail.mockReturnValue(false);
        const result = validateRecord(record);
        expect(result).toEqual({
            valid: false,
            reason: `Invalid email address in list ${record.to}`,
        });
    });

    test("validateRecord with no subject", () => {
        /// @ts-expect-error: Mocking Mailer
        Mailer.validateEmail.mockReturnValue(true);
        const invalidRecord = { ...record, subject: undefined };
        const result = validateRecord(invalidRecord);
        expect(result).toEqual({ valid: false, reason: "No subject provided" });
    });

    test("writeMetadata with valid record", async () => {
        /// @ts-expect-error: Mocking Mailer
        Mailer.validateEmail.mockReturnValue(true);
        /// @ts-expect-error: Mocking fs
        fs.writeFile.mockResolvedValue();
        /// @ts-expect-error: Mocking fs
        await writeMetadata(record, sidecarData, fileNamer, previewsRoot);
        expect(fs.writeFile).toHaveBeenCalled();
    });

    test("writeMetadata with invalid record", async () => {
        /// @ts-expect-error: Mocking Mailer
        Mailer.validateEmail.mockReturnValue(false);
        /// @ts-expect-error: Mocking fs
        await writeMetadata(record, sidecarData, fileNamer, previewsRoot);
        expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test("getSidecarMetadata", () => {
        const result = getSidecarMetadata(
            fileNamer,
            record,
            templateEngine,
            templateOptions,
            attachments,
            previews,
        );
        expect(result).toEqual({
            name: "file_1",
            record: record,
            engine: templateEngine,
            engineOptions: templateOptions,
            files: [
                {
                    filename: "file_1__nunjucks__preview1.txt",
                    engineData: { ...preview, content: undefined },
                },
            ],
            email: {
                to: ["testmail@outlook.com"],
                cc: [],
                bcc: [],
                subject: "Test Subject",
            },
            attachments,
        });
    });

    test("writeSidecarFile", async () => {
        /// @ts-expect-error: Mocking
        fs.writeFile.mockResolvedValue();
        /// @ts-expect-error: Mocking
        await writeSidecarFile("/mock/path/metadata.json", sidecarData);
        expect(fs.writeFile).toHaveBeenCalledWith(
            "/mock/path/metadata.json",
            JSON.stringify(sidecarData, null, 4),
        );
    });

    test("loadSidecars", async () => {
        /// @ts-expect-error: Mocking
        fs.readdir.mockResolvedValue(["file_1-metadata.json"]);
        /// @ts-expect-error: Mocking
        fs.readFile.mockResolvedValue(JSON.stringify(sidecarData));
        const iterator = loadSidecars(previewsRoot);
        const result = await iterator.next();
        expect(result.value).toEqual({
            ...sidecarData,
            $originalFilepath: join(previewsRoot, "file_1-metadata.json"),
        });
    });
});
