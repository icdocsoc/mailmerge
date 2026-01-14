import { promises as fs } from "fs";
import { join } from "path";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TemplatePreviews, TemplateEngine } from "../engines/types.js";
import { SidecarData } from "./types.js";

export async function loadPreviewsFromSidecar(
    files: SidecarData["files"],
    rootDir: string,
): Promise<TemplatePreviews> {
    return Promise.all(
        files.map(async (file) => ({
            ...file.engineData,
            content: await fs.readFile(join(rootDir, file.filename), "utf-8"),
        })),
    );
}
