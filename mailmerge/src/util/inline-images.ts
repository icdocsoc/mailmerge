/** See https://www.nodemailer.com/message/embedded-images/ */

/** How to specify a image we should attach as inline for sending */
import { createLogger } from "@docsoc/util";
import fs from "fs/promises";

export interface InlineImage {
    /** Filename to attach to email as */
    filename: string;
    /** Path to file relative to CWD */
    path: string;
    /** Content ID to use in the email - use <img src="cid:id123.png" /> if cid is id123.png, say */
    cid: string;
}

export type InlineImagesSpec = InlineImage[];

/**
 * Load & Validate a JSON containing {@link InlineImagesSpec} for use for inline imags.
 * @param path Path to inline images JSON
 * @param logger Loggr to use
 */
export async function loadInlineImageJSON(
    path: string,
    logger = createLogger("docsoc"),
): Promise<InlineImagesSpec> {
    logger.info("Loading inline images...");
    const inlineImages = JSON.parse(await fs.readFile(path, "utf-8"));
    // Validate the inline images
    if (!Array.isArray(inlineImages)) {
        logger.error(
            "Invalid inline images - must be an array of InlineImage objects. See https://www.nodemailer.com/message/embedded-images/ for format.",
        );
        throw new Error("Invalid inline images - must be an array of InlineImage objects.");
    }
    logger.info(`Loaded ${inlineImages.length} inline images.`);
    // Check all the paths are valid (accessble) & have a cid & filename proprty
    for (const image of inlineImages) {
        if (
            typeof image.filename !== "string" ||
            typeof image.path !== "string" ||
            typeof image.cid !== "string"
        ) {
            logger.error(
                "Invalid inline image - must have a filename, path, and cid property. Got ",
                image,
            );
            throw new Error(
                `Invalid inline image - must have a filename, path, and cid property. Got ${image}`,
            );
        }
    }

    return inlineImages;
}
