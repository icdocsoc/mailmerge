export type EmailString = `${string}@${string}`;
export type FromEmail = `"${string}" <${EmailString}>`;

export type RawRecord = Record<string, unknown>;
export type MappedRecord = Record<string, unknown>;

/**
 * Common surface for classes that upload an email to a mailbox's Drafts folder (e.g. the Microsoft
 * Graph {@link EmailUploader} and the Gmail {@link GmailDraftUploader}).
 *
 * Authentication is provider-specific (different credentials), so it is not part of this contract;
 * this interface covers the shared per-email upload call the upload-drafts pipeline relies on, so
 * the two implementations are guaranteed interchangeable there.
 */
export interface DraftUploader {
    uploadEmail(
        to: string[],
        subject: string,
        html: string,
        attachmentPaths?: (string | { path: string; cid: string })[],
        additionalInfo?: { cc: EmailString[]; bcc: EmailString[] },
        options?: { enableOutlookParagraphSpacingHack?: boolean },
    ): Promise<void>;
}
