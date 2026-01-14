export const DOCSOC_DEFAULT_FROM_LINE = `"DoCSoc" <docsoc@ic.ac.uk>`;

/** Expected names of requried email fields in records to data merge on */
export const DEFAULT_FIELD_NAMES = {
    to: "to",
    subject: "subject",
    /** CC only neded if cc sending enabled */
    cc: "cc",
    /** BCC only needed if bcc sending enabled */
    bcc: "bcc",
} as const;
