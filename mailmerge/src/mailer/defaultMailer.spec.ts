import { getDefaultGmailOAuthMailer, getDefaultOAuthMailer } from "./defaultMailer";
import GmailOAuthMailer from "./gmailOAuthMailer";
import OAuthMailer from "./oauthMailer";

jest.mock("./oauthMailer");
jest.mock("./gmailOAuthMailer");

describe("getDefaultOAuthMailer", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        // Start from a clean copy of the environment for each test.
        process.env = { ...OLD_ENV };
        delete process.env["DOCSOC_SMTP_SERVER"];
        delete process.env["DOCSOC_SMTP_PORT"];
        delete process.env["DOCSOC_OUTLOOK_USERNAME"];
        delete process.env["DOCSOC_SENDER_EMAIL"];
        delete process.env["DOCSOC_MS_ENTRA_TENANT_ID"];
        delete process.env["DOCSOC_MS_ENTRA_CLIENT_ID"];
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("constructs an OAuthMailer from the DOCSOC_MS_ENTRA_ env vars", () => {
        process.env["DOCSOC_SMTP_SERVER"] = "smtp.example.com";
        process.env["DOCSOC_SMTP_PORT"] = "2525";
        process.env["DOCSOC_OUTLOOK_USERNAME"] = "user@example.com";
        process.env["DOCSOC_SENDER_EMAIL"] = "sender@example.com";
        process.env["DOCSOC_MS_ENTRA_TENANT_ID"] = "tenant-id";
        process.env["DOCSOC_MS_ENTRA_CLIENT_ID"] = "client-id";

        getDefaultOAuthMailer();

        expect(OAuthMailer).toHaveBeenCalledWith(
            "smtp.example.com",
            2525,
            "user@example.com",
            "sender@example.com",
            "tenant-id",
            "client-id",
        );
    });

    it("falls back to sensible defaults for server, port, username and sender email", () => {
        process.env["DOCSOC_MS_ENTRA_TENANT_ID"] = "tenant-id";
        process.env["DOCSOC_MS_ENTRA_CLIENT_ID"] = "client-id";

        getDefaultOAuthMailer();

        expect(OAuthMailer).toHaveBeenCalledWith(
            "smtp-mail.outlook.com",
            587,
            "docsoc@ic.ac.uk",
            "docsoc@ic.ac.uk",
            "tenant-id",
            "client-id",
        );
    });

    it("falls back to the default sender email when DOCSOC_SENDER_EMAIL is invalid", () => {
        process.env["DOCSOC_SENDER_EMAIL"] = "not-an-email";
        process.env["DOCSOC_MS_ENTRA_TENANT_ID"] = "tenant-id";
        process.env["DOCSOC_MS_ENTRA_CLIENT_ID"] = "client-id";

        getDefaultOAuthMailer();

        expect(OAuthMailer).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            expect.anything(),
            "docsoc@ic.ac.uk",
            "tenant-id",
            "client-id",
        );
    });

    it("falls back to port 587 when DOCSOC_SMTP_PORT is not a number", () => {
        process.env["DOCSOC_SMTP_PORT"] = "not-a-number";
        process.env["DOCSOC_MS_ENTRA_TENANT_ID"] = "tenant-id";
        process.env["DOCSOC_MS_ENTRA_CLIENT_ID"] = "client-id";

        getDefaultOAuthMailer();

        expect(OAuthMailer).toHaveBeenCalledWith(
            expect.anything(),
            587,
            expect.anything(),
            expect.anything(),
            "tenant-id",
            "client-id",
        );
    });

    it("throws if DOCSOC_MS_ENTRA_TENANT_ID is missing", () => {
        process.env["DOCSOC_MS_ENTRA_CLIENT_ID"] = "client-id";

        expect(() => getDefaultOAuthMailer()).toThrow(
            "DOCSOC_MS_ENTRA_TENANT_ID is required for OAuth SMTP mailer.",
        );
        expect(OAuthMailer).not.toHaveBeenCalled();
    });

    it("throws if DOCSOC_MS_ENTRA_CLIENT_ID is missing", () => {
        process.env["DOCSOC_MS_ENTRA_TENANT_ID"] = "tenant-id";

        expect(() => getDefaultOAuthMailer()).toThrow(
            "DOCSOC_MS_ENTRA_CLIENT_ID is required for OAuth SMTP mailer.",
        );
        expect(OAuthMailer).not.toHaveBeenCalled();
    });
});

describe("getDefaultGmailOAuthMailer", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV };
        delete process.env["DOCSOC_SMTP_PORT"];
        delete process.env["DOCSOC_SENDER_EMAIL"];
        delete process.env["DOCSOC_GOOGLE_CREDENTIALS_FILE"];
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("constructs a GmailOAuthMailer from DOCSOC_GOOGLE_CREDENTIALS_FILE and the sender email", () => {
        process.env["DOCSOC_SMTP_PORT"] = "2525";
        process.env["DOCSOC_SENDER_EMAIL"] = "sender@example.com";
        process.env["DOCSOC_GOOGLE_CREDENTIALS_FILE"] = "./google-creds.json";

        getDefaultGmailOAuthMailer();

        // host, port, username (= sender), sender, keyfile
        expect(GmailOAuthMailer).toHaveBeenCalledWith(
            "smtp.gmail.com",
            2525,
            "sender@example.com",
            "sender@example.com",
            "./google-creds.json",
        );
    });

    it("falls back to port 587 and the default sender email", () => {
        process.env["DOCSOC_GOOGLE_CREDENTIALS_FILE"] = "./google-creds.json";

        getDefaultGmailOAuthMailer();

        expect(GmailOAuthMailer).toHaveBeenCalledWith(
            "smtp.gmail.com",
            587,
            "docsoc@ic.ac.uk",
            "docsoc@ic.ac.uk",
            "./google-creds.json",
        );
    });

    it("throws if DOCSOC_GOOGLE_CREDENTIALS_FILE is missing", () => {
        process.env["DOCSOC_SENDER_EMAIL"] = "sender@example.com";

        expect(() => getDefaultGmailOAuthMailer()).toThrow(
            "DOCSOC_GOOGLE_CREDENTIALS_FILE is required for Gmail OAuth mailer.",
        );
        expect(GmailOAuthMailer).not.toHaveBeenCalled();
    });
});