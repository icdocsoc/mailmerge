import { createLogger, move } from "@docsoc/util";
import fs from "fs/promises";
import { mkdirp } from "mkdirp";

import { ENGINES_MAP } from "../../engines/index.js";
import {
    loadSidecars,
    loadPreviewsFromSidecar,
    writeSidecarFile,
    getRecordPreviewPrefixForIndividual,
    writeMetadata,
} from "../../previews/index.js";
import { JSONSidecarsBackend } from "./sidecar";

jest.mock("fs/promises");
jest.mock("mkdirp");
jest.mock("@docsoc/util");
jest.mock("../../previews/index.js");

describe("JSONSidecarsBackend", () => {
    const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createLogger as jest.Mock).mockReturnValue(mockLogger);
    });

    describe("loadMergeResults", () => {
        it("should load and return merge results", async () => {
            const sidecar = {
                name: "test",
                engine: "testEngine",
                engineOptions: {},
                files: [{ filename: "file1" }],
                record: { id: 1 },
                attachments: [],
                email: "test@example.com",
                $originalFilepath: "path/to/sidecar",
            };
            (loadSidecars as jest.Mock).mockReturnValue([sidecar]);
            const mockEngineClass = jest.fn();
            /// @ts-expect-error: Mocking engine class
            ENGINES_MAP["testEngine"] = mockEngineClass;
            (loadPreviewsFromSidecar as jest.Mock).mockResolvedValue([{ content: "preview" }]);

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: jest.fn(),
            });
            const results = [];
            for await (const result of backend.loadMergeResults()) {
                results.push(result);
            }

            expect(results).toEqual([
                {
                    record: { id: 1 },
                    previews: [{ content: "preview" }],
                    engineInfo: { name: "testEngine", options: {} },
                    attachmentPaths: [],
                    email: "test@example.com",
                    storageBackendMetadata: { sideCar: sidecar },
                },
            ]);
        });

        it("should handle invalid template engine", async () => {
            const sidecar = {
                name: "test",
                engine: "invalidEngine",
                engineOptions: {},
                files: [{ filename: "file1" }],
                record: { id: 1 },
                attachments: [],
                email: "test@example.com",
                $originalFilepath: "path/to/sidecar",
            };
            (loadSidecars as jest.Mock).mockReturnValue([sidecar]);

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: jest.fn(),
            });
            const results = [];
            for await (const result of backend.loadMergeResults()) {
                results.push(result);
            }

            expect(mockLogger.error).toHaveBeenCalledWith("Invalid template engine: invalidEngine");
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "Skipping record test as the engine is invalid!",
            );
            expect(results).toEqual([]);
        });
    });

    describe("storeUpdatedMergeResults", () => {
        it("should store updated merge results", async () => {
            const sidecar = {
                name: "test",
                files: [{ filename: "file1" }],
                $originalFilepath: "path/to/sidecar",
            };
            const result = {
                previews: [{ content: "new content" }],
                storageBackendMetadata: { sideCar: sidecar },
            };

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: jest.fn(),
            });
            /// @ts-expect-error: Mocking things
            await backend.storeUpdatedMergeResults([result]);

            expect(fs.writeFile).toHaveBeenCalledWith("output/root/file1", "new content");
            expect(writeSidecarFile).toHaveBeenCalledWith("path/to/sidecar", sidecar);
        });
    });

    describe("postSendAction", () => {
        it("should move sent emails to sent folder", async () => {
            const sidecar = {
                name: "test",
                files: [{ filename: "file1" }],
            };
            const resultSent = {
                storageBackendMetadata: { sideCar: sidecar },
            };

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: jest.fn(),
            });
            /// @ts-expect-error: Mocking things
            await backend.postSendAction(resultSent, "sent");

            expect(mkdirp).toHaveBeenCalledWith("output/root/sent");
            expect(move).toHaveBeenCalledWith("output/root/file1", "output/root/sent");
        });

        it("should move sent emails to drafts folder when in drafts mode", async () => {
            const sidecar = {
                name: "test",
                files: [{ filename: "file1" }],
            };
            const resultSent = {
                storageBackendMetadata: { sideCar: sidecar },
            };

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: jest.fn(),
            });
            /// @ts-expect-error: Mocking things
            await backend.postSendAction(resultSent, "drafts");

            expect(mkdirp).toHaveBeenCalledWith("output/root/drafts");
            expect(move).toHaveBeenCalledWith("output/root/file1", "output/root/drafts");
        });
    });

    describe("storeOriginalMergeResults", () => {
        it("should store original merge results", async () => {
            const results = [
                {
                    previews: [{ content: "content" }],
                    record: { id: 1 },
                    engineInfo: { name: "engine", options: {} },
                    attachmentPaths: [],
                },
            ];
            const headers = new Set(["id"]);
            const records = [{ id: 1 }];
            const fileNamer = jest.fn().mockReturnValue("file1");

            const backend = new JSONSidecarsBackend("output/root", {
                type: "fixed",
                namer: fileNamer,
            });

            /// @ts-expect-error: Mocking things
            getRecordPreviewPrefixForIndividual.mockReturnValue("file1__engine__preview1");

            /// @ts-expect-error: email ignored
            await backend.storeOriginalMergeResults(results, { headers, records });

            expect(mkdirp).toHaveBeenCalledWith("output/root");
            expect(fs.writeFile).toHaveBeenCalledWith(
                "output/root/file1__engine__preview1",
                "content",
            );
            expect(writeMetadata).toHaveBeenCalled();
        });
    });
});
