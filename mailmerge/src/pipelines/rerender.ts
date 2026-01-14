import { createLogger } from "@docsoc/util";

import { ENGINES_MAP } from "../engines/index.js";
import { TemplateEngineConstructor } from "../engines/types.js";
import { StorageBackend, MergeResultWithMetadata } from "./storage/types";

/**
 * Generic way tp rerender previews (so that modification to them may be made)
 * @param storageBackend Backend to load and re-save merge results
 * @param enginesMap Map of engine names to engine constructors, so that we can rerender previews using the original engine.
 * @param logger Logger to use for logging
 *
 * @template T Metadata type for the storage backend, if known - defaults to unknown. Useful if you want to use the returned results directly.
 * @return The rerendered merge results.
 */
export async function rerenderPreviews<T = unknown>(
    storageBackend: StorageBackend<T>,
    enginesMap: Record<string, TemplateEngineConstructor> = ENGINES_MAP,
    logger = createLogger("docsoc"),
): Promise<MergeResultWithMetadata<T>[]> {
    logger.info(`Rerendering previews...`);

    logger.info("Loading merge results...");
    const mergeResults = storageBackend.loadMergeResults();
    const rerenderedPreviews: MergeResultWithMetadata<T>[] = [];

    for await (const result of mergeResults) {
        const { record, previews, engineInfo, email } = result;
        logger.info(
            `Rerendering email addressed to ${JSON.stringify(email.to)} using engine ${
                engineInfo.name
            }...`,
        );
        const EngineClass = enginesMap[engineInfo.name];
        if (!EngineClass) {
            logger.error(`Invalid template engine: ${engineInfo.name}`);
            logger.warn(
                `Skipping record addressed to ${JSON.stringify(
                    email.to,
                )} as the engine is invalid!`,
            );
            continue;
        }

        // Load in the engine
        const engine = new EngineClass(engineInfo.options);
        logger.debug(
            `Loading engine ${engineInfo.name} for email addressed to addressed to ${JSON.stringify(
                email.to,
            )}...`,
        );
        await engine.loadTemplate();
        const renderedPreviews = await engine.rerenderPreviews(previews, record);
        rerenderedPreviews.push({
            ...result,
            previews: renderedPreviews,
        });
    }

    logger.info("Writing rerendered previews...");
    await storageBackend.storeUpdatedMergeResults(rerenderedPreviews);

    logger.info("Rerendering complete!");
    return rerenderedPreviews;
}
