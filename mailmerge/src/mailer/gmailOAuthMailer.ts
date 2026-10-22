import { createLogger } from "@docsoc/util";

import { authenticateGoogle, verifyGoogleAccount, type GoogleAuthClient } from "../google/auth.js";
import OAuthSmtpMailer from "./oauthSmtpMailer.js";

const logger = createLogger("docsoc.mailer.gmail-oauth");

/**
 * SMTP mailer that authenticates with Gmail via Google OAuth (XOAUTH2).
 *
 * NOTE: On first send this will open a browser window and run a local loopback server to complete
 * the OAuth flow (see {@link authenticateGoogle}).
 */
export default class GmailOAuthMailer extends OAuthSmtpMailer {
    private client?: GoogleAuthClient;

    constructor(
        smtpHost: string,
        smtpPort: number,
        username: string,
        private senderEmail: string,
        private keyfilePath: string,
    ) {
        super(smtpHost, smtpPort, username);
    }

    protected async getAccessToken(): Promise<string> {
        // Authenticate (opening the browser) and verify the account only once; the OAuth2 client
        // refreshes the access token itself on subsequent calls.
        if (!this.client) {
            const client = await authenticateGoogle(this.keyfilePath);
            await verifyGoogleAccount(client, this.senderEmail, logger);
            this.client = client;
        }

        const { token } = await this.client.getAccessToken();
        if (!token) {
            throw new Error("Failed to acquire Google OAuth access token for SMTP.");
        }

        return token;
    }
}
