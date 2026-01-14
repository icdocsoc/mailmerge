import inquirer from "inquirer";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";

/**
 * Interactively get the name of the run (used as the folder to place outputs under) from the user.
 *
 * By default uses the unique-names-generator package to generate a random name.
 * @example "red.elephant.angry"
 * @returns The name of the run
 */
export async function getRunNameInteractively() {
    // Generate a default name
    const defaultName = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: ".",
        length: 3,
    });

    // Prompt the user for the run name
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "runName",
            message: "Enter the name of the run:",
            default: defaultName,
        },
    ]);

    return answers.runName;
}
