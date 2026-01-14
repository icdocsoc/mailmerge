import { getFileNameSchemeInteractively } from "../../src/interactivity/getFileNameSchemeInteractively.js";

jest.mock("inquirer");

describe("getFileNameSchemeInteractively", () => {
    const headers = ["name", "age", "email"];
    // const records = [
    //     { name: "John Doe", age: 30, email: "john@example.com" },
    //     { name: "Jane Doe", age: 25, email: "jane@example.com" },
    // ];

    it("should throw an error if no records are available", async () => {
        await expect(getFileNameSchemeInteractively(new Set(headers), [])).rejects.toThrow(
            "No records available to provide examples.",
        );
    });

    // it('should return a function that constructs a filename based on selected fields', async () => {
    //     const promptMock = mock<typeof inquirer.prompt>();
    //     /// @ts-expect-error: Jest mock
    //     promptMock.mockResolvedValue({ selectedFields: ['name', 'email'] });
    //     /// @ts-expect-error: Jest mock
    //     (inquirer.prompt as jest.Mock) = promptMock;

    //     const fileNameFunction = await getFileNameSchemeInteractively(headers, records);

    //     const result = fileNameFunction(records[0]);
    //     expect(result).toBe('John Doe-john@example.com');
    // });

    // it('should return a function that constructs a filename with different selected fields', async () => {
    //     const promptMock = mock<typeof inquirer.prompt>();
    //     /// @ts-expect-error: Jest mock
    //     promptMock.mockResolvedValue({ selectedFields: ['age'] });
    //     /// @ts-expect-error: Jest mock
    //     (inquirer.prompt as jest.Mock) = promptMock;

    //     const fileNameFunction = await getFileNameSchemeInteractively(headers, records);

    //     const result = fileNameFunction(records[1]);
    //     expect(result).toBe('25');
    // });
});
