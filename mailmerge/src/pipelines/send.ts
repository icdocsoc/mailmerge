import { createLogger } from "@docsoc/util";
import chalk from "chalk";
// Load dotenv
import "dotenv/config";
import readlineSync from "readline-sync";

import { ENGINES_MAP } from "../engines/index.js";
import { TemplateEngineConstructor } from "../engines/types.js";
import Mailer from "../mailer/mailer.js";
import { InlineImagesSpec, loadInlineImageJSON } from "../util/inline-images.js";
import { EmailString, FromEmail } from "../util/types.js";
import { StorageBackend, MergeResultWithMetadata, PostSendActionMode } from "./storage/types.js";

interface SendEmailsOptions {
    /** Time to sleep between sending emails to prevent hitting rate limits */
    sleepBetween?: number;
    /** Only send this many emails (i.e. the first X emails) */
    onlySend?: number;
    /** Send the top {@link onlySend} emails to this email as a test */
    testSendTo?: EmailString;
    /** Path to JSON file conforming to a {@link InlineImagesSpec} with files to attach for use as inline images. */
    inlineImages?: string;
}

const DEFAULT_SLEEP_BETWEEN = 0;

/**
 * Generic way to send emails, given a storage backend to get mail merge results from to send and a mailer to send them with.
 *
 * NOTE: This function will prompt the user before sending emails, unless `disablePrompt` is set to true. SO make sure it is set to true if you want to do a fully headless send.
 * @param storageBackend Storage backend to get mail merge results from
 * @param mailer Mailer to send emails with
 * @param fromAddress From address to send emails from (note the format - RFC5322. E.g. `"DoCSoc" <docsoc@ic.ac.uk>`)
 * @param enginesMap Map of engine names to engine constructors, as we need to ask the engine what the HTML is to send from the result
 * @param disablePrompt If true, will not prompt the user before sending emails. Defaults to false (will prompt)
 * @param logger Logger to use for logging
 * @param options Other options
 */
export async function sendEmails(
    storageBackend: StorageBackend,
    mailer: Mailer,
    fromAddress: FromEmail,
    enginesMap: Record<string, TemplateEngineConstructor> = ENGINES_MAP,
    disablePrompt = false,
    options: SendEmailsOptions = {
        sleepBetween: DEFAULT_SLEEP_BETWEEN,
    },
    logger = createLogger("docsoc"),
) {
    logger.info(`Sending mail merge results...`);

    if (options?.onlySend === 0) {
        logger.warn(`onlySend is set to 0, so no emails will be sent.`);
        return;
    }

    // 0: Check inline images
    let inlineImages: InlineImagesSpec = [];
    if (options.inlineImages) {
        logger.info("Loading inline images...");
        inlineImages = await loadInlineImageJSON(options.inlineImages, logger);
    }

    // 1: Load data
    logger.info("Loading merge results...");
    const results = storageBackend.loadMergeResults();

    if (options.testSendTo) {
        logger.warn("");
        logger.warn("=======================");
        logger.warn("TEST MODE ACTIVATED.");
        logger.warn("=======================");
        if (!options.onlySend) {
            logger.error("You must set onlySend to a number to use test mode.");
            throw new Error("You must set onlySend to a number to use test mode.");
        }
        logger.warn("");
        logger.warn(`Will send ${options.onlySend} emails to ${options.testSendTo} as a test.`);
        logger.warn("Note that post send hooks will not be called in test mode.");
        logger.warn("");
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
            to: options.testSendTo ? [options.testSendTo] : email.to,
            subject: options.testSendTo ? "(TEST) " + email.subject : email.subject,
            html,
            attachments: attachmentPaths,
            cc: options.testSendTo ? [] : email.cc,
            bcc: options.testSendTo ? [] : email.bcc,
            originalResult: result,
        });
    }

    // Print the warning

    const emailsNumberDisplay = Math.min(
        pendingEmails.length,
        options.onlySend ?? Number.MAX_SAFE_INTEGER,
    );

    console.log(
        chalk.yellow(`⚠️   --- WARNING --- ⚠️
You are about to send ${emailsNumberDisplay} emails.
This action is IRREVERSIBLE.
                
If the system crashes, restarting will NOT necessarily send already-sent emails again.

Check that:
1. The template was correct
1. You are satisfied with ALL previews, including the HTML previews
3. You have tested the system beforehand
4. All indications this is a test have been removed

You are about to send ${emailsNumberDisplay} emails. The estimated time for this is ${
            ((3 + (options.sleepBetween ?? DEFAULT_SLEEP_BETWEEN)) * emailsNumberDisplay) / 60 / 60
        } hours.

    If you are happy to proceed, please type "Yes, send emails" below.`),
    );
    if (!disablePrompt) {
        const input = readlineSync.question("");
        if (input !== "Yes, send emails") {
            throw new Error("User did not confirm sending emails!");
        }
    }

    // Send the emails
    logger.info("Sending emails...");
    const total = emailsNumberDisplay;
    let sent = 0;
    for (const { to, subject, html, attachments, cc, bcc, originalResult } of pendingEmails) {
        logger.info(`(${++sent} / ${total}) Sending email to ${to} with subject ${subject}...`);
        if (options.testSendTo && to[0] !== options.testSendTo) {
            throw new Error(
                "Test mode is on, but the email is not the test email! This is a bug in the code, crashing to prevent sending emails to the wrong person.",
            );
        }
        await mailer.sendMail(
            fromAddress,
            to,
            subject,
            html,
            [
                ...attachments.map((file) => ({
                    path: file,
                })),
                ...inlineImages,
            ],
            {
                cc,
                bcc,
            },
        );

        if (storageBackend.postSendAction && !options.testSendTo) {
            logger.debug("Calling post-send hook...");
            await storageBackend.postSendAction(originalResult, PostSendActionMode.SMTP_SEND);
        }

        logger.info("Email sent!");

        // Stop if we're only sending a certain number of emails
        if (options.onlySend && sent >= options.onlySend) {
            logger.info(`Only sending ${options.onlySend} emails - stopping.`);
            break;
        }

        if (!options.sleepBetween) {
            options.sleepBetween = DEFAULT_SLEEP_BETWEEN;
        }

        if (options.sleepBetween > 0) {
            logger.info(`Sleeping for ${options.sleepBetween}s before the next email...`);
            await new Promise((resolve) =>
                setTimeout(resolve, (options.sleepBetween ?? DEFAULT_SLEEP_BETWEEN) * 1000),
            );
        }
    }
}
