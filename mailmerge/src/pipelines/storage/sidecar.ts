import { createLogger, move } from "@docsoc/util";
import fs from "fs/promises";
import { mkdirp } from "mkdirp";
import { join } from "path";

import { ENGINES_MAP, TemplatePreviews } from "../../engines/index.js";
import {
    SidecarData,
    loadSidecars,
    loadPreviewsFromSidecar,
    writeSidecarFile,
    getRecordPreviewPrefixForIndividual,
    writeMetadata,
    getSidecarMetadata,
} from "../../previews/index.js";
import { MappedRecord } from "../../util/index.js";
import {
    StorageBackend,
    MergeResultWithMetadata,
    MergeResult,
    PostSendActionMode,
} from "./types.js";

/** Metadata the JSON backend passes on {@link MergeResultWithMetadata.storageBackendMetadata} - bsically the original sidecar file with the path it came from */
export interface JSONSidecarsBackendMetadata {
    sideCar: SidecarData & {
        /** Path to the original sidecar file */
        $originalFilepath: string;
    };
}

/**
 * Store the sidecar metadata for a record & the previews generated from it on the file system at {@link outputRoot}.
 *
 * Sidecar files here are JSON files placed next to the previews, containing metadata about the previews.
 */
export class JSONSidecarsBackend implements StorageBackend<JSONSidecarsBackendMetadata> {
    constructor(
        /** Root to load/store sidecar fils to */
        private outputRoot: string,
        /**
         * How to name the files when outputting them: specifcally what to prefix with them.
         *
         * Note that fileNamer is only used in {@link storeOriginalMergeResults} - in
         * other cases like regenerating outputs and resaving them via {@link storeUpdatedMergeResults} or {@link loadMergeResults}, provide a blank/dummy filenamer. */
        private fileNamer:
            | {
                  /** You already know the shape of a record, so can provide the namer upfront */
                  type: "fixed";
                  namer: (record: MappedRecord) => string;
              }
            | {
                  /** You need to know the shape of a record, so need to provide the namer later (e.g. by prompting the user how to construct it) */
                  type: "dynamic";
                  namer: (
                      headers: Set<string>,
                      records: MappedRecord[],
                  ) => PromiseLike<(record: MappedRecord) => string>;
              },
        private logger = createLogger("sidecar"),
    ) {}

    /**
     * Load all sidecar files from the output root, and the files associated with them and return them as merge results.
     *
     * Uses this with an async for loop, e.g.:
     * @example
     * for await (const mergeResult of storageBackend.loadMergeResults()) {
     *    // Do something with mergeResult
     * }
     */
    public async *loadMergeResults(): AsyncGenerator<
        MergeResultWithMetadata<JSONSidecarsBackendMetadata>
    > {
        this.logger.info(`Loading previews from ${this.outputRoot}...`);
        // 1: Load all sidecars
        const sidecars = loadSidecars(this.outputRoot);
        // 2: Map sidecar files & rerender
        for await (const sidecar of sidecars) {
            const { name, engine: engineName, engineOptions, files, record } = sidecar;

            const EngineClass = ENGINES_MAP[engineName as keyof typeof ENGINES_MAP];
            if (!EngineClass) {
                this.logger.error(`Invalid template engine: ${engineName}`);
                this.logger.warn(`Skipping record ${name} as the engine is invalid!`);
                continue;
            }
            this.logger.debug("Remapping sidecar files metadata back to merge results...");
            const previews: TemplatePreviews = await loadPreviewsFromSidecar(
                files,
                this.outputRoot,
            );

            yield {
                record,
                previews,
                engineInfo: {
                    name: engineName as keyof typeof ENGINES_MAP,
                    options: engineOptions,
                },
                attachmentPaths: sidecar.attachments,
                email: sidecar.email,
                storageBackendMetadata: {
                    sideCar: sidecar,
                },
            };
        }
    }

    /**
     * Store the updated merge results back to the storage - called after they are rerendered with all new results.
     *
     * Acts as a bulk replace operation
     */
    public async storeUpdatedMergeResults(
        results: MergeResultWithMetadata<JSONSidecarsBackendMetadata>[],
    ): Promise<void> {
        for (const result of results) {
            const sidecar = result.storageBackendMetadata.sideCar;
            const { name } = sidecar;
            this.logger.info(`Writing rerendered previews for ${name}...`);
            await Promise.all(
                result.previews.map(async (preview, idx) => {
                    const file = sidecar.files[idx];
                    this.logger.debug(`Writing rerendered preview ${file.filename}...`);
                    await fs.writeFile(join(this.outputRoot, file.filename), preview.content),
                        this.logger.debug("Overwriting sidecar metadata with new metadata...");
                    sidecar.files[idx].engineData = {
                        ...preview,
                        content: undefined,
                    };
                }),
            );

            this.logger.info(
                `Updating sidecar metadata for ${name} at ${sidecar.$originalFilepath}...`,
            );
            await writeSidecarFile(sidecar.$originalFilepath, sidecar);
        }
    }

    /**
     * After send, move the sent emails to a sent folder.
     *
     * Operates on a singular result.
     */
    public async postSendAction(
        resultSent: MergeResultWithMetadata<JSONSidecarsBackendMetadata>,
        mode: PostSendActionMode,
    ): Promise<void> {
        const sidecar = resultSent.storageBackendMetadata.sideCar;
        let directoryName;
        switch (mode) {
            case PostSendActionMode.DRAFTS_UPLOAD:
                directoryName = "drafts";
                break;
            case PostSendActionMode.SMTP_SEND:
                directoryName = "sent";
                break;
            default:
                throw new Error(`Invalid post-send action mode: ${mode}`);
        }
        const sentRoot = join(this.outputRoot, directoryName);
        this.logger.info(`Moving sent emails for ${sidecar.name} to ${sentRoot}...`);
        await mkdirp(sentRoot);
        await Promise.all(
            sidecar.files
                .map(async (file) => {
                    await move(join(this.outputRoot, file.filename), sentRoot);
                })
                .concat([move(sidecar.$originalFilepath, sentRoot)]),
        );
    }

    /**
     * Store results - see {@link getRecordPreviewPrefixForIndividual} for how the previews are named
     */
    public async storeOriginalMergeResults(
        results: MergeResult[],
        { headers, records }: { headers: Set<string>; records: MappedRecord[] },
    ): Promise<void> {
        this.logger.warn(`Writing previews to ${this.outputRoot}...`);
        let fileNamer: (record: MappedRecord) => string;
        if (this.fileNamer.type === "fixed") {
            fileNamer = this.fileNamer.namer;
        } else {
            fileNamer = await this.fileNamer.namer(headers, records);
        }
        this.logger.debug("Creating directories...");
        await mkdirp(this.outputRoot);
        this.logger.debug("Writing files...");
        await Promise.all(
            results.flatMap(
                async ({ previews, record, engineInfo, attachmentPaths: attachmentPath }) => {
                    const operations = previews.map(async (preview) => {
                        const fileName = getRecordPreviewPrefixForIndividual(
                            record,
                            fileNamer,
                            engineInfo.name,
                            preview,
                        );
                        this.logger.debug(`Writing ${fileName}...`);
                        await fs.writeFile(join(this.outputRoot, fileName), preview.content);
                    });

                    // Add metadata write operation
                    operations.push(
                        writeMetadata(
                            record,
                            getSidecarMetadata(
                                fileNamer,
                                record,
                                engineInfo.name,
                                engineInfo.options,
                                attachmentPath,
                                previews,
                            ),
                            fileNamer,
                            this.outputRoot,
                        ),
                    );

                    return operations;
                },
            ),
        );

        this.logger.info(`Done! Review previews at ${this.outputRoot} and then send.`);
    }
}
