import readlineSync from "readline-sync";

import { TemplateEngineConstructor, TemplateEngine } from "../engines/types";
import Mailer from "../mailer/mailer";
import { sendEmails } from "./send";
import { StorageBackend, MergeResultWithMetadata } from "./storage/types";

jest.mock("readline-sync", () => ({
    question: jest.fn(),
}));

jest.mock("@docsoc/util", () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }),
}));

describe("sendEmails", () => {
    let mockStorageBackend: StorageBackend;
    let mockMailer: Mailer;
    let mockEngine: TemplateEngine;
    let mockEngineConstructor: jest.MockedClass<TemplateEngineConstructor>;

    beforeEach(() => {
        /// @ts-expect-error: Mocking storage backend
        mockStorageBackend = {
            loadMergeResults: jest.fn(),
            postSendAction: jest.fn().mockResolvedValue(undefined),
        };

        /// @ts-expect-error: Mocking mailer
        mockMailer = {
            sendMail: jest.fn().mockResolvedValue(undefined),
        };

        /// @ts-expect-error: Mocking engine
        mockEngine = {
            loadTemplate: jest.fn().mockResolvedValue(undefined),
            getHTMLToSend: jest.fn().mockResolvedValue("htmlContent"),
        };

        mockEngineConstructor = jest.fn().mockImplementation(() => mockEngine);
    });

    it("should send emails with valid merge results and engine", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
        );

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).toHaveBeenCalled();
        expect(mockEngine.getHTMLToSend).toHaveBeenCalledWith(["preview"], { field1: "value1" });
        expect(mockMailer.sendMail).toHaveBeenCalledWith(
            '"From" <from@example.com>',
            ["test@example.com"],
            "Test Subject",
            "htmlContent",
            [],
            { cc: [], bcc: [] },
        );
        expect(mockStorageBackend.postSendAction).toHaveBeenCalledWith(mergeResults[0], "sent");
    });

    it("should send only the number emails we want if only specified", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
            {
                record: { field1: "value2" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example2.com"], subject: "Test Subject 2", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
            {
                onlySend: 1,
            },
        );

        expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it("should send to test email if given, not cc or bcc anyone in and not call post send hooks", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: {
                    to: ["test@example.com"],
                    subject: "Test Subject",
                    cc: ["cc@cc.com"],
                    bcc: ["bcc@bcc.com"],
                },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
            {
                onlySend: 1,
                testSendTo: "test@example.com",
            },
        );

        expect(mockMailer.sendMail).toHaveBeenCalledWith(
            '"From" <from@example.com>',
            ["test@example.com"],
            "(TEST) Test Subject",
            expect.any(String),
            [],
            {
                cc: [],
                bcc: [],
            },
        );
        expect(mockStorageBackend.postSendAction).not.toHaveBeenCalled();
    });

    it("should refuse test send if onlySend is not set", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await expect(
            sendEmails(
                mockStorageBackend,
                mockMailer,
                '"From" <from@example.com>',
                enginesMap,
                true,
                {
                    testSendTo: "test@example.com",
                },
            ),
        ).rejects.toThrow("You must set onlySend to a number to use test mode.");
    });

    it("should send no emails if only send 0", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
            {
                record: { field1: "value2" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example2.com"], subject: "Test Subject 2", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
            {
                onlySend: 0,
            },
        );

        expect(mockMailer.sendMail).toHaveBeenCalledTimes(0);
    });

    it("should skip records with invalid engine", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "invalidEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
        );

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).not.toHaveBeenCalled();
        expect(mockEngine.getHTMLToSend).not.toHaveBeenCalled();
        expect(mockMailer.sendMail).not.toHaveBeenCalled();
        expect(mockStorageBackend.postSendAction).not.toHaveBeenCalled();
    });

    it("should handle no merge results", async () => {
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue([]);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
        );

        expect(mockStorageBackend.loadMergeResults).toHaveBeenCalled();
        expect(mockEngine.loadTemplate).not.toHaveBeenCalled();
        expect(mockEngine.getHTMLToSend).not.toHaveBeenCalled();
        expect(mockMailer.sendMail).not.toHaveBeenCalled();
        expect(mockStorageBackend.postSendAction).not.toHaveBeenCalled();
    });

    it("should prompt user for confirmation before sending emails", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);
        (readlineSync.question as jest.Mock).mockReturnValue("Yes, send emails");

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            false,
        );

        expect(readlineSync.question).toHaveBeenCalled();
        expect(mockMailer.sendMail).toHaveBeenCalled();
    });

    it("should throw error if user does not confirm sending emails", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);
        (readlineSync.question as jest.Mock).mockReturnValue("No");

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        await expect(
            sendEmails(
                mockStorageBackend,
                mockMailer,
                '"From" <from@example.com>',
                enginesMap,
                false,
            ),
        ).rejects.toThrow("User did not confirm sending emails!");

        expect(readlineSync.question).toHaveBeenCalled();
        expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it("should use a provided logger", async () => {
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue([]);

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
            { sleepBetween: 0 },
            /// @ts-expect-error: Mocking
            mockLogger,
        );

        expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should sleep after each email", async () => {
        const mergeResults: MergeResultWithMetadata<unknown>[] = [
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
            {
                record: { field1: "value1" },
                /// @ts-expect-error: Mocking previews
                previews: ["preview"],
                engineInfo: { name: "testEngine", options: {} },
                email: { to: ["test@example.com"], subject: "Test Subject", cc: [], bcc: [] },
                attachmentPaths: [],
            },
        ];
        (mockStorageBackend.loadMergeResults as jest.Mock).mockReturnValue(mergeResults);

        // mock setTimeout
        const originalSetTimeout = setTimeout;
        const mockSetTimeout = jest.fn((fn) => originalSetTimeout(fn, 0));
        /// @ts-expect-error: Mocking global setTimeout
        global.setTimeout = mockSetTimeout;

        const enginesMap = {
            testEngine: mockEngineConstructor,
        };

        const mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        };
        await sendEmails(
            mockStorageBackend,
            mockMailer,
            '"From" <from@example.com>',
            enginesMap,
            true,
            { sleepBetween: 20 },
            /// @ts-expect-error: Mocking
            mockLogger,
        );

        expect(mockSetTimeout).toHaveBeenNthCalledWith(1, expect.anything(), 20 * 1000);
        expect(mockSetTimeout).toHaveBeenNthCalledWith(2, expect.anything(), 20 * 1000);
    });
});
