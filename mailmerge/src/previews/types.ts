import { TemplateEngineOptions, TemplatePreview } from "../engines/types.js";
import { MappedRecord, EmailString } from "../util/types.js";

/**
 * Outputted to JSON files next to rendered template previews, containing metadata about the preview.
 */
export interface SidecarData {
    /** Name of the template rendered (used for logging) */
    name: string;
    /** Record associated with the template rendered  */
    record: MappedRecord;
    /** Engine used */
    engine: string;
    /** Options given to the engine */
    engineOptions: TemplateEngineOptions;
    /** Data about the files rendered */
    files: Array<{
        filename: string;
        /** Data returned from {@link TemplateEngine.renderPreview} */
        engineData: Omit<TemplatePreview, "content"> & {
            content: never | undefined;
        };
    }>;
    /** Metadata for emailing */
    email: {
        to: EmailString[];
        cc: EmailString[];
        bcc: EmailString[];
        subject: string;
    };
    /** Array of paths to attachments to include in the final email, relative to the mailmerge workspace root (top level folder) */
    attachments: string[];
}
