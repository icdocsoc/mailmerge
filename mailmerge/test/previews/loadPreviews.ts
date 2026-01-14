import { promises as fs } from "fs";
import { join } from "path";

import { loadPreviewsFromSidecar } from "../../src/previews/loadPreviews.js";
import { SidecarData } from "../../src/previews/types.js";

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
    },
}));

describe("loadPreviewsFromSidecar", () => {
    it("should add content to engineData for each file", async () => {
        const mockSidecarData: SidecarData["files"] = [
            {
                filename: "file1.txt",
                engineData: {
                    name: "value1",
                    content: undefined,
                    metadata: {},
                },
            },
            {
                filename: "file2.txt",
                engineData: {
                    name: "value2",
                    content: undefined,
                    metadata: {},
                },
            },
        ];

        const rootDir = "/mock/root/dir";

        (fs.readFile as jest.Mock).mockImplementation((filePath: string) => {
            if (filePath === join(rootDir, "file1.txt")) {
                return Promise.resolve("Content of file1");
            } else if (filePath === join(rootDir, "file2.txt")) {
                return Promise.resolve("Content of file2");
            }
            return Promise.reject(new Error("File not found"));
        });

        const result = await loadPreviewsFromSidecar(mockSidecarData, rootDir);

        expect(result[0].content).toBe("Content of file1");
        expect(result[1].content).toBe("Content of file2");
    });
});
