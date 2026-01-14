// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TemplateEngine } from "@docsoc/mailmerge";
import { createLogger } from "@docsoc/util";
import inquirer from "inquirer";

/**
 * Using inquirer, map the csv headers to template fields
 * @param templateFields Set of fields the template wants
 * @param csvHeaders Headers from the CSV
 * @returns Map of csv headers to template fields
 */
const logger = createLogger("docsoc.util.mapInteractive");

/**
 * Interactive mapping of data source fields to template fields.
 *
 * Prints a prompt for each data source fields (header), asking the user to select the corresponding template field.
 * Finishes with a warning if not all template fields were mapped.
 *
 * NOTE: It is recommend to use this function in a CLI environment, as it uses inquirer for interactive prompts.
 * NOTE: Provide this function with any special fields you need e.g. email, name, etc.
 * @param templateFields Set of fields the template wants, extracted using {@link TemplateEngine.extractFields}
 * @param headers Headers (field names) from the data source
 * @returns Map of csv headers to template fields
 */
export const mapFieldsInteractive = async (
    templateFields: Set<string>,
    headers: Set<string>,
): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    const mappedFields = new Set<string>();
    logger.debug("Mapping CSV fields to template interactively");

    const NONE_OPTION = "None";
    const PASS_AS_IS_OPTION = (field: string) =>
        `Pass as-is (field '${field}' will be provided as field '${field}' to the templating engine)`;

    logger.info("When prompted, select the corresponding template field for each CSV header");

    const prompter = inquirer.prompt(
        // Provide the correct type for the prompt function
        /// @ts-expect-error: The type of the prompt function is incorrect
        [...headers].map((header) => ({
            type: "list",
            name: header,
            message: `Map CSV field \`${header}\` to template field:`,
            choices: Array.from(templateFields).concat([PASS_AS_IS_OPTION(header), NONE_OPTION]),
            // Set default to index in templateField that matches the csvHeader
            default: templateFields.has(header) ? header : PASS_AS_IS_OPTION(header),
        })),
    );
    for (const [csvHeader, templateFieldChosen] of Object.entries(await prompter).filter(
        ([, field]) => field !== NONE_OPTION,
    )) {
        const fieldToSet =
            templateFieldChosen === PASS_AS_IS_OPTION(csvHeader) ? csvHeader : templateFieldChosen;

        if (map.has(csvHeader)) {
            // Error, duplicate mapping, can't map the same csvHeader to two different templateFields (not yet anyway)
            logger.error(
                `Duplicate mapping for csvHeader \`${csvHeader}\` to template field \`${fieldToSet}\`! This is currently unsupported.`,
            );

            throw new Error(
                `Duplicate mapping for csvHeader \`${csvHeader}\` to template field \`${fieldToSet}\`! This is currently unsupported.`,
            );
        }

        map.set(csvHeader, fieldToSet);
        mappedFields.add(fieldToSet);
    }

    // Warn if not all fields were mapped
    const unmappedFields = new Set([...templateFields].filter((field) => !mappedFields.has(field)));
    if (unmappedFields.size > 0) {
        logger.warn(
            `The following fields were not mapped: ${Array.from(unmappedFields).join(", ")}`,
        );
    }

    return map;
};
