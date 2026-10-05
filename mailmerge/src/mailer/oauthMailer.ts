import { InteractiveBrowserCredential } from "@azure/identity";
import { createLogger } from "@docsoc/util";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { EmailString, FromEmail } from "../util/types.js";
import type { Mailer as MailerInterface } from "./types.js";

const SMTP_OAUTH_SCOPE = "https://outlook.office.com/SMTP.Send";

const logger = createLogger("docsoc.mailer.oauth");

/**
 * SMTP mailer that authenticates via Microsoft OAuth (XOAUTH2).
 */
export default class OAuthMailer implements MailerInterface {
    private credential: InteractiveBrowserCredential;
    private cachedAccessToken?: {
        token: string;
        expiresOnTimestamp: number;
    };
    private identityVerified = false;

    constructor(
        private smtpHost: string,
        private smtpPort: number,
        private username: string,
        private senderEmail: string,
        tenantId: string,
        clientId: string,
    ) {
        this.credential = new InteractiveBrowserCredential({
            tenantId,
            clientId,
            redirectUri: "http://localhost",
        });
    }

    /**
     * Safety catch: verify the account the user signed in to via OAuth is the same account we are
     * sending from (i.e. `DOCSOC_SENDER_EMAIL`).
     *
     * This prevents accidentally sending email from the wrong mailbox if a user signs in with a
     * different Microsoft account than the one configured as the sender.
     *
     * @throws if the signed-in account does not match the configured sender email.
     */
    private async verifyAuthenticatedAccount(): Promise<void> {
        const authRecord = await this.credential.authenticate([SMTP_OAUTH_SCOPE]);
        if (!authRecord) {
            throw new Error("Failed to authenticate with Microsoft OAuth for SMTP.Send.");
        }

        if (authRecord.username.toLowerCase() !== this.senderEmail.toLowerCase()) {
            const message =
                `OAuth signed-in account "${authRecord.username}" does not match the configured ` +
                `sender email "${this.senderEmail}" (DOCSOC_SENDER_EMAIL). Sign in with the sender ` +
                `account, or update DOCSOC_SENDER_EMAIL to match the account you signed in with.`;
            logger.error(message);
            throw new Error(message);
        }

        this.identityVerified = true;
    }

    private async getAccessToken(): Promise<string> {
        const now = Date.now();
        const refreshSkewMs = 60 * 1000;

        if (
            this.cachedAccessToken &&
            this.cachedAccessToken.expiresOnTimestamp > now + refreshSkewMs
        ) {
            return this.cachedAccessToken.token;
        }

        if (!this.identityVerified) {
            await this.verifyAuthenticatedAccount();
        }

        const token = await this.credential.getToken([SMTP_OAUTH_SCOPE]);
        if (!token) {
            throw new Error("Failed to acquire OAuth access token for SMTP.Send.");
        }

        this.cachedAccessToken = {
            token: token.token,
            expiresOnTimestamp: token.expiresOnTimestamp,
        };

        return token.token;
    }

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
