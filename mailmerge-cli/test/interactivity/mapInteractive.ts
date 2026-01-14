import { createLogger } from "@docsoc/util";
import inquirer from "inquirer";

import { mapFieldsInteractive } from "../../src/interactivity/mapFieldsInteractive.js";

jest.mock("inquirer");
jest.mock("@docsoc/util", () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return { createLogger: () => logger };
});

describe("mapInteractive", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const logger = createLogger("mapInteractive");

    it("should correctly map CSV headers to template fields", async () => {
        const templateFields = new Set(["field1", "field2", "field3"]);
        const csvHeaders = ["header1", "header2", "header3"];

        // Mock the prompt response
        /// @ts-expect-error: Jest mock
        (inquirer.prompt as jest.Mock).mockResolvedValue({
            header1: "field1",
            header2: "field2",
            header3: "field3",
        });

        const result = await mapFieldsInteractive(templateFields, new Set(csvHeaders));

        expect(result.get("header1")).toBe("field1");
        expect(result.get("header2")).toBe("field2");
        expect(result.get("header3")).toBe("field3");
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("should log a warning if not all template fields are mapped", async () => {
        const templateFields = new Set(["field1", "field2", "field3"]);
        const csvHeaders = ["header1", "header2"];

        // Mock the prompt response
        /// @ts-expect-error: Jest mock
        (inquirer.prompt as jest.Mock).mockResolvedValue({
            header1: "field1",
            header2: "field2",
        });

        const result = await mapFieldsInteractive(templateFields, new Set(csvHeaders));

        expect(result.get("header1")).toBe("field1");
        expect(result.get("header2")).toBe("field2");
        expect(logger.warn).toHaveBeenCalledWith("The following fields were not mapped: field3");
    });
});
