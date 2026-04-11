import { InteractiveBrowserCredential } from "@azure/identity";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { EmailString, FromEmail } from "../util/types.js";
import type { Mailer as MailerInterface } from "./types.js";

const SMTP_OAUTH_SCOPE = "https://outlook.office.com/SMTP.Send";

/**
 * SMTP mailer that authenticates via Microsoft OAuth (XOAUTH2).
 */
export default class OAuthMailer implements MailerInterface {
    private credential: InteractiveBrowserCredential;
    private cachedAccessToken?: {
        token: string;
        expiresOnTimestamp: number;
    };

    constructor(
        private smtpHost: string,
        private smtpPort: number,
        private username: string,
        tenantId: string,
        clientId: string,
    ) {
        this.credential = new InteractiveBrowserCredential({
            tenantId,
            clientId,
            redirectUri: "http://localhost",
        });
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
