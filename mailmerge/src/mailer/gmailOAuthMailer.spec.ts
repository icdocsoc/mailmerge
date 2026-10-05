import { authenticate } from "@google-cloud/local-auth";
import { convert } from "html-to-text";
import nodemailer from "nodemailer";

import { EmailString, FromEmail } from "../util/types";
import GmailOAuthMailer from "./gmailOAuthMailer";

jest.mock("@google-cloud/local-auth", () => ({
    authenticate: jest.fn(),
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

jest.mock("@docsoc/util", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

describe("GmailOAuthMailer", () => {
    let mockGetAccessToken: jest.Mock;
    let mockGetTokenInfo: jest.Mock;
    let mockSendMail: jest.Mock;

    const SENDER_EMAIL = "user@example.com";
    const KEYFILE = "./google-creds.json";
    const from: FromEmail = '"From" <from@example.com>';
    const to = ["recipient@example.com"];
    const cc: EmailString[] = ["cc@example.com"];
    const bcc: EmailString[] = ["bcc@example.com"];

    const makeMailer = () =>
        new GmailOAuthMailer("smtp.gmail.com", 587, SENDER_EMAIL, SENDER_EMAIL, KEYFILE);

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetAccessToken = jest.fn().mockResolvedValue({ token: "access-token" });
        // By default the signed-in Google account matches the configured sender.
        mockGetTokenInfo = jest.fn().mockResolvedValue({ email: SENDER_EMAIL });
        (authenticate as jest.Mock).mockResolvedValue({
            getAccessToken: mockGetAccessToken,
            getTokenInfo: mockGetTokenInfo,
        });

        mockSendMail = jest.fn().mockResolvedValue(undefined);
        (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });
    });

    describe("sendMail", () => {
        it("authenticates with the keyfile and the required Gmail scopes", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(authenticate).toHaveBeenCalledWith({
                keyfilePath: KEYFILE,
                scopes: [
                    "https://mail.google.com/",
                    "https://www.googleapis.com/auth/userinfo.email",
                ],
            });
        });

        it("creates an XOAUTH2 transporter with the acquired token", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(nodemailer.createTransport).toHaveBeenCalledWith({
                host: "smtp.gmail.com",
                port: 587,
                secure: false,
                auth: {
                    type: "OAuth2",
                    user: SENDER_EMAIL,
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
    });

    describe("sender identity verification", () => {
        it("matches the sender email case-insensitively", async () => {
            mockGetTokenInfo.mockResolvedValue({ email: "USER@Example.com" });
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).resolves.toBeUndefined();
        });

        it("throws and does not send if the signed-in account does not match the sender", async () => {
            mockGetTokenInfo.mockResolvedValue({ email: "someone-else@example.com" });
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow(
                /does not match the configured sender email "user@example.com" \(DOCSOC_SENDER_EMAIL\)/,
            );

            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it("throws if the signed-in account email cannot be determined", async () => {
            mockGetTokenInfo.mockResolvedValue({});
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow(/Could not determine the signed-in Google account email/);
        });

        it("throws if an access token cannot be acquired", async () => {
            mockGetAccessToken.mockResolvedValue({ token: undefined });
            const mailer = makeMailer();

            await expect(
                mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] }),
            ).rejects.toThrow("Failed to acquire Google OAuth access token.");

            expect(nodemailer.createTransport).not.toHaveBeenCalled();
        });

        it("authenticates (opens the browser) only once across multiple sends", async () => {
            const mailer = makeMailer();

            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });
            await mailer.sendMail(from, to, "Subject", "<p>Hello</p>", [], { cc: [], bcc: [] });

            expect(authenticate).toHaveBeenCalledTimes(1);
        });
    });
});
