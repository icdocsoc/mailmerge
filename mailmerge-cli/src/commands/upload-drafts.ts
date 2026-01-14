import {
    JSONSidecarsBackend,
    uploadDrafts,
    ENGINES_MAP,
    DEFAULT_FIELD_NAMES,
} from "@docsoc/mailmerge";
import { Args, Command, Flags } from "@oclif/core";

export default class UploadDrafts extends Command {
    static override args = {
        directory: Args.string({
            description: "Directory of email previews to render & upload",
            required: true,
        }),
    };

    static override description =
        "Upload generated emails from a given directory to the Drafts folder";

    static override examples = ["<%= config.bin %> <%= command.id %>"];

    static override flags = {
        sleepBetween: Flags.integer({
            char: "s",
            description: "Time to sleep between sending emails to prevent hitting rate limits",
            default: 0,
        }),
        yes: Flags.boolean({
            char: "y",
            description: "Skip confirmation prompt",
            default: false,
        }),
        only: Flags.integer({
            char: "n",
            description: "Only send this many emails (i.e. the first X emails)",
        }),
        inlineImages: Flags.string({
            char: "i",
            description:
                "Path to a JSON file containing informationa about inline images - see InlineImagesSpec type for format",
        }),
    };

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(UploadDrafts);
        const directory = args.directory;

        const storageBackend = new JSONSidecarsBackend(directory, {
            type: "fixed",
            /// @ts-expect-error: Required for fileNamer
            namer: (record) => record[DEFAULT_FIELD_NAMES.to],
        });

        await uploadDrafts(storageBackend, ENGINES_MAP, flags.yes, {
            sleepBetween: flags.sleepBetween,
            onlySend: flags.only,
            inlineImages: flags.inlineImages,
        });
    }
}
