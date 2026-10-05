import { google } from "googleapis";

import { authenticateGoogle, verifyGoogleAccount } from "./auth";
import { GmailDraftUploader } from "./uploadDrafts";

jest.mock("./auth", () => ({
    authenticateGoogle: jest.fn().mockResolvedValue({ fake: "client" }),
    verifyGoogleAccount: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("googleapis", () => ({
    google: {
        gmail: jest.fn(),
    },
}));

jest.mock("html-to-text", () => ({
    convert: jest.fn().mockReturnValue("plain text"),
}));

// MailComposer is a default-exported class; the mock builds a fixed raw MIME buffer.
jest.mock("nodemailer/lib/mail-composer/index.js", () =>
    jest.fn().mockImplementation(() => ({
        compile: () => ({
            build: (cb: (err: Error | null, message: Buffer) => void) =>
                cb(null, Buffer.from("RAW MIME MESSAGE")),
        }),
    })),
);

jest.mock("@docsoc/util", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

const SENDER_EMAIL = "user@example.com";
const KEYFILE = "./google-creds.json";

const expectedRaw = Buffer.from("RAW MIME MESSAGE").toString("base64url");

describe("GmailDraftUploader", () => {
    let mockCreate: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        // Re-establish default implementations (clearAllMocks only clears call data, not impls).
        (authenticateGoogle as jest.Mock).mockResolvedValue({ fake: "client" });
        (verifyGoogleAccount as jest.Mock).mockResolvedValue(undefined);
        mockCreate = jest.fn().mockResolvedValue({ data: { id: "draft-123" } });
        (google.gmail as jest.Mock).mockReturnValue({
            users: { drafts: { create: mockCreate } },
        });
    });

    describe("authenticate", () => {
        it("authenticates, verifies the sender and builds a Gmail client", async () => {
            const uploader = new GmailDraftUploader();

            await uploader.authenticate(SENDER_EMAIL, KEYFILE);

            expect(authenticateGoogle).toHaveBeenCalledWith(KEYFILE);
            expect(verifyGoogleAccount).toHaveBeenCalledWith(
                { fake: "client" },
                SENDER_EMAIL,
                expect.anything(),
            );
            expect(google.gmail).toHaveBeenCalledWith({
                version: "v1",
                auth: { fake: "client" },
            });
        });

        it("throws if no credentials file is provided", async () => {
            const uploader = new GmailDraftUploader();

            await expect(uploader.authenticate(SENDER_EMAIL)).rejects.toThrow(
                "Google credentials file path not provided",
            );
        });

        it("does not build a client if the sender verification fails", async () => {
            (verifyGoogleAccount as jest.Mock).mockRejectedValue(new Error("mismatch"));
            const uploader = new GmailDraftUploader();

            await expect(uploader.authenticate("someone-else@example.com", KEYFILE)).rejects.toThrow(
                "mismatch",
            );
            expect(google.gmail).not.toHaveBeenCalled();
        });
    });

    describe("uploadEmail", () => {
        it("creates a Gmail draft with the base64url-encoded raw message", async () => {
            const uploader = new GmailDraftUploader();
            await uploader.authenticate(SENDER_EMAIL, KEYFILE);

            await uploader.uploadEmail(["to@example.com"], "Subject", "<p>Hello</p>", [], {
                cc: [],
                bcc: [],
            });

            expect(mockCreate).toHaveBeenCalledWith({
                userId: "me",
                requestBody: { message: { raw: expectedRaw } },
            });
        });

        it("throws if called before authentication", async () => {
            const uploader = new GmailDraftUploader();

            await expect(
                uploader.uploadEmail(["to@example.com"], "Subject", "<p>Hello</p>"),
            ).rejects.toThrow("Client not authenticated");
        });

        it("rethrows if the Gmail draft creation fails (does not silently swallow)", async () => {
            mockCreate.mockRejectedValue(new Error("Gmail API error"));
            const uploader = new GmailDraftUploader();
            await uploader.authenticate(SENDER_EMAIL, KEYFILE);

            await expect(
                uploader.uploadEmail(["to@example.com"], "Subject", "<p>Hello</p>", [], {
                    cc: [],
                    bcc: [],
                }),
            ).rejects.toThrow("Gmail API error");
        });
    });
});
