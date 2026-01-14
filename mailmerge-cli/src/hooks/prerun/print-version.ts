import { createLogger } from "@docsoc/util";
import { Hook } from "@oclif/core";

const logger = createLogger("mailmerge");

const hook: Hook<"prerun"> = async function () {
    const packageJSON = await import("../../../package.json");
    logger.info("DoCSoc Mailmerge");
    logger.info("(c) Kishan Sambhi 2024");
    logger.info(`v${packageJSON.version}`);
    logger.info("");
};

export default hook;
