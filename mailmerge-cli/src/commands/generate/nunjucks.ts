import {
    CSVBackend,
    DataSource,
    GenerateOptions,
    generatePreviews,
    JSONBackend,
    JSONSidecarsBackend,
    NunjucksMarkdownEngine,
    NunjucksMarkdownTemplateOptions,
} from "@docsoc/mailmerge";
import { Args, Command, Flags } from "@oclif/core";
import { mkdirp } from "mkdirp";
import { join } from "path";

import { getFileNameSchemeInteractively } from "../../interactivity/getFileNameSchemeInteractively.js";
import { getKeysForAttachments } from "../../interactivity/getKeysForAttachments.js";
import { getRunNameInteractively } from "../../interactivity/getRunNameInteractively.js";
import { mapFieldsInteractive } from "../../interactivity/mapFieldsInteractive.js";
import { DEFAULT_DIRS } from "../../util/constant.js";

export default class GenerateNunjucks extends Command {
    static override args = {
        dataFile: Args.string({
            description: "Path to the CSV/JSON file to use as the data source for the mailmerge",
            required: true,
        }),
        template: Args.string({
            description: "Path to the Nunjucks Markdown template file to use to generate emails",
            required: true,
            default: join(DEFAULT_DIRS.TEMPLATES, "template.md.njk"),
        }),
    };

    static override description = "Start a mailmerge from a CSV & Nunjucks template";

    static override examples = ["<%= config.bin %> <%= command.id %>"];

    static MODE_CSV = "csv";
    static MODE_JSON = "json";

    static override flags = {
        // // flag with no value (-f, --force)
        // force: Flags.boolean({ char: "f" }),
        // // flag with a value (-n, --name=VALUE)
        // name: Flags.string({ char: "n", description: "name to print" }),
        sourceType: Flags.string({
            char: "s",
            description: "Type of data source to use (csv/json)",
            options: [GenerateNunjucks.MODE_CSV, GenerateNunjucks.MODE_JSON],
            default: "csv",
        }),
        output: Flags.string({
            char: "o",
            description: "Path to the directory to output the generated email previews to",
            default: DEFAULT_DIRS.PREVIEWS,
        }),
        htmlTemplate: Flags.string({
            description: "Path to the HTML template to use to generate the final email",
            default: join(DEFAULT_DIRS.TEMPLATES, "wrapper.html.njk"),
        }),
        attachment: Flags.string({
            multiple: true,
            char: "a",
            description:
                "Attachments to add to the email, relative to mailmerge workspace root. Can specify multiple.",
            default: [],
        }),
        cc: Flags.boolean({
            char: "c",
            description: "Enable CC mapping from CSV - column values must be a space separate list",
        }),
        bcc: Flags.boolean({
            char: "b",
            description:
                "Enable BCC mapping from CSV - column values must be a space separate list",
        }),
        name: Flags.string({
            char: "n",
            description: "Name of the run, created as a subdirectory in the output directory",
        }),
    };

    private getDataSource(
        flags: Awaited<ReturnType<typeof this.parse>>["flags"],
        args: Awaited<ReturnType<typeof this.parse>>["args"],
    ): DataSource {
        switch (flags["sourceType"]) {
            case GenerateNunjucks.MODE_CSV:
                return new CSVBackend(join(process.cwd(), args["dataFile"]));
            case GenerateNunjucks.MODE_JSON:
                return new JSONBackend(join(process.cwd(), args["dataFile"]));
            default:
                throw new Error("Invalid source type");
        }
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(GenerateNunjucks);
        const engineOptions: NunjucksMarkdownTemplateOptions = {
            templatePath: args.template,
            rootHtmlTemplate: flags.htmlTemplate,
        };
        const runName = flags.name ?? (await getRunNameInteractively());
        const outputRoot = join(flags.output, runName);
        await mkdirp(outputRoot);
        const options: GenerateOptions = {
            engineInfo: {
                options: engineOptions,
                name: "nunjucks",
                engine: new NunjucksMarkdownEngine(engineOptions),
            },
            attachments: flags.attachment,
            features: {
                enableBCC: flags.bcc,
                enableCC: flags.cc,
            },
            dataSource: this.getDataSource(flags, args),
            storageBackend: new JSONSidecarsBackend(outputRoot, {
                type: "dynamic",
                namer: getFileNameSchemeInteractively,
            }),
            mappings: {
                headersToTemplateMap: mapFieldsInteractive,
                keysForAttachments: getKeysForAttachments,
            },
        };
        await generatePreviews(options);
    }
}
