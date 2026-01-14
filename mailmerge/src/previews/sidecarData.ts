/**
 * Handle "sidecar" data - these are JSON files that sit next to rendered template previews,
 * containing metadata about the preview, so that we can re-render them later.
 *
 * @packageDocumentation
 */
import { createLogger } from "@docsoc/util";
import fs from "fs/promises";
import { join } from "path";

import {
    TemplateEngineOptions,
    TemplatePreview,
    TemplatePreviews, // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TemplateEngine,
} from "../engines/types.js";
import Mailer from "../mailer/mailer.js";
import { DEFAULT_FIELD_NAMES } from "../util/constants.js";
import { MappedRecord, EmailString } from "../util/types.js";
import { SidecarData } from "./types.js";

const PARTS_SEPARATOR = "__";
const METADATA_FILE_SUFFIX = "-metadata.json";
const logger = createLogger("docsoc.sidecar");

/**
 * Generate the first part of a filename for a record's previews - this part
 * identifies the record itself via the fileNamer function.
 * @param record The record to generate a prefix for
 * @param fileNamer A function that generates a filename for a record
 * @returns
 */
export const getRecordPreviewPrefix = (
    record: MappedRecord,
    fileNamer: (record: MappedRecord) => string,
) => `${fileNamer(record)}`;

/**
 * Generate predicable prefixes for preview names (including record specific part
 *
 * @example
 * const record = { id: "1", name: "Test Record" };
 * const fileNamer = (record: CSVRecord) => `file_${record["id"]}`;
 * getRecordPreviewPrefixForIndividual(record, fileNamer, "nunjucks", { name: "preview1.txt", content: "content1", metadata: { key: "value" } })
 * // => "file_1__nunjucks__preview1.txt"
 */
export const getRecordPreviewPrefixForIndividual = (
    record: MappedRecord,
    fileNamer: (record: MappedRecord) => string,
    templateEngine: string,
    preview: TemplatePreview,
) =>
    [getRecordPreviewPrefix(record, fileNamer), templateEngine, preview.name].join(PARTS_SEPARATOR);

/**
 * Generate the filename for the metadata file for a record
 * @param record The record to generate a metadata filename for
 * @param fileNamer A function that generates a filename for a record
 * @example
 * const record = { id: "1", name: "Test Record" };
 * const fileNamer = (record: CSVRecord) => `file_${record["id"]}`;
 * getRecordPreviewPrefixForMetadata(record, fileNamer)
 * // => "file_1-metadata.json"
 */
export const getRecordPreviewPrefixForMetadata = (
    record: MappedRecord,
    fileNamer: (record: MappedRecord) => string,
) => `${getRecordPreviewPrefix(record, fileNamer)}${METADATA_FILE_SUFFIX}`;

export type ValidRecordReturn = { valid: false; reason: string } | { valid: true };
/**
 * Check a record is valid for use in mailmerge - specifically, that it has a valid email address and a subject.
 * @param record __Mapped__ CSV Record to validate
 */
export const validateRecord = (record: MappedRecord): ValidRecordReturn => {
    const validateAll = parseEmailList(record[DEFAULT_FIELD_NAMES.to] as string).reduce(
        (acc, email) => acc && Mailer.validateEmail(email),
        true,
    );
    if (!validateAll) {
        return {
            valid: false,
            reason: `Invalid email address in list ${record[DEFAULT_FIELD_NAMES.to]}`,
        };
    }

    if (!record[DEFAULT_FIELD_NAMES.subject]) {
        return {
            valid: false,
            reason: "No subject provided",
        };
    }

    return {
        valid: true,
    };
};

/**
 * Write the metadata for a record & its associated previews to a JSON file.
 * @param record The record to write metadata for, mapped to the fields required by the template
 * @param sidecarData Sidecar data to write. Use {@link getSidecarMetadata} to get.
 * @param fileNamer A function that generates a filename for a record
 * @param previewsRoot The root directory to write the metadata to
 * @returns
 */
export async function writeMetadata(
    record: MappedRecord,
    sidecarData: SidecarData,
    fileNamer: (record: MappedRecord) => string,
    previewsRoot: string,
): Promise<void> {
    const recordState = validateRecord(record);
    if (!recordState.valid) {
        logger.warn(
            `Skipping metadata for ${fileNamer(record)} due to invalid record: ${
                recordState.reason
            }`,
        );
        return Promise.resolve();
    }
    const metadataFile = getRecordPreviewPrefixForMetadata(record, fileNamer);
    logger.debug(`Writing metadata for ${fileNamer(record)} to ${metadataFile}`);
    await writeSidecarFile(join(previewsRoot, metadataFile), sidecarData);
    return Promise.resolve();
}

const parseEmailList = (emailList: string | undefined): EmailString[] =>
    emailList ? (emailList.split(/\s/) as EmailString[]) : [];

/**
 * Generate sidecar metadata for a record & the previews generated from it.
 * It is recommended you then store this info alongside the preview, e.g. in a JSON file
 *
 * The idea of sidecar metadata is to allow us to rerender previews again and again.
 * @param fileNamer Function that given a record, provides the prefix to preppend the name of any generated preview files (including sidecar metadata)
 * @param record The record to write metadata for, mapped to the fields required by the template. This is assumed to be a valid record (see {@link validateRecord})
 * @param templateEngine Template engine used
 * @param templateOptions Options for that template engine (included in the sidecar)
 * @param attachments Array of paths to attachments to include in the final email, relative to the mailmerge workspace root (top level folder)
 * @param previews Previews rendered for the record - we will remove the content field from it and include the rest of the preview object to the sidecar metadata
 * @returns Sidecar metadata
 */
export function getSidecarMetadata(
    fileNamer: (record: MappedRecord) => string,
    record: MappedRecord,
    templateEngine: string,
    templateOptions: TemplateEngineOptions,
    attachments: string[],
    previews: TemplatePreviews,
): SidecarData {
    return {
        name: fileNamer(record),
        record: record,
        engine: templateEngine,
        engineOptions: templateOptions,
        files: previews.map((preview) => ({
            filename: getRecordPreviewPrefixForIndividual(
                record,
                fileNamer,
                templateEngine,
                preview,
            ),
            engineData: {
                ...preview,
                content: undefined,
            },
        })),
        email: createEmailData(record),
        attachments,
    };
}

export interface EmailData {
    to: EmailString[];
    cc: EmailString[];
    bcc: EmailString[];
    subject: string;
}

/**
 * Given a __mapped__ record, extract the expected email data from it.
 * @param record Mapped record to get email data from
 * @returns
 */
export function createEmailData(record: MappedRecord): EmailData {
    return {
        to: parseEmailList(record[DEFAULT_FIELD_NAMES.to] as string),
        cc: parseEmailList(record[DEFAULT_FIELD_NAMES.cc] as string),
        bcc: parseEmailList(record[DEFAULT_FIELD_NAMES.bcc] as string),
        subject: record[DEFAULT_FIELD_NAMES.subject] as string,
    };
}

/**
 * Write the sidecar metadata file for a record
 */
export async function writeSidecarFile(metadataFilePath: string, sidecar: SidecarData) {
    await fs.writeFile(metadataFilePath, JSON.stringify(sidecar, null, 4));
}

/**
 * Load sidecar metadata files from a directory
 * @param previewsRoot The root directory to load sidecar metadata from
 * @returns An async iterator of sidecar metadata objects
 */
export async function* loadSidecars(
    previewsRoot: string,
): AsyncIterableIterator<SidecarData & { $originalFilepath: string }> {
    logger.info(`Loading sidecar metadata from ${previewsRoot}`);
    const files = await fs.readdir(previewsRoot);
    const metadataFiles = files.filter((file) => file.endsWith(METADATA_FILE_SUFFIX));

    for (const metadataFile of metadataFiles) {
        logger.debug(`Loading metadata from ${metadataFile}`);
        const metadata = await fs.readFile(join(previewsRoot, metadataFile), "utf-8");
        yield {
            ...(JSON.parse(metadata) as SidecarData),
            $originalFilepath: join(previewsRoot, metadataFile),
        };
    }
}
