export type EmailString = `${string}@${string}`;
export type FromEmail = `"${string}" <${EmailString}>`;

export type RawRecord = Record<string, unknown>;
export type MappedRecord = Record<string, unknown>;
