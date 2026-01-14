import { InteractiveBrowserCredential } from "@azure/identity";
import { jest } from "@jest/globals";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import fs from "fs/promises";

import { EmailUploader } from "../../src/graph/uploadDrafts.js";

jest.mock("@azure/identity");
jest.mock("@microsoft/microsoft-graph-client");
jest.mock("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js");
jest.mock("@docsoc/util", () => {
    const logger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
    return { createLogger: () => logger };
});
jest.mock("fs/promises");

/// @ts-expect-error: Mocking constructor
global.fetch = jest.fn();

describe("EmailUploader", () => {
    let emailUploader: EmailUploader;

    beforeEach(() => {
        emailUploader = new EmailUploader();
    });

    describe("authenticate", () => {
        it("should authenticate successfully", async () => {
            /// @ts-expect-error: Mocking constructor
            const mockCredential = new InteractiveBrowserCredential();
            const mockAuthProvider = new TokenCredentialAuthenticationProvider(mockCredential, {
                scopes: ["Mail.ReadWrite"],
            });
            const mockClient = {
                api: jest.fn().mockReturnThis(),
                /// @ts-expect-error: Mocking method
                get: jest.fn().mockResolvedValue({ mail: "test@example.com" }),
            };

            (InteractiveBrowserCredential as jest.Mock).mockReturnValue(mockCredential);
            (TokenCredentialAuthenticationProvider as jest.Mock).mockReturnValue(mockAuthProvider);
            (Client.initWithMiddleware as jest.Mock).mockReturnValue(mockClient);

            await emailUploader.authenticate("test@example.com", "tenantId", "clientId");

            expect(mockClient.api).toHaveBeenCalledWith("/me");
            expect(mockClient.get).toHaveBeenCalled();
        });

        it("should throw error if tenantId is not provided", async () => {
            await expect(
                emailUploader.authenticate("test@example.com", undefined, "clientId"),
            ).rejects.toThrow("Tenant ID not provided");
        });

        it("should throw error if clientId is not provided", async () => {
            await expect(
                emailUploader.authenticate("test@example.com", "tenantId", undefined),
            ).rejects.toThrow("Client ID not provided");
        });

        it("should throw error if authenticated email does not match", async () => {
            /// @ts-expect-error: Mocking constructor
            const mockCredential = new InteractiveBrowserCredential();
            const mockAuthProvider = new TokenCredentialAuthenticationProvider(mockCredential, {
                scopes: ["Mail.ReadWrite"],
            });
            const mockClient = {
                api: jest.fn().mockReturnThis(),
                /// @ts-expect-error: Mocking method
                get: jest.fn().mockResolvedValue({ mail: "wrong@example.com" }),
            };

            (InteractiveBrowserCredential as jest.Mock).mockReturnValue(mockCredential);
            (TokenCredentialAuthenticationProvider as jest.Mock).mockReturnValue(mockAuthProvider);
            (Client.initWithMiddleware as jest.Mock).mockReturnValue(mockClient);

            await expect(
                emailUploader.authenticate("test@example.com", "tenantId", "clientId"),
            ).rejects.toThrow(
                "Authenticated user email does not match the provided email test@example.com.",
            );
        });
    });

    describe("uploadEmail", () => {
        it("should upload email successfully without attachments", async () => {
            const mockClient = {
                api: jest.fn().mockReturnThis(),
                /// @ts-expect-error: Mocking method
                post: jest.fn().mockResolvedValue({ id: "messageId" }),
            };

            /// @ts-expect-error: Mocking property
            emailUploader["client"] = mockClient;

            await emailUploader.uploadEmail(
                ["to@example.com"],
                "Subject",
                "<p>HTML content</p>",
                [],
                { cc: [], bcc: [] },
                { enableOutlookParagraphSpacingHack: false },
            );

            expect(mockClient.api).toHaveBeenCalledWith("/me/messages");
            expect(mockClient.post).toHaveBeenCalled();
        });

        it("should apply the outlook paragraph hack", async () => {
            const mockClient = {
                api: jest.fn().mockReturnThis(),
                /// @ts-expect-error: Mocking method
                post: jest.fn().mockResolvedValue({ id: "messageId" }),
            };

            /// @ts-expect-error: Mocking property
            emailUploader["client"] = mockClient;

            await emailUploader.uploadEmail(
                ["to@example.com"],
                "Subject",
                "<p>HTML content</p><p>And some more</p>   <p>And some more</p>",
                [],
                { cc: [], bcc: [] },
                { enableOutlookParagraphSpacingHack: true },
            );

            expect(mockClient.api).toHaveBeenCalledWith("/me/messages");
            expect(mockClient.post).toHaveBeenCalledWith({
                subject: "Subject",
                toRecipients: [{ emailAddress: { address: "to@example.com" } }],
                ccRecipients: [],
                bccRecipients: [],
                body: {
                    contentType: "HTML",
                    content:
                        "<p>HTML content</p><p><br></p><p>And some more</p><p><br></p><p>And some more</p>",
                },
            });
        });

        it("should upload email successfully with attachments", async () => {
            const mockClient = {
                api: jest.fn().mockReturnThis(),
                /// @ts-expect-error: Mocking method
                post: jest.fn().mockResolvedValue({ id: "messageId" }),
            };

            /// @ts-expect-error: Mocking property
            emailUploader["client"] = mockClient;
            /// @ts-expect-error: Mocking method
            jest.spyOn(emailUploader, "uploadFile").mockResolvedValue();

            await emailUploader.uploadEmail(
                ["to@example.com"],
                "Subject",
                "<p>HTML content</p>",
                ["path/to/file"],
                { cc: [], bcc: [] },
                { enableOutlookParagraphSpacingHack: false },
            );

            expect(mockClient.api).toHaveBeenCalledWith("/me/messages");
            expect(mockClient.post).toHaveBeenCalled();
            /// @ts-expect-error: Mocking method
            expect(emailUploader.uploadFile).toHaveBeenCalledWith("path/to/file", "messageId");
        });

        it("should throw error if client is not authenticated", async () => {
            await expect(
                emailUploader.uploadEmail(
                    ["to@example.com"],
                    "Subject",
                    "<p>HTML content</p>",
                    [],
                    { cc: [], bcc: [] },
                    { enableOutlookParagraphSpacingHack: false },
                ),
            ).rejects.toThrow("Client not authenticated");
        });
    });

    describe("uploadFile", () => {
        const UPLOAD_ATTACHMENT_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
        const fileSize = 10 * UPLOAD_ATTACHMENT_CHUNK_SIZE; // 40MB file
        const fileData = new Uint8Array(fileSize).fill(0); // Mock file data
        const uploadUrl = "https://example.com/upload";
        const path = "mock/path/to/file";
        const messageID = "mockMessageID";

        let emailUploader: EmailUploader;

        beforeEach(() => {
            jest.clearAllMocks();
            emailUploader = new EmailUploader();
            emailUploader["client"] = {
                api: jest.fn().mockReturnValue({
                    /// @ts-expect-error: Mocking method
                    post: jest.fn().mockResolvedValue({ uploadUrl }),
                }),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
        });

        it("should chunk the file correctly and set Content-Range header", async () => {
            let currentCount = 0;
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockImplementation(async () => {
                    currentCount++;
                    return {
                        nextExpectedRanges: [
                            `${currentCount * UPLOAD_ATTACHMENT_CHUNK_SIZE}-${
                                (currentCount + 1) * UPLOAD_ATTACHMENT_CHUNK_SIZE - 1
                            }`,
                        ],
                    };
                }),
            };
            /// @ts-expect-error: Mocking method
            (fetch as jest.Mock).mockResolvedValue(mockResponse);
            /// @ts-expect-error: Mocking
            (fs.readFile as jest.Mock).mockResolvedValue(fileData);
            /// @ts-expect-error: Mocking
            (fs.stat as jest.Mock).mockResolvedValue({ size: fileSize });

            await emailUploader["uploadFile"](path, messageID);

            expect(fetch).toHaveBeenCalledTimes(10); // 10 chunks for a 40MB file
        });

        it("should throw error if response is not ok", async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: "Bad Request",
            };
            /// @ts-expect-error: Mocking
            (fetch as jest.Mock).mockResolvedValue(mockResponse);
            /// @ts-expect-error: Mocking
            (fs.readFile as jest.Mock).mockResolvedValue(fileData);
            /// @ts-expect-error: Mocking
            (fs.stat as jest.Mock).mockResolvedValue({ size: fileSize });

            await expect(emailUploader["uploadFile"](path, messageID)).rejects.toThrow(
                "Failed to upload chunk: Bad Request",
            );
        });
    });
});
