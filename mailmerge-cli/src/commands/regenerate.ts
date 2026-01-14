import { JSONSidecarsBackend, rerenderPreviews } from "@docsoc/mailmerge";
import { Args, Command } from "@oclif/core";

/**
 * Regenerate previews for a given directory, using the sidecard JSON file next to preview & the rerender method of the associated engine
 */
export default class Regenerate extends Command {
    static override args = {
        directory: Args.string({
            description: "Directory of previews to regenerate",
            required: true,
        }),
    };

    static override description =
        "Regenerate previews for a given directory, using the sidecard JSON file next to preview & the rerender method of the associated engine";

    static override examples = ["<%= config.bin %> <%= command.id %>"];

    static override flags = {};

    public async run(): Promise<void> {
        const { args } = await this.parse(Regenerate);

        const directory = args.directory;

        // Rerender previews
        const storageBackend = new JSONSidecarsBackend(directory, {
            type: "fixed",
            /// @ts-expect-error: Required for fileNamer, not actually ued here
            namer: (record) => record[DEFAULT_FIELD_NAMES.to],
        });
        await rerenderPreviews(storageBackend);
    }
}
