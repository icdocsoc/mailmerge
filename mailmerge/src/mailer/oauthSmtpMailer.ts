import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { EmailString, FromEmail } from "../util/types.js";
import type { Mailer as MailerInterface } from "./types.js";

/**
 * Base class for SMTP mailers that authenticate via OAuth (XOAUTH2).
 *
 * The actual send path (building an XOAUTH2 nodemailer transport and sending) is identical across
 * providers; subclasses only supply {@link getAccessToken}, which is responsible for authenticating,
 * verifying the signed-in account, and returning a valid access token.
 */
export default abstract class OAuthSmtpMailer implements MailerInterface {
    constructor(
        protected smtpHost: string,
        protected smtpPort: number,
        protected username: string,
    ) {}

    /**
     * Acquire a valid OAuth2 access token for SMTP XOAUTH2 authentication.
     *
     * Implementations are responsible for performing (and caching) the interactive OAuth flow and
     * for verifying the signed-in account matches the configured sender.
     */
    protected abstract getAccessToken(): Promise<string>;

    async sendMail(
        from: FromEmail,
        to: string[],
        subject: string,
        html: string,
        attachments: Mail.Options["attachments"] = [],
        additionalInfo: { cc: EmailString[]; bcc: EmailString[] } = { cc: [], bcc: [] },
        text: string = convert(html),
    ): Promise<void> {
        const accessToken = await this.getAccessToken();

        const transporter = nodemailer.createTransport({
            host: this.smtpHost,
            port: this.smtpPort,
            secure: false,
            auth: {
                type: "OAuth2",
                user: this.username,
                accessToken,
            },
        });

        await transporter.sendMail({
            from,
            to,
            subject,
            text,
            html,
            attachments,
            cc: additionalInfo.cc,
            bcc: additionalInfo.bcc,
        });
    }
}
