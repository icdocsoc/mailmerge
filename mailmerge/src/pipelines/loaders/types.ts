// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DEFAULT_FIELD_NAMES, RawRecord } from "../../util/index.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CSVBackend } from "./csv.js";

/**
 * Generic way of loading data in to do a data merge on.
 *
 * All you need to do is implement the `loadRecords` method, that resolves
 * to a set of headers and records.
 *
 * Headers are a set of strings, and records are an array of objects where the keys are the headers.
 *
 * Object keys can only be strings.
 *
 * However, the values can be any type, so long as they are JSON serialisable - so nested objects and arrays are allowed.
 *
 * For an example, see {@link CSVBackend}
 *
 * The following is assumed of any implementation:
 * 1. At a minimum the keys in {@link DEFAULT_FIELD_NAMES} can be provided
 * 2. Emails should not be passed as an array but a string with space separated emails.
 *
 * Generally, passing any of the {@link DEFAULT_FIELD_NAMES} as anything other than a string will probably
 * result in [object Object] appearing in places you don't expect. However for other fields nested objects/arrays should be fine.
 */
export interface DataSource {
    loadRecords: () => Promise<{
        headers: Set<string>;
        records: RawRecord[];
    }>;
}
