/**
 * Default mailer functions for DoCSoc mail merge.
 * @packageDocumentation
 */
import Mail from "nodemailer/lib/mailer";

import { EmailString } from "../util/types.js";
import Mailer from "./mailer.js";
import OAuthMailer from "./oauthMailer.js";
import type { Mailer as MailerInterface } from "./types.js";

/**
 * Default mailer that uses the env vars `DOCSOC_SMTP_SERVER`, `DOCSOC_SMTP_USERNAME`, `DOCSOC_SMTP_PASSWORD` to create a mailer.
 */
export const getDefaultMailer = () =>
    new Mailer(
        process.env["DOCSOC_SMTP_SERVER"] ?? "smtp-mail.outlook.com",
        process.env["DOCSOC_SMTP_PORT"] && isFinite(parseInt(process.env["DOCSOC_SMTP_PORT"]))
            ? parseInt(process.env["DOCSOC_SMTP_PORT"])
            : 587,
        process.env["DOCSOC_OUTLOOK_USERNAME"] ?? "docsoc@ic.ac.uk",
        process.env["DOCSOC_OUTLOOK_PASSWORD"] ?? "password",
    );

/**
 * Default OAuth SMTP mailer that uses:
 * - `DOCSOC_SMTP_SERVER`
 * - `DOCSOC_SMTP_PORT`
 * - `DOCSOC_OUTLOOK_USERNAME`
 * - `MS_ENTRA_TENANT_ID`
 * - `MS_ENTRA_CLIENT_ID`
 */
export const getDefaultOAuthMailer = () => {
    const tenantId = process.env["MS_ENTRA_TENANT_ID"];
    const clientId = process.env["MS_ENTRA_CLIENT_ID"];

    if (!tenantId) {
        throw new Error("MS_ENTRA_TENANT_ID is required for OAuth SMTP mailer.");
    }
    if (!clientId) {
        throw new Error("MS_ENTRA_CLIENT_ID is required for OAuth SMTP mailer.");
    }

    return new OAuthMailer(
        process.env["DOCSOC_SMTP_SERVER"] ?? "smtp-mail.outlook.com",
        process.env["DOCSOC_SMTP_PORT"] && isFinite(parseInt(process.env["DOCSOC_SMTP_PORT"]))
            ? parseInt(process.env["DOCSOC_SMTP_PORT"])
            : 587,
        process.env["DOCSOC_OUTLOOK_USERNAME"] ?? "docsoc@ic.ac.uk",
        tenantId,
        clientId,
    );
};

/**
 * Get the default RFC5322 from line for DoCSoc emails, using the env vars `DOCSOC_SENDER_NAME` and `DOCSOC_SENDER_EMAIL`.
 *
 * If these are not set, it defaults to "DoCSoc" and "docsoc@ic.ac.uk", giving `"DoCSoc" <docsoc@ic.ac.uk>`
 */
export const getDefaultDoCSocFromLine = () =>
    Mailer.makeFromLineFromEmail(
        process.env["DOCSOC_SENDER_NAME"] ?? "DoCSoc",
        Mailer.validateEmail(process.env["DOCSOC_SENDER_EMAIL"])
            ? process.env["DOCSOC_SENDER_EMAIL"] ?? "docsoc@ic.ac.uk"
            : "docsoc@ic.ac.uk",
    );

/**
 * The default mailer function for DoCSoc mail merge: sends an email to a list of recipients using the appriopritate env vars to populate fields.
 *
 * Specifcally, this wraps {@link Mailer.sendMail} with the default from line {@link getDefaultDoCSocFromLine}, and the default mailer.
 *
 * Pass it an instance of a Mailer from {@link getDefaultMailer} to use the default mailer.
 *
 * @example
 * defaultMailer(["example@example.com"], "Subject","<h1>Hello</h1>", getDefaultMailer(), [], { cc: [], bcc: [] });
 */
export const defaultMailer = (
    to: EmailString[],
    subject: string,
    html: string,
    mailer: MailerInterface,
    attachments: Mail.Options["attachments"] = [],
    additionalInfo: { cc: EmailString[]; bcc: EmailString[] } = { cc: [], bcc: [] },
): Promise<void> =>
    mailer.sendMail(getDefaultDoCSocFromLine(), to, subject, html, attachments, additionalInfo);
