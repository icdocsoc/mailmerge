import {
    JSONSidecarsBackend,
    sendEmails,
    getDefaultMailer,
    getDefaultDoCSocFromLine,
    ENGINES_MAP,
    EmailString,
    Mailer,
} from "@docsoc/mailmerge";
import { Args, Command, Flags } from "@oclif/core";

export default class Send extends Command {
    static override args = {
        directory: Args.string({
            description: "Directory of email previews to render & send",
            required: true,
        }),
    };

    static override description = "Send generated emails from a given directory";

    static override examples = ["<%= config.bin %> <%= command.id %>"];

    static override flags = {
        sleepBetween: Flags.integer({
            char: "s",
            description: "Time to sleep between sending emails to prevent hitting rate limits",
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
        testSendTo: Flags.string({
            char: "t",
            description: "Send the top X emails to this email as a test. Requires --only to be set",
        }),
        inlineImages: Flags.string({
            char: "i",
            description:
                "Path to a JSON file containing informationa about inline images - see InlineImagesSpec type for format",
        }),
    };

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Send);

        const directory = args.directory;
        const storageBackend = new JSONSidecarsBackend(directory, {
            type: "fixed",
            /// @ts-expect-error: Required for fileNamer
            namer: (record) => record[DEFAULT_FIELD_NAMES.to],
        });

        if (flags.testSendTo && !flags.only) {
            this.error("You must set --only to use --testSendTo");
        }

        let testSendTo: EmailString | undefined;

        if (flags.testSendTo) {
            if (Mailer.validateEmail(flags.testSendTo)) {
                testSendTo = flags.testSendTo;
            } else {
                throw new Error("Invalid email address provided for --testSendTo");
            }
        }

        // Rerender previews
        await sendEmails(
            storageBackend,
            getDefaultMailer(),
            getDefaultDoCSocFromLine(),
            ENGINES_MAP,
            flags.yes,
            {
                sleepBetween: flags.sleepBetween,
                onlySend: flags.only,
                testSendTo,
                inlineImages: flags.inlineImages,
            },
        );
    }
}
