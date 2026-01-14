import { createLogger } from "@docsoc/util";
import { Args, Command } from "@oclif/core";
import { join } from "path";
import copy from "recursive-copy";

const logger = createLogger("init");

/**
 * Create a new mailmerge workspace, by copying the template in the assets folder
 */
export default class Init extends Command {
    static override args = {
        directory: Args.string({
            description:
                "Directory to place the workspace at (will be created if it doesn't exist). Defaults to current dir.",
            default: process.cwd(),
        }),
    };

    static override description =
        "iIitialise a new mailmerge workspace, complete with the necessary .env file and sample data";

    static override examples = ["<%= config.bin %> <%= command.id %>"];

    static override flags = {};

    public async run(): Promise<void> {
        const { args } = await this.parse(Init);

        /// @ts-expect-error: import.meta.dirname
        const assetsToCopy = join(import.meta.dirname, "../../assets/template-workspace");

        try {
            const results = await copy(assetsToCopy, args.directory);
            // Copy .env manually
            await copy(join(assetsToCopy, ".env"), join(args.directory, ".env"));
            logger.info(`Copied ${results.length} files`);
            logger.info("");
            logger.info("Initialisation complete!");
            logger.info("Read the README.md to get started.");
        } catch (error) {
            logger.error("Copy failed: " + error);
        }
    }
}
