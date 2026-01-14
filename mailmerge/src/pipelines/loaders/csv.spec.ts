import { createLogger } from "@docsoc/util";
import { parse } from "csv-parse";
import fs from "fs/promises";

import { CSVBackend } from "./csv";

jest.mock("fs/promises");
jest.mock("csv-parse");
jest.mock("@docsoc/util");

describe("CSVBackend", () => {
    const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createLogger as jest.Mock).mockReturnValue(mockLogger);
    });

    it("should load and parse CSV records correctly", async () => {
        const csvContent = "name,age\nJohn,30\nJane,25";
        (fs.readFile as jest.Mock).mockResolvedValue(csvContent);
        const mockParse = jest.fn().mockImplementation(function* () {
            yield { name: "John", age: "30" };
            yield { name: "Jane", age: "25" };
        });
        (parse as jest.Mock).mockReturnValue(mockParse());

        const backend = new CSVBackend("path/to/csv");
        const result = await backend.loadRecords();

        expect(fs.readFile).toHaveBeenCalledWith("path/to/csv", "utf-8");
        expect(parse).toHaveBeenCalledWith(csvContent, { columns: true });
        expect(result).toEqual({
            headers: new Set(["name", "age"]),
            records: [
                { name: "John", age: "30" },
                { name: "Jane", age: "25" },
            ],
        });
    });

    it("should handle empty CSV", async () => {
        const csvContent = "";
        (fs.readFile as jest.Mock).mockResolvedValue(csvContent);
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const mockParse = jest.fn().mockImplementation(function* () {});
        (parse as jest.Mock).mockReturnValue(mockParse());

        const backend = new CSVBackend("path/to/csv");

        await expect(backend.loadRecords()).rejects.toThrow("No records found in CSV");
        expect(mockLogger.error).toHaveBeenCalledWith("No records found in CSV");
    });

    it("should handle readFile errors", async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

        const backend = new CSVBackend("path/to/csv");

        await expect(backend.loadRecords()).rejects.toThrow("File not found");
    });
});
