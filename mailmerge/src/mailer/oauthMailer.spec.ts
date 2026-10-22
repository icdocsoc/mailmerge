import { InteractiveBrowserCredential } from "@azure/identity";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";

import { EmailString, FromEmail } from "../util/types";
import OAuthMailer from "./oauthMailer";

jest.mock("@azure/identity", () => ({
    InteractiveBrowserCredential: jest.fn(),
}));

jest.mock("@docsoc/util", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

jest.mock("nodemailer", () => ({
    __esModule: true,
    default: {
        createTransport: jest.fn(),
    },
}));

jest.mock("html-to-text", () => ({
    convert: jest.fn().mockReturnValue("converted text"),
}));

const SMTP_OAUTH_SCOPE = "https://outlook.office.com/SMTP.Send";

describe("OAuthMailer", () => {
    let mockGetToken: jest.Mock;
    let mockAuthenticate: jest.Mock;
    let mockSendMail: jest.Mock;
    let nowSpy: jest.SpyInstance;
    let currentTime: number;

    const SENDER_EMAIL = "user@example.com";
    const from: FromEmail = '"From" <from@example.com>';
    const to = ["recipient@example.com"];
    const cc: EmailString[] = ["cc@example.com"];
    const bcc: EmailString[] = ["bcc@example.com"];

    /** Build a mailer with sensible defaults for the tests. */
    const makeMailer = () =>
        new OAuthMailer(
            "smtp.example.com",
            587,
            "user@example.com",
            SENDER_EMAIL,
            "tenant-id",
            "client-id",
        );

    beforeEach(() => {
        jest.clearAllMocks();

        // Freeze time so token expiry logic is deterministic.
        currentTime = 1_000_000;
        nowSpy = jest.spyOn(Date, "now").mockImplementation(() => currentTime);

        mockGetToken = jest.fn().mockResolvedValue({
            token: "access-token",
            expiresOnTimestamp: currentTime + 60 * 60 * 1000, // 1 hour in the future
        });
        // By default the signed-in account matches the configured sender.
        mockAuthenticate = jest.fn().mockResolvedValue({ username: SENDER_EMAIL });
        (InteractiveBrowserCredential as jest.Mock).mockImplementation(() => ({
            getToken: mockGetToken,
            authenticate: mockAuthenticate,
        }));

        mockSendMail = jest.fn().mockResolvedValue(undefined);
        (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
    });

    afterEach(() => {
        nowSpy.mockRestore();
    });

    describe("constructor", () => {
        it("creates an InteractiveBrowserCredential with the tenant and client IDs", () => {
            makeMailer();

            expect(InteractiveBrowserCredential).toHaveBeenCalledWith({
                tenantId: "tenant-id",
                clientId: "client-id",
                redirectUri: "http://localhost",
            });
        });
    });

    describe("sendMail", () => {
        it("acquires an access token with the SMTP.Send scope", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(mockGetToken).toHaveBeenCalledWith([SMTP_OAUTH_SCOPE]);
        });

        it("creates an XOAUTH2 transporter with the acquired token", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: "smtp.example.com",
                port: 587,
                secure: false,
                auth: {
                    type: "OAuth2",
                    user: "user@example.com",
                    accessToken: "access-token",
                },
            });
        });

        it("sends the email with all the provided fields", async () => {
            const mailer = makeMailer();
            const attachments = [{ filename: "file.txt", content: "data" }];

            await mailer.sendMail(
                from,
                to,
                "Subject",
                "<p>Hello</p>",
                attachments,
                { cc, bcc },
                "plain text",
            );

            expect(mockSendMail).toHaveBeenCalledWith({
                from,
                to,
                subject: "Subject",
                text: "plain text",
                html: "<p>Hello</p>",
                attachments,
                cc,
                bcc,
            });
        });

        it("derives the plain text body from the HTML when no text is given", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(convert).toHaveBeenCalledWith("<p>Hello</p>");
            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({ text: "converted text" }),
            );
        });

        it("defaults attachments and cc/bcc when omitted", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>");

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({ attachments: [], cc: [], bcc: [] }),
            );
        });

        it("throws if a token cannot be acquired", async () => {
            mockGetToken.mockResolvedValue(null);
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow("Failed to acquire OAuth access token for SMTP.Send.");

            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });
    });

    describe("sender identity verification", () => {
        it("authenticates and allows sending when the signed-in account matches the sender", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(mockAuthenticate).toHaveBeenCalledWith([SMTP_OAUTH_SCOPE]);
            expect(mockSendMail).toHaveBeenCalled();
        });

        it("matches the sender email case-insensitively", async () => {
            mockAuthenticate.mockResolvedValue({ username: "USER@Example.com" });
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).resolves.toBeUndefined();
        });

        it("throws and does not send if the signed-in account does not match the sender", async () => {
            mockAuthenticate.mockResolvedValue({ username: "someone-else@example.com" });
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow(
                /does not match the configured sender email "user@example.com" \(DOCSOC_SENDER_EMAIL\)/,
            );

            expect(mockGetToken).not.toHaveBeenCalled();
            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it("throws if authentication returns no account record", async () => {
            mockAuthenticate.mockResolvedValue(undefined);
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow("Failed to authenticate with Microsoft OAuth for SMTP.Send.");
        });

        it("only verifies the signed-in account once across multiple sends", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });
            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(mockAuthenticate).toHaveBeenCalledTimes(1);
        });
    });

    describe("access token caching", () => {
        it("reuses a cached token across sends while it is still valid", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });
            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(mockGetToken).toHaveBeenCalledTimes(1);
        });

        it("fetches a new token once the cached one is within the refresh skew of expiry", async () => {
            const mailer = makeMailer();

            // First send caches a token expiring 1 hour out.
            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });
            expect(mockGetToken).toHaveBeenCalledTimes(1);

            // Advance time to within the 60s refresh skew of expiry.
            currentTime += 60 * 60 * 1000 - 30 * 1000;
            mockGetToken.mockResolvedValue({
                token: "new-access-token",
                expiresOnTimestamp: currentTime + 60 * 60 * 1000,
            });

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(mockGetToken).toHaveBeenCalledTimes(2);
            expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    auth: expect.objectContaining({ accessToken: "new-access-token" }),
                }),
            );
        });
    });
});
