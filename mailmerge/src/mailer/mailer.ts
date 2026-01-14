/**
 * Contains the `Mailer` class, which is a core abstraction for sending emails.
 */
import { validate } from "email-validator";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { EmailString, FromEmail } from "../util/types.js";

/**
 * Core abstraction for sending emails: make a instance of this class, and call `sendMail` to send an email.
 *
 * @param host SMTP server host, e.g. 'smtp-mail.outlook.com'
 * @param port SMTP server port, e.g. 587 (assumed to use TLS)
 * @param username SMTP server username (usually your microsoft 365 email)
 * @param password SMTP server password (usually your microsoft 365 password)
 */
export default class Mailer {
    constructor(
        private smtpHost: string,
        private smtpPort: number,
        private username: string,
        private password: string,
    ) {
        this.transporter = nodemailer.createTransport({
            host: this.smtpHost,
            port: this.smtpPort,
            secure: false, // Use `true` for port 465, `false` for all other ports
            auth: {
                user: this.username,
                pass: this.password,
            },
        });
    }

    private transporter: ReturnType<typeof nodemailer.createTransport>;

    async sendMail(
        from: FromEmail,
        to: string[],
        subject: string,
        html: string,
        attachments: Mail.Options["attachments"] = [],
        additionalInfo: { cc: EmailString[]; bcc: EmailString[] } = { cc: [], bcc: [] },
        text: string = convert(html),
    ): Promise<void> {
        await this.transporter.sendMail({
            from, // sender address
            to, // list of receivers
            subject, // Subject line
            text: text, // plain text body
            html: html, // html body
            attachments,
            cc: additionalInfo.cc,
            bcc: additionalInfo.bcc,
        });
    }

    /** Helper function to check an email is a valid email address (and also tells the TS compiler we have a valid EmailString)  */
    static validateEmail(email?: string): email is EmailString {
        if (!email) return false;
        return validate(email);
    }

    /**
     * Create a FromEmail string from a name and email address (i.e. `"Name" <email@server.com>`)
     */
    static makeFromLineFromEmail(name: string, email: EmailString): FromEmail {
        return `"${name}" <${email}>`;
    }
}
