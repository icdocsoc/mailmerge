import { createLogger } from "@docsoc/util";
import { parse } from "csv-parse";
import fs from "fs/promises";

import { RawRecord } from "../../util/types.js";
import { DataSource } from "./types.js";

/**
 * Backend for using CSV as a source for the datamerge.
 *
 * Accept the path to a CSV file and will load it in to be used as a data source.
 *
 * You can also provide a custom winston logger to the constructor to log messages.
 */
export class CSVBackend implements DataSource {
    constructor(private csvFile: string, private logger = createLogger("csv")) {}
    async loadRecords(): Promise<{ headers: Set<string>; records: RawRecord[] }> {
        // Load CSV
        this.logger.info("Loading CSV...");
        const csvRaw = await fs.readFile(this.csvFile, "utf-8");
        this.logger.debug("Parsing & loading CSV...");
        const csvParsed = parse(csvRaw, { columns: true });
        const records: RawRecord[] = [];
        for await (const record of csvParsed) {
            records.push(record);
        }
        this.logger.info(`Loaded ${records.length} records`);
        this.logger.debug("Extracting headers from first record's keys...");
        if (records.length === 0) {
            this.logger.error("No records found in CSV");
            throw new Error("No records found in CSV");
        }
        const headers = new Set<string>(Object.keys(records[0]));
        this.logger.info(`Headers: ${Object.keys(records[0]).join(", ")}`);
        return { headers, records };
    }
}
