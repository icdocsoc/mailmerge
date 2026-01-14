import inquirer from "inquirer";

import { getRunNameInteractively } from "../../src/interactivity/getRunNameInteractively.js";

jest.mock("inquirer");

describe("getRunNameInteractively", () => {
    it("should return the user-provided name", async () => {
        // Mock the prompt response
        /// @ts-expect-error: Jest mock
        (inquirer.prompt as jest.Mock).mockResolvedValue({ runName: "custom.run.name" });

        const runName = await getRunNameInteractively();
        expect(runName).toBe("custom.run.name");
    });
});
