import inquirer from "inquirer";

/**
 * From the headers of a data source, prompt the user to select fields that contain the path of attachments.
 */
export const getKeysForAttachments = async (fields: Set<string>): Promise<string[]> => {
    // Prompt user to select fields
    const answers = await inquirer.prompt([
        {
            type: "checkbox",
            name: "selectedFields",
            message: "Select fields that contain the path of attachments:",
            choices: [...fields].map((field) => ({
                name: field,
                value: field,
                checked: field.startsWith("attachment"),
            })),
        },
    ]);

    return answers.selectedFields;
};
