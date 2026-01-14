import { createLogger } from "@docsoc/util";
import fs from "fs/promises";

import { JSONBackend } from "./json";

jest.mock("fs/promises");
jest.mock("@docsoc/util");

describe("JSONBackend", () => {
    const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createLogger as jest.Mock).mockReturnValue(mockLogger);
    });

    it("should load and parse JSON records correctly", async () => {
        const jsonContent = '[{"name": "John", "age": "30"}, {"name": "Jane", "age": "25"}]';
        (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

        const backend = new JSONBackend("path/to/json");
        const result = await backend.loadRecords();

        expect(fs.readFile).toHaveBeenCalledWith("path/to/json", "utf-8");
        expect(result).toEqual({
            headers: new Set(["name", "age"]),
            records: [
                { name: "John", age: "30" },
                { name: "Jane", age: "25" },
            ],
        });
    });

    it("should handle empty JSON", async () => {
        const jsonContent = "[]";
        (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

        const backend = new JSONBackend("path/to/json");

        await expect(backend.loadRecords()).rejects.toThrow("No records found in JSON");
        expect(mockLogger.error).toHaveBeenCalledWith("No records found in JSON");
    });

    it("should handle invalid JSON format", async () => {
        const jsonContent = '{"name": "John", "age": "30"}'; // Not an array
        (fs.readFile as jest.Mock).mockResolvedValue(jsonContent);

        const backend = new JSONBackend("path/to/json");

        await expect(backend.loadRecords()).rejects.toThrow(
            "JSON is not a list of objects - JSON must be a list of objects in order to be usable as records",
        );
        expect(mockLogger.error).toHaveBeenCalledWith(
            "JSON is not a list of objects! JSON must be a list of objects.",
        );
    });

    it("should handle readFile errors", async () => {
        (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

        const backend = new JSONBackend("path/to/json");

        await expect(backend.loadRecords()).rejects.toThrow("File not found");
    });
});
