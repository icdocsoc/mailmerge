import Mail from "nodemailer/lib/mailer";

import { EmailString, FromEmail } from "../util/types.js";

/**
 * Interface for sending emails via SMTP.
 */
export interface Mailer {
    sendMail(
        from: FromEmail,
        to: string[],
        subject: string,
        html: string,
        attachments?: Mail.Options["attachments"],
        additionalInfo?: { cc: EmailString[]; bcc: EmailString[] },
        text?: string,
    ): Promise<void>;
}
