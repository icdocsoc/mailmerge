import { InteractiveBrowserCredential } from "@azure/identity";
import { createLogger } from "@docsoc/util";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import cliProgress from "cli-progress";
import fs from "fs/promises";
import { basename } from "path";

import { EmailString } from "../util/types.js";

export interface ImapConfig {
    host: string;
    port: number;
    username: string;
}

/** Docs say limit to 4MB uplod chuncks for large files */
const UPLOAD_ATTACHMENT_CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Class to upload emails to an authenticated user's mailbox.
 *
 * Uses the Microsoft Graph API via OAuth for this.
 *
 * NOTE: This will trigger a browser window to open for OAuth authentication.
 */
export class EmailUploader {
    private client?: Client;

    constructor(private logger = createLogger("graph")) {}

    /**
     * Authenticate and check we have the correct user we want to upload to
     *
     * NOTE: This will trigger a browser window to open for OAuth authentication.
     * @param desiredEmail
     * @param tenantId
     * @param clientId
     */
    public async authenticate(desiredEmail: string, tenantId?: string, clientId?: string) {
        this.logger.info("Getting OAuth token using Microsoft libraries...");

        if (!tenantId) {
            throw new Error("Tenant ID not provided");
        }
        if (!clientId) {
            throw new Error("Client ID not provided");
        }

        const credential = new InteractiveBrowserCredential({
            tenantId: tenantId,
            clientId: clientId,
            redirectUri: "http://localhost",
        });

        // @microsoft/microsoft-graph-client/authProviders/azureTokenCredentials
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ["Mail.ReadWrite"],
        });

        this.client = Client.initWithMiddleware({ authProvider: authProvider });

        try {
            const user = await this.client.api("/me").get();
            if (user.mail === desiredEmail || user.userPrincipalName === desiredEmail) {
                this.logger.info(
                    `Authenticated user email matches the provided email ${desiredEmail}.`,
                );
            } else {
                this.logger.error(
                    `Authenticated user email does not match the provided email ${desiredEmail}.`,
                );
                throw new Error(
                    `Authenticated user email does not match the provided email ${desiredEmail}.`,
                );
            }
        } catch (error) {
            this.logger.error("Error fetching user profile:", error);
            throw error;
        }
    }

    /**
     * Upload attachments to a created message
     * @param path Path to attachment to upload
     * @param messageID ID of the message to upload the attachment to
     * @param cid Optional ContentID to upload under for use in IMG tags.
     */
    private async uploadFile(path: string, messageID: string, cid?: string) {
        this.logger.info(`Uploading file ${path}...`);
        if (!this.client) {
            throw new Error("Client not authenticated");
        }
        const fileData = await fs.readFile(path);
        const fileStats = await fs.stat(path);
        const filename = basename(path);

        // If above 3MB
        if (fileStats.size > 3 * 1024 * 1024) {
            // Initialize progress bar
            const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            progressBar.start(fileStats.size, 0);

            // 1: Create upload session
            const uploadSession = await this.client
                .api(`/me/messages/${messageID}/attachments/createUploadSession`)
                .post({
                    AttachmentItem: {
                        attachmentType: "file",
                        name: filename,
                        size: fileStats.size,
                        contentId: cid,
                    },
                });
            const { uploadUrl } = uploadSession;

            if (!uploadUrl) {
                throw new Error("No upload URL returned from createUploadSession.");
            }

            // 2: Upload file in chunks
            let start = 0;
            let end = UPLOAD_ATTACHMENT_CHUNK_SIZE - 1;
            const fileSize = fileStats.size;

            while (start < fileSize) {
                const chunk = fileData.slice(start, end + 1);
                const contentRange = `bytes ${start}-${end}/${fileSize}`;
                const response = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Content-Range": contentRange,
                        "Content-Length": chunk.length.toString(),
                    },
                    body: chunk,
                });

                if (!response.ok) {
                    progressBar.stop();
                    console.log("");
                    console.log("");
                    this.logger.error(`Failed to upload chunk: ${response.statusText}`);
                    throw new Error(`Failed to upload chunk: ${response.statusText}`);
                }

                if (response.status === 201) {
                    // Upload complete
                    break;
                }

                const responseBody = await response.json();

                // Update start and end based on next expected ranges
                const nextExpectedRanges = responseBody.nextExpectedRanges;
                if (nextExpectedRanges && nextExpectedRanges.length > 0) {
                    const nextRange = nextExpectedRanges[0].split("-");
                    start = parseInt(nextRange[0], 10);
                    end = Math.min(start + UPLOAD_ATTACHMENT_CHUNK_SIZE - 1, fileSize - 1);
                } else {
                    start += UPLOAD_ATTACHMENT_CHUNK_SIZE;
                    end = Math.min(start + UPLOAD_ATTACHMENT_CHUNK_SIZE - 1, fileSize - 1);
                }

                // Update progress bar
                progressBar.update(start);
            }

            // Stop progress bar
            progressBar.update(fileSize);
            progressBar.stop();
            this.logger.info(`File ${path} uploaded successfully in chunks.`);
        } else {
            try {
                await this.client.api(`/me/messages/${messageID}/attachments`).post({
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: filename,
                    contentBytes: fileData.toString("base64"),
                });
                this.logger.debug(`File ${path} uploaded.`);
            } catch (error) {
                console.error("Error uploading file: ", error);
            }
        }
    }

    /**
     * Upload an email draft to the authenticated user's Drafts
     * @param to List of email addresses to send to
     * @param subject Subject of the email
     * @param html HTML content of the email
     * @param attachmentPaths List of paths to attachments to upload, with their CIDs if needed
     * @param additionalInfo Additional info for the email (cc, bcc)
     * @param options Options for the uploader (e.g. enabling hacks to get around Outlook limitations)
     */
    public async uploadEmail(
        to: string[],
        subject: string,
        html: string,
        attachmentPaths: (string | { path: string; cid: string })[] = [],
        additionalInfo: { cc: EmailString[]; bcc: EmailString[] } = { cc: [], bcc: [] },
        options: {
            /**
             * Enable a hack to place a `<p><br></p>` between adjacent paragraphs
             * to ensure blank lines between paragraphs show up in Outlook
             * (outlook clears the default margin on `<p>` elements which usually
             * gives the illusion of a blank line betwee them)
             */
            enableOutlookParagraphSpacingHack?: boolean;
        },
    ) {
        if (!this.client) {
            throw new Error("Client not authenticated");
        }
        // HACK: Replace </p><p> (adjacent paragraphs) with </p><p><br></p><p>
        // to create blank lines in outlook
        let htmlToUpload = html;
        if (options.enableOutlookParagraphSpacingHack) {
            htmlToUpload = html.replace(/<\/p>\s*<p>/g, "</p><p><br></p><p>");
        }
        try {
            const draftMessage = {
                subject,
                body: {
                    contentType: "HTML",
                    content: htmlToUpload,
                },
                toRecipients: to.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                })),
                ccRecipients: additionalInfo.cc.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                })),
                bccRecipients: additionalInfo.bcc.map((email) => ({
                    emailAddress: {
                        address: email,
                    },
                })),
            };

            const response = await this.client.api("/me/messages").post(draftMessage);
            this.logger.debug("Draft email created with ID: ", response.id);

            if (attachmentPaths.length > 0) {
                this.logger.info("Uploading attachments...");
                for (const path of attachmentPaths) {
                    if (typeof path === "string") {
                        await this.uploadFile(path, response.id);
                    } else {
                        await this.uploadFile(path.path, response.id, path.cid);
                    }
                }
            }
        } catch (error) {
            console.error("Error uploading draft email: ", error);
        }
    }
}
