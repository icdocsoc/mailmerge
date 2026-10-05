/**
 * Default mailer functions for DoCSoc mail merge.
 * @packageDocumentation
 */
import Mail from "nodemailer/lib/mailer";

import { EmailString } from "../util/types.js";
import GmailOAuthMailer from "./gmailOAuthMailer.js";
import Mailer from "./mailer.js";
import OAuthMailer from "./oauthMailer.js";
import type { Mailer as MailerInterface } from "./types.js";

/** The fallback sender/mailbox address used when the relevant env var is unset or invalid. */
export const DEFAULT_DOCSOC_EMAIL = "docsoc@ic.ac.uk";

/**
 * Resolve the default SMTP host for Outlook/Microsoft from `DOCSOC_SMTP_SERVER`,
 * falling back to `smtp-mail.outlook.com`.
 */
export const getDefaultSmtpHost = (): string =>
    process.env["DOCSOC_SMTP_SERVER"] ?? "smtp-mail.outlook.com";

/**
 * Resolve the SMTP port from `DOCSOC_SMTP_PORT`, falling back to 587 when unset or non-numeric.
 */
export const getDefaultSmtpPort = (): number =>
    process.env["DOCSOC_SMTP_PORT"] && isFinite(parseInt(process.env["DOCSOC_SMTP_PORT"]))
        ? parseInt(process.env["DOCSOC_SMTP_PORT"])
        : 587;

/**
 * Resolve the sender email address from `DOCSOC_SENDER_EMAIL`, falling back to
 * {@link DEFAULT_DOCSOC_EMAIL} when unset or invalid.
 *
 * This is the address emails are sent from, and the account OAuth mailers verify the signed-in
 * user against.
 */
export const getDefaultSenderEmail = (): EmailString =>
    Mailer.validateEmail(process.env["DOCSOC_SENDER_EMAIL"])
        ? process.env["DOCSOC_SENDER_EMAIL"]
        : DEFAULT_DOCSOC_EMAIL;

/**
 * Default mailer that uses the env vars `DOCSOC_SMTP_SERVER`, `DOCSOC_SMTP_USERNAME`, `DOCSOC_SMTP_PASSWORD` to create a mailer.
 */
export const getDefaultMailer = () =>
    new Mailer(
        getDefaultSmtpHost(),
        getDefaultSmtpPort(),
        process.env["DOCSOC_OUTLOOK_USERNAME"] ?? DEFAULT_DOCSOC_EMAIL,
        process.env["DOCSOC_OUTLOOK_PASSWORD"] ?? "password",
    );

/**
 * Default OAuth SMTP mailer that uses:
 * - `DOCSOC_SMTP_SERVER`
 * - `DOCSOC_SMTP_PORT`
 * - `DOCSOC_OUTLOOK_USERNAME`
 * - `DOCSOC_SENDER_EMAIL`
 * - `DOCSOC_MS_ENTRA_TENANT_ID`
 * - `DOCSOC_MS_ENTRA_CLIENT_ID`
 *
 * As a safety catch, the mailer verifies that the account signed in to via OAuth matches
 * `DOCSOC_SENDER_EMAIL` (the address emails are sent from), throwing if they differ.
 */
export const getDefaultOAuthMailer = () => {
    const tenantId = process.env["DOCSOC_MS_ENTRA_TENANT_ID"];
    const clientId = process.env["DOCSOC_MS_ENTRA_CLIENT_ID"];

    if (!tenantId) {
        throw new Error("DOCSOC_MS_ENTRA_TENANT_ID is required for OAuth SMTP mailer.");
    }
    if (!clientId) {
        throw new Error("DOCSOC_MS_ENTRA_CLIENT_ID is required for OAuth SMTP mailer.");
    }

    return new OAuthMailer(
        getDefaultSmtpHost(),
        getDefaultSmtpPort(),
        process.env["DOCSOC_OUTLOOK_USERNAME"] ?? DEFAULT_DOCSOC_EMAIL,
        getDefaultSenderEmail(),
        tenantId,
        clientId,
    );
};

/**
 * Default Gmail OAuth SMTP mailer that uses:
 * - `DOCSOC_SMTP_PORT` (defaults to 587)
 * - `DOCSOC_SENDER_EMAIL` (also used as the SMTP username, as Gmail sends as the authenticated account)
 * - `DOCSOC_GOOGLE_CREDENTIALS_FILE` (path to the downloaded Google OAuth client credentials JSON)
 *
 * The SMTP host is always `smtp.gmail.com`.
 *
 * As a safety catch, the mailer verifies that the Google account signed in to via OAuth matches
 * `DOCSOC_SENDER_EMAIL` (the address emails are sent from), throwing if they differ.
 */
export const getDefaultGmailOAuthMailer = () => {
    const credentialsFile = process.env["DOCSOC_GOOGLE_CREDENTIALS_FILE"];

    if (!credentialsFile) {
        throw new Error("DOCSOC_GOOGLE_CREDENTIALS_FILE is required for Gmail OAuth mailer.");
    }

    const senderEmail = getDefaultSenderEmail();

    return new GmailOAuthMailer(
        "smtp.gmail.com",
        getDefaultSmtpPort(),
        senderEmail,
        senderEmail,
        credentialsFile,
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
        getDefaultSenderEmail(),
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
