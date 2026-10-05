import { createLogger } from "@docsoc/util";
import { convert } from "html-to-text";
import type { gmail_v1 } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer/index.js";

import { DraftUploader, EmailString } from "../util/types.js";
import { authenticateGoogle, verifyGoogleAccount } from "./auth.js";

/**
 * Class to upload emails to the authenticated user's Gmail Drafts.
 *
 * Uses the Gmail API via OAuth. This is the Google equivalent of the Microsoft Graph
 * {@link ../graph/uploadDrafts.EmailUploader} and exposes the same `authenticate`/`uploadEmail`
 * surface so the upload-drafts pipeline can use either interchangeably.
 *
 * NOTE: This will trigger a browser window to open for OAuth authentication.
 */
export class GmailDraftUploader implements DraftUploader {
    private gmail?: gmail_v1.Gmail;
    private senderEmail?: string;

    constructor(private logger = createLogger("google")) {}

    /**
     * Authenticate and check we have signed in as the account we want to upload drafts to.
     *
     * NOTE: This will trigger a browser window to open for OAuth authentication.
     * @param desiredEmail The sender email (`DOCSOC_SENDER_EMAIL`) the signed-in account must match
     * @param keyfilePath Path to the downloaded Google OAuth client credentials JSON
     */
    public async authenticate(desiredEmail: string, keyfilePath?: string) {
        this.logger.info("Getting OAuth token using Google libraries...");

        if (!keyfilePath) {
            throw new Error("Google credentials file path not provided");
        }

        const client = await authenticateGoogle(keyfilePath);
        await verifyGoogleAccount(client, desiredEmail, this.logger);
        this.logger.info(`Authenticated user email matches the provided email ${desiredEmail}.`);

        // Lazily imported: googleapis is large and transitively loads ESM-only deps; only load it
        // once we actually need the Gmail client.
        const { google } = await import("googleapis");
        this.senderEmail = desiredEmail;
        this.gmail = google.gmail({ version: "v1", auth: client });
    }

    /**
     * Upload an email draft to the authenticated user's Gmail Drafts.
     * @param to List of email addresses to send to
     * @param subject Subject of the email
     * @param html HTML content of the email
     * @param attachmentPaths List of paths to attachments to upload, with their CIDs if needed
     * @param additionalInfo Additional info for the email (cc, bcc)
     * @param _options Accepted for signature-compatibility with the Microsoft Graph uploader; the
     * Outlook-specific options (e.g. the paragraph-spacing hack) do not apply to Gmail and are ignored.
     */
    public async uploadEmail(
        to: string[],
        subject: string,
        html: string,
        attachmentPaths: (string | { path: string; cid: string })[] = [],
        additionalInfo: { cc: EmailString[]; bcc: EmailString[] } = { cc: [], bcc: [] },
        _options: { enableOutlookParagraphSpacingHack?: boolean } = {},
    ) {
        if (!this.gmail || !this.senderEmail) {
            throw new Error("Client not authenticated");
        }

        // Build a raw RFC822 MIME message using nodemailer's MailComposer so attachments and inline
        // images (via cid) are handled the same way as when sending.
        const attachments = attachmentPaths.map((attachment) =>
            typeof attachment === "string"
                ? { path: attachment }
                : { path: attachment.path, cid: attachment.cid },
        );

        const message = await new Promise<Buffer>((resolve, reject) => {
            new MailComposer({
                from: this.senderEmail,
                to,
                cc: additionalInfo.cc,
                bcc: additionalInfo.bcc,
                subject,
                html,
                text: convert(html),
                attachments,
            })
                .compile()
                .build((err, built) => (err ? reject(err) : resolve(built)));
        });

        // Gmail expects the raw message base64url-encoded.
        const raw = message.toString("base64url");

        try {
            const response = await this.gmail.users.drafts.create({
                userId: "me",
                requestBody: { message: { raw } },
            });
            this.logger.debug("Draft email created with ID: ", response.data.id);
        } catch (error) {
            // Rethrow: a swallowed failure here would let the pipeline mark the record as
            // successfully uploaded and advance, silently losing the draft.
            this.logger.error("Error uploading draft email: ", error);
            throw error;
        }
    }
}
