import { createLogger } from "@docsoc/util";
import "dotenv/config";

import { TemplateEngineOptions, TemplateEngine, TemplatePreviews } from "../engines/index.js";
import { validateRecord, createEmailData } from "../previews/index.js";
import { DEFAULT_FIELD_NAMES, MappedRecord, RawRecord } from "../util/index.js";
import { DataSource } from "./loaders";
import { StorageBackend, MergeResult } from "./storage/types";

/** Options & required things when running a mailmerge */
export interface GenerateOptions {
    /** The engine to use for mapping records to merged outputs */
    engineInfo: {
        /** Name of the engine - this will be provided to the storage backend to allow reloading of it later */
        name: string;
        /** Options to pass to the engine */
        options: TemplateEngineOptions;
        /** The engine to use */
        engine: TemplateEngine;
    };
    /**
     * By default the program will try to use record fields to get attachments - specifically we expect records to contain the path to the attachment (relative to CWD or absolut)
     *
     * Using this you can overridee mappings of attachments from the records with a list of attachments for every email.
     *
     * This will result in {@link GenerateOptions["mappings"].keysForAttachments} being ignored.
     *
     * As a result, every email will have the same attachments.
     */
    attachments?: string[];
    /**
     * Enable functionality only some merges will need
     */
    features: {
        /** Enable CC mapping from records - column values must be a space separated list */
        enableCC?: boolean;
        /** Enable BCC mapping from records - column values must be a space separated list of emails */
        enableBCC?: boolean;
    };
    /** DataSource backend to get records to data merge on from. See {@link DataSource} */
    dataSource: DataSource;
    /** Storage backend for storing mail merge result somehow */
    storageBackend: StorageBackend;
    /** Mappings the data merge system needs to go from data to mail merge, or functions to get these mappings */
    mappings: {
        /**
         * Map of data source headers to template headers.
         *
         * Either provide a map of *record header fields* to *template* fields,
         * or a function that will generate and return this map (e.g. via user input)
         * given the templatefields & headers.
         *
         * **NOTE:** At the minimum a `headersToTemplateMap` must provide a way to retrieved values that correspond to the keys of {@link DEFAULT_FIELD_NAMES}.
         *  Specifically, it is expected that fields with the names that correspond
         *  to the keys of {@link DEFAULT_FIELD_NAMES} have a mapping from some record key to them.
         */
        headersToTemplateMap:
            | Map<string, string>
            | ((
                  templateFields: Set<string>,
                  headers: Set<string>,
              ) => PromiseLike<Map<string, string>>);
        /**
         * Provide either the list of fields in the records that contain the *path* to attachments for emails,
         * or a function that will generate this given the headers of the record (e.g. by user input)
         */
        keysForAttachments: string[] | ((headers: Set<string>) => PromiseLike<string[]>);
    };
}

// TODO: Put somewhere nice
/** Fields that should always be mapped - basically the keys of {@link DEFAULT_FIELD_NAMES} */
const ADDITIONAL_FIELDS_TO_MAP: Array<string> = [
    DEFAULT_FIELD_NAMES.to,
    DEFAULT_FIELD_NAMES.subject,
];

/**
 * A generic way to generate previews for a mail merge.
 * @param opts Options for the mail merge - see the type
 * @param logger Winston logger to use for logging
 * @return The merge results (in case you wish to use them outside of the storage backend)
 */
export async function generatePreviews(
    opts: GenerateOptions,
    logger = createLogger("docsoc"),
): Promise<MergeResult[]> {
    // 1: Load data
    logger.info("Loading data...");
    const { headers, records } = await opts.dataSource.loadRecords();

    // 4: Load template via template engine
    logger.info("Loading template...");
    const engine = opts.engineInfo.engine;
    await engine.loadTemplate();

    // 5: Extract template fields
    logger.info("Extracting template fields...");
    const templateFields = engine.extractFields();
    logger.info(`Fields found: ${Array.from(templateFields).join(", ")}`);

    // 6: Map fields to template
    logger.info("Mapping fields to template");
    if (opts.features.enableCC) {
        logger.debug("Enabling CC mapping from records");
        ADDITIONAL_FIELDS_TO_MAP.push(DEFAULT_FIELD_NAMES.cc);
    }
    if (opts.features.enableBCC) {
        logger.debug("Enabling BCC mapping from records");
        ADDITIONAL_FIELDS_TO_MAP.push(DEFAULT_FIELD_NAMES.bcc);
    }

    const fieldsToMap = new Set([...templateFields, ...ADDITIONAL_FIELDS_TO_MAP]);

    const fieldsMaptoTemplate =
        opts.mappings.headersToTemplateMap instanceof Map
            ? opts.mappings.headersToTemplateMap
            : await opts.mappings.headersToTemplateMap(fieldsToMap, headers);

    // 6.5: handle attachments
    logger.debug("Handling attachments...");
    // NOTE: This is designed to operate on the original record
    let getAttachmentsFromRecord: (record: RawRecord) => string[];
    let attachmentHeaders: string[] = [];
    if (typeof opts.attachments === "undefined" || opts.attachments.length <= 0) {
        logger.info("Using attachments from records");
        attachmentHeaders = Array.isArray(opts.mappings.keysForAttachments)
            ? opts.mappings.keysForAttachments
            : await opts.mappings.keysForAttachments(headers);
        getAttachmentsFromRecord = (record) =>
            attachmentHeaders.map((head) => record[head] as string);
    } else {
        logger.info("Using attachments from CLI options.");
        getAttachmentsFromRecord = () => opts.attachments ?? [];
    }

    // 8: Render intermediate results
    logger.info("Rendering template previews/intermediates...");
    // NOTE: MappedRecord here is the record with its fields mapped to the template fields, rather than with the raw template fields
    const previews: [TemplatePreviews, MappedRecord, RawRecord][] = await Promise.all(
        records
            .map((originalRecord) =>
                // Only include fields that are mapped
                [
                    Object.fromEntries(
                        Object.entries(originalRecord)
                            .filter(([key]) => fieldsMaptoTemplate.has(key))
                            .map(([key, value]) => {
                                return [fieldsMaptoTemplate.get(key) ?? key, value];
                            }),
                    ),
                    originalRecord,
                ],
            )
            .filter(([preparedRecord]) => {
                const validState = validateRecord(preparedRecord);
                if (!validState.valid) {
                    logger.warn(
                        `Skipping metadata for ${JSON.stringify(
                            preparedRecord,
                        )} due to invalid record: ${validState.reason}`,
                    );
                    return false;
                }
                return true;
            })
            .map(async ([preparedRecord, originalRecord]) => [
                await engine.renderPreview(preparedRecord),
                preparedRecord,
                originalRecord,
            ]),
    );

    // 9: Write to file
    logger.info("Writing results...");
    const results: MergeResult[] = previews.map(([previews, record, originalRecord]) => ({
        record,
        previews,
        engineInfo: {
            name: opts.engineInfo.name,
            options: opts.engineInfo.options,
        },
        attachmentPaths: getAttachmentsFromRecord(originalRecord),
        email: createEmailData(record),
    }));

    await opts.storageBackend.storeOriginalMergeResults(results, { headers, records });

    logger.info(`Done! Review the previews and then send.`);

    return results;
}
