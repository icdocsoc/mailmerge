import { createLogger } from "@docsoc/util";
import chalk from "chalk";
// Load dotenv
import "dotenv/config";
import readlineSync from "readline-sync";

import { TemplateEngineConstructor, ENGINES_MAP } from "../engines/index.js";
import { GmailDraftUploader } from "../google/index.js";
import { EmailUploader } from "../graph/index.js";
import { getDefaultSenderEmail } from "../mailer/index.js";
import { DraftUploader, EmailString } from "../util/index.js";
import { InlineImagesSpec, loadInlineImageJSON } from "../util/inline-images.js";
import { StorageBackend, MergeResultWithMetadata, PostSendActionMode } from "./storage/index.js";

interface UploadDraftsOptions {
    /** Time to sleep between sending emails to prevent hitting rate limits */
    sleepBetween?: number;
    /** Only upload this many emails (i.e. the first X emails) */
    onlySend?: number;
    /** Path to JSON file conforming to a {@link InlineImagesSpec} with files to attach for use as inline images. */
    inlineImages?: string;
    /** OAuth provider to upload drafts with. Defaults to "microsoft" (Outlook via Microsoft Graph). */
    provider?: "microsoft" | "google";
    /**
     * Path to the Google OAuth client credentials JSON, used when `provider` is "google".
     * Defaults to `process.env.DOCSOC_GOOGLE_CREDENTIALS_FILE`.
     */
    googleCredentialsFile?: string;
}

/**
 * Upload mail merge results to the Drafts folder of an inbox via OAuth.
 *
 * The provider is chosen via `options.provider`: "microsoft" (default) uploads to Outlook via the
 * Microsoft Graph API, "google" uploads to Gmail via the Gmail API.
 *
 * NOTE: This function will prompt the user before sending emails, unless `disablePrompt` is set to true. SO make sure it is set to true if you want to do a fully headless send.
 *
 * NOTE: THis will initiate an interactive OAuth2 flow to authenticate with the chosen provider. This will open a browser to be opened.
 * @param storageBackend Storage backend to get mail merge results from
 * @param enginesMap Map of engine names to engine constructors, as we need to ask the engine what the HTML is to send from the result
 * @param disablePrompt If true, will not prompt the user before uploading emails. Defaults to false (will prompt)
 * @param options Upload options, including `provider` and provider-specific credentials (see {@link UploadDraftsOptions})
 * @param entraTenantId The tenant ID for the Microsoft Graph API to authenticate with (taken from process.env.DOCSOC_MS_ENTRA_TENANT_ID). Only used for the "microsoft" provider.
 * @param entraClientId The client ID for the Microsoft Graph API to authenticate with (taken from process.env.DOCSOC_MS_ENTRA_CLIENT_ID). Only used for the "microsoft" provider.
 * @param expectedEmail The sender address the signed-in account must match; if it does not, nothing is uploaded. Defaults to `DOCSOC_SENDER_EMAIL` (see {@link getDefaultSenderEmail}).
 * @param logger Logger to use for logging
 */
export async function uploadDrafts(
    storageBackend: StorageBackend,
    enginesMap: Record<string, TemplateEngineConstructor> = ENGINES_MAP,
    disablePrompt = false,
    options: UploadDraftsOptions = {
        sleepBetween: 0,
    },
    entraTenantId = process.env["DOCSOC_MS_ENTRA_TENANT_ID"],
    entraClientId = process.env["DOCSOC_MS_ENTRA_CLIENT_ID"],
    expectedEmail = getDefaultSenderEmail(),
    logger = createLogger("docsoc"),
) {
    const {
        sleepBetween = 0,
        onlySend,
        provider = "microsoft",
        googleCredentialsFile = process.env["DOCSOC_GOOGLE_CREDENTIALS_FILE"],
    } = options;

    if (onlySend === 0) {
        logger.warn(`onlySend is set to 0, so no emails will be sent.`);
        return;
    }

    logger.info(`Uploading previews to drafts...`);
    // 1: Load data
    logger.info("Loading merge results...");
    const results = storageBackend.loadMergeResults();

    let inlineImages: InlineImagesSpec = [];
    if (options.inlineImages) {
        logger.info("Loading inline images...");
        inlineImages = await loadInlineImageJSON(options.inlineImages, logger);
    }

    // For each sidecar, send the previews
    const pendingEmails: {
        to: EmailString[];
        subject: string;
        html: string;
        attachments: string[];
        cc: EmailString[];
        bcc: EmailString[];
        originalResult: MergeResultWithMetadata;
    }[] = [];
    for await (const result of results) {
        const { engineInfo, previews, email, attachmentPaths } = result;

        const EngineClass = enginesMap[engineInfo.name];
        if (!EngineClass) {
            logger.error(`Invalid template engine: ${engineInfo.name}`);
            logger.warn(`Skipping record addressed to ${email.to} as the engine is invalid!`);
            continue;
        }

        // Load in the engine
        const engine = new EngineClass(engineInfo.options);
        logger.debug(`Loading engine ${engineInfo.name}...`);
        await engine.loadTemplate();

        // Get data to send
        const html = await engine.getHTMLToSend(previews, result.record);

        // Add to pending emails
        pendingEmails.push({
            to: email.to,
            subject: email.subject,
            html,
            attachments: attachmentPaths,
            cc: email.cc,
            bcc: email.bcc,
            originalResult: result,
        });
    }

    // Print the warning
    console.log(
        chalk.yellow(`⚠️   --- WARNING --- ⚠️
    You are about to upload ${pendingEmails.length} emails.
    This action is IRREVERSIBLE.

    Check that:
    1. The template was correct
    1. You are satisfied with ALL previews, including the HTML previews
    3. You have tested the system beforehand
    4. All indications this is a test have been removed

    You are about to upload ${pendingEmails.length} emails. The estimated time for this is ${
            ((5 + sleepBetween) * pendingEmails.length) / 60 / 60
        } hours.

    If you are happy to proceed, please type "Yes, upload emails" below.`),
    );

    if (!disablePrompt) {
        const input = readlineSync.question("");
        if (input !== "Yes, upload emails") {
            process.exit(0);
        }
    }

    // Send the emails
    logger.info("Uploading emails...");
    if (sleepBetween > 0) {
        logger.warn(`Sleeping for ${sleepBetween} seconds between uploads.`);
    }
    const total = pendingEmails.length;
    let sent = 0;
    let uploader: DraftUploader;
    if (provider === "google") {
        const gmailUploader = new GmailDraftUploader(logger);
        await gmailUploader.authenticate(expectedEmail, googleCredentialsFile);
        uploader = gmailUploader;
    } else {
        const graphUploader = new EmailUploader(logger);
        await graphUploader.authenticate(expectedEmail, entraTenantId, entraClientId);
        uploader = graphUploader;
    }
    for (const { to, subject, html, attachments, cc, bcc, originalResult } of pendingEmails) {
        logger.info(
            `(${++sent} / ${total}) Uploading email to ${to} with subject ${subject} to Drafts...`,
        );

        const options = {
            enableOutlookParagraphSpacingHack: true,
        };

        await uploader.uploadEmail(
            to,
            subject,
            html,
            [...attachments, ...inlineImages],
            {
                cc,
                bcc,
            },
            options,
        );

        // Execute post-send action
        if (storageBackend.postSendAction) {
            logger.debug("Calling post-send hook...");
            await storageBackend.postSendAction(originalResult, PostSendActionMode.DRAFTS_UPLOAD);
        }

        // Only send check
        if (onlySend && sent >= onlySend) {
            logger.warn(`Only sending ${onlySend} emails as requested.`);
            break;
        }

        if (sleepBetween > 0) {
            logger.warn(`Sleeping for ${sleepBetween} seconds to prevent hitting rate limits...`);
            await new Promise((resolve) => setTimeout(resolve, sleepBetween * 1000));
        }
    }
}
