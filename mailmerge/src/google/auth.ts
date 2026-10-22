/**
 * Shared helpers for authenticating with Google via OAuth.
 *
 * Uses `@google-cloud/local-auth`, whose `authenticate()` opens a browser and spins up a local
 * loopback server to catch the OAuth redirect (the equivalent of the "spot server" that
 * `@azure/identity`'s `InteractiveBrowserCredential` provides for Microsoft).
 */
import { createLogger } from "@docsoc/util";
import type { OAuth2Client } from "google-auth-library";

/**
 * The authenticated OAuth2 client returned by `@google-cloud/local-auth`.
 */
export type GoogleAuthClient = OAuth2Client;

/**
 * Scopes requested when authenticating with Google.
 *
 * - `https://mail.google.com/` is REQUIRED for SMTP XOAUTH2 (the narrower `gmail.send` scope is
 *   rejected by SMTP AUTH); it also covers creating drafts via the Gmail API.
 * - `userinfo.email` lets us read back the signed-in account's email for the sender safety catch.
 */
export const GOOGLE_SCOPES = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Authenticate with Google using a downloaded OAuth client keyfile.
 *
 * NOTE: This will open a browser window and run a local loopback server to complete the OAuth flow.
 *
 * @param keyfilePath Path to the OAuth client credentials JSON (a "Desktop app" client) downloaded
 * from the Google Cloud console.
 */
export async function authenticateGoogle(keyfilePath: string): Promise<GoogleAuthClient> {
    // Lazily imported: @google-cloud/local-auth pulls in the ESM-only `open` package, which should
    // only be loaded when we actually authenticate (not on module load / CLI startup).
    const { authenticate } = await import("@google-cloud/local-auth");
    return authenticate({ keyfilePath, scopes: GOOGLE_SCOPES });
}

/**
 * Get the email address of the account signed in to via OAuth.
 *
 * Relies on the `userinfo.email` scope being granted (see {@link GOOGLE_SCOPES}).
 */
export async function getAuthenticatedEmail(client: GoogleAuthClient): Promise<string> {
    const { token } = await client.getAccessToken();
    if (!token) {
        throw new Error("Failed to acquire Google OAuth access token.");
    }

    const tokenInfo = await client.getTokenInfo(token);
    if (!tokenInfo.email) {
        throw new Error(
            "Could not determine the signed-in Google account email - the userinfo.email scope may be missing.",
        );
    }

    return tokenInfo.email;
}

/**
 * Safety catch: verify the account signed in to via OAuth is the account we are sending from
 * (i.e. `DOCSOC_SENDER_EMAIL`).
 *
 * This prevents accidentally sending from the wrong mailbox if a user signs in with a different
 * Google account than the one configured as the sender. Gmail can only send/draft as the
 * authenticated identity anyway, so this also surfaces that error early and clearly.
 *
 * @throws if the signed-in account does not match the expected sender email.
 */
export async function verifyGoogleAccount(
    client: GoogleAuthClient,
    expectedEmail: string,
    logger = createLogger("docsoc.google.auth"),
): Promise<void> {
    const authedEmail = await getAuthenticatedEmail(client);

    if (authedEmail.toLowerCase() !== expectedEmail.toLowerCase()) {
        const message =
            `OAuth signed-in account "${authedEmail}" does not match the configured ` +
            `sender email "${expectedEmail}" (DOCSOC_SENDER_EMAIL). Sign in with the sender ` +
            `account, or update DOCSOC_SENDER_EMAIL to match the account you signed in with.`;
        logger.error(message);
        throw new Error(message);
    }
}
