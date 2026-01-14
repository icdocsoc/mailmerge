import { createLogger } from "@docsoc/util";
import fs from "fs/promises";

import type { RawRecord } from "../../util";
import type { DataSource } from "./types";

/**
 * Backend for using a JSON file as a source for the datamerge.
 *
 * Accepts the path to a JSON file and will load it in to be used as a data source.
 *
 * You can also provide a custom winston logger to the constructor to log messages.
 *
 * NOTE: The JSON file must be a list of objects, where each object is a record. I.e. at it's root is an array of objects.
 *
 * NOTE: All JSON records must have all the same keys. If a record is missing a key, it may cause a crash.
 *
 * @example ```json
 * [
 *   {
 *     "name": "John Doe",
 *     "email": "john.doe@gmail.com",
 *   },
 * ]
 */
export class JSONBackend implements DataSource {
    constructor(private jsonFile: string, private logger = createLogger("json")) {}
    async loadRecords(): Promise<{ headers: Set<string>; records: RawRecord[] }> {
        this.logger.info("Loading JSON...");
        const jsonRaw = await fs.readFile(this.jsonFile, "utf-8");

        this.logger.debug("Parsing JSON...");
        const records: RawRecord[] = JSON.parse(jsonRaw);
        this.logger.info(`Loaded ${records.length} records`);

        this.logger.warn(
            "NOTE: All JSON records must have all the same keys. If a record is missing a key, it may cause a crash.",
        );

        if (!Array.isArray(records)) {
            this.logger.error("JSON is not a list of objects! JSON must be a list of objects.");
            throw new Error(
                "JSON is not a list of objects - JSON must be a list of objects in order to be usable as records",
            );
        }

        this.logger.debug("Extracting headers from first record's keys...");
        if (records.length === 0) {
            this.logger.error("No records found in JSON");
            throw new Error("No records found in JSON");
        }

        const headers = new Set<string>(Object.keys(records[0]));
        this.logger.info(`Headers: ${Object.keys(records[0]).join(", ")}`);
        return { headers, records };
    }
}
