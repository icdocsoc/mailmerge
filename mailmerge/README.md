# mailmerge

> [!NOTE]
> Don't be fooled by the name - this library can be used to do general data merges, into any format, given the right config!
> See the note at the end.

This is a library to help with all the core parts of doing a mailmerge for DoCSoc:

1. Loading data to mailmerge on (`DataSource` interface)
2. Loading and using the template to mail merge with, using something called a `TemplateEngine`
3. Storing results of the mailmerge somewhere, so you can check them before sending
4. Sending the mailmerged results via SMTP
5. Uploading the mailmerged results to Outlook drafts

This library was originally designed to be used in conjunction with the `mailmerge-cli` tool, but can be used by itself.
The library has been made, with few exceptions, to work headlessly: so long as the right options are passed in the whole thing can be ran without user input to e.g. automate the sending of emails for events.

# Installation

```bash
npm install @docsoc/mailmerge
```

# Building

Make sure to run `npm install` before building.
All commands assumed to be ran in this directory.

## To build locally

```bash
npm run build-local
```

(this should also compile any monorepo dependencies)

## To build for publishing

```bash
npx nx build
```

## Testing & linting

```bash
npx nx test
npx nx lint
```

# Core library concepts

Core concepts in this library are:

## `TemplateEngine` (aka engine)

Code lives in `src/engines/`

A `TemplateEngine` is a generic class that takes a template and a list of records, and returns the result of merging the two. It also needs to be able to tell us what fields the template has, so we can map record fields to the template before passing the mapped data to the template for rendering.

Engines return a list of `TemplatePreview`s, which contain the content of the merged template, and the fields that were used in the template. The idea is that you can return multiple previews per record as you might have intermediate results you want users to be able to edit.

Engines also need to be able to rerender their previews, to allow for the users to edit the results of the merge.
For example, the `NunjucksMarkdownEngine` will return a markdown preview and an HTML preview, and will allow the user to edit the markdown preview and then rerender the HTML preview.

Check the typedoc for more info.

Relavent file: `src/engines/types.ts`. This contains the abstract class `TemplateEngine` that all engines must extend, the expected constructor for the engine, and what an engine should return.

### Included engines

-   `NunjucksMarkdownEngine`:
    -   A `TemplateEngine` that uses Nunjucks to render markdown templates.
    -   It outputs two previews: an editable markdown preview, and a rendered HTML preview.
    -   The rendered HTML is then what is sent
    -   This is the default engine for the `mailmerge-cli` tool.

## Ideas for future engines

-   An engine that uses `react-email` or the equivalent for Vue, to allow for more complex emails to be generated

## `Mailer`

Lives in `src/mailer/`

Provides a way to send emails via SMTP.

Note that for Microsoft 365, you can login using your username and password.

It also provides some static methods to help with the sending of emails.

See the typedoc for more info of the files in `src/mailer/`.

Generlly you want to use the stuff exported by `src/mailer/defaultMailer.ts` as it has the most useful stuff.

## Pipelines

Pipelines provide a way to chain together the different parts of the mailmerge process automatically & headlessly

All pieplines are in `src/pipelines/`.

They are designed to be generic, and accept instances of:

1. A `DataSource` (`src/pipelines/loaders/`), to get records to merge on from.
    1. This library includes these data sources:
        1. `CSVBackend` - loads records from a CSV file
    2. A DataSource should return an array of records, where each record is an object with keys that are strings, and values that are JSON serialisable (so no functions or circular references, but this does allow for nested objects and arrays)
2. A `TemplateEngine` (`src/engines/`), to merge the records with a template
    1. This library includes these engines:
        1. `NunjucksMarkdownEngine` - uses Nunjucks to render markdown templates, which it then renders to HTML
    2. Future engines you might want to write might include e.g. one to use `react-email` or the equivalent for Vue.
3. A `StorageBackend` (`src/pipelines/storage/`), to store the results of the merge somehow, and later load them back in and update them on disk after a regeneration.
    1. This library includes these storage backends:
        1. `JSONSidecarsBackend` - stores the results of a merge to the filesystem, with JSON sidecar files placed next to each record

Each of these folders has a `types.ts` files, that you should check out if you want to write your own.

Checks the typedoc for more info on how to make your own & instantiate the provided ones. You can also check the CLI tool `mailmerge-cli` for examples of how to use them.

Now, for the provided pipelines:

> [!IMPORTANT]
> Check the typedoc for more information about each pipeline, what they do, and their options

> [!NOTE]
> Some pipelines contain interactive elements, however they generally have an option to switch this off - check the typedoc.

### `generate` (`src/pipelines/generate.ts`)

This pipeline is designed to take a `DataSource`, `TemplateEngine`, and `StorageBackend`, and merge the records from the `DataSource` with the `TemplateEngine`, storing the results in the `StorageBackend` (and also returning them directly for convenience).

### `regenerate` (`src/pipelines/rerender.ts`)

This pipeline is designed to take a `TemplateEngine`, and `StorageBackend`, and load the previouse merge results from the `StorageBackend`, regenerate them using the `TemplateEngine`, and store the results back in the `StorageBackend` (and also return them directly for convenience).

### `send` (`src/pipelines/send.ts`)

This pipeline is designed to take a `Mailer`, `StorageBackend` and `TemplateEngine`, and load the previouse merge results from the `StorageBackend`. It then asks the `TemplateEngine` for each merge result which sub-result (preview) is the HTML to send, and then sends it using the `Mailer`.

### `upload` (`src/pipelines/uploadDrafts.ts`)

This pipeline is designed to take a `StorageBackend` and `TemplateEngine`, and load the previouse merge results from the `StorageBackend`. It then asks the `TemplateEngine` for each merge result which sub-result is the HTML for the final email. Then, using the Microsoft Graph API, it uploads the email to the drafts folder of the user's Outlook account.

Note that because this requires OAuth, it can't be done headlessly - the user will need to authenticate; the pipeline will prompt for this.

### Final note

All pipelines are exported from `src/index.ts` and can be imported directly from `@docsoc/mailmerge`.

## Other files

By folder:

-   `src/`: Contains the main library code
    -   `src/engines/`: Contains the engines see above
    -   `src/graph/`: Code for interacting with the Microsoft Graph API, specifically a `EmailUploader` class for uploading emails to Outlook drafts
    -   `src/mailer/`: Contains the `Mailer` class, which is used to send emails via SMTP. See above.
    -   `src/markdown/`: Helper libraries for rendering markdownt o HTML (in case we want to change how this is done later)
    -   `src/pipelines/`: Contains the pipelines code - see above
    -   `src/previews/`: Code that supports the `JSONSidecarsBackend` storage backend to SAVE AND load previewS from disk & handle their sidecar files
    -   `src/util/`: Utilities & constants, including special types for email strings and `DEFAULT_FIELD_NAMES`, the keys of which we expect to be in records

# Developing with the library

## Quick Start

### Using the pipelines (recommended)

The best option to do custom mail merge is to use the pipelines, writing your own data source, engine & storage backend if needed.

E.g to do a nunjucks markdown merge with a database:

```typescript
import { generate, GenerateOptions, DataSource, StorageBackend, MergeResultWithMetadata, MergeResult, RawRecord, MappedRecord } from '@docsoc/mailmerge';
import { mapFieldsInteractive } from '@docsoc/mailmerge-cli';

class DatabaseDataSource implements DataSource {
    async loadRecords(): Promise<{ headers: Set<String>; records: RawRecord[] }[]> {
        // Load records from your database, somehow
        const headers = db.findHeaders();
        const records = db.findRecords();

        // And return them
        return {
            headers,
            records,
        };
    }
}

class DatabaseStorageBackend implements StorageBackend<TableModel> {
    async loadMergeResults(): AsyncGenerator<MergeResultWithMetadata<TableModel>> {
        // Load the merge results from your database, somehow
        // The storageBackendMetadata is so that you know how to put it back into the database.
        return db
            .findMergeResults()
            .map((item) => ({
                ...transformItemToFormatRequired(item),
                storageBackendMetadata: item,
            }))
            .asAsyncGenerator();
    }

    async storeMergeResults(
        results: MergeResult[],
        rawData: { headers: Set<string>; records: MappedRecord[] },
    ): Promise<void> {
        // Store the merge results in your database, somehow
        for (const result of results) {
            db.storeMergeResult(transformResultForDB(result));
        }
    }

    async storeUpdatedMergeResults(results: MergeResultWithMetadata<TableModel>[]): Promise<void> {
        // Store the merge results in your database, somehow
        for (const result of results) {
            db.replaceMergeResult(transformResultForDB(result), result.storageBackendMetadata);
        }
    }

    async postSendAction(resultSent: MergeResultWithMetadata<TableModel>) {
        // Mark as sent
        db.markAsSent(resultSent.storageBackendMetadata);
    }
}

// We'll use the NunjucksMarkdownEngine
const pipelineOptions: GenerateOptions = {
    engineInfo: {
        name: "nunjucks",
        options: {
            templatePath: "path/to/your/template.md",
            rootHtmlTemplate: "path/to/your/root.html",
        }
        engine: NunjucksMarkdownEngine,
    },
    mappings: {
        // Ask the user to do the mapping on the CLI using one of the built-in helpers
        // imported from @docsoc/mailmerge-cli
        headersToTemplatMap: mapFieldsInteractive
        // We know our DB record has these keys
        keysForAttachments: ["attachment"],
    },
    dataSource: new DatabaseDataSource(),
    storageBackend: new DatabaseStorageBackend(),
    // ... other propertis (check typedoc) ...
};

// Call the pipeline
await generate(pipelineOptions);
```

### Doing it manually

The manua method involves creating the instances of the classes yourself, and calling the methods on them.

E.g. to do a simple nunjucks markdown merge, you might do:

```typescript
import { NunjucksMarkdownEngine } from '@docsoc/mailmerge';

const yourData = [{
    // your data here
    name: 'John Doe',
    email: 'a@b.com'
}];

const engine = new NunjucksMarkdownEngine({
    templatePath: 'path/to/your/template.md'
    rootHtmlTemplate: 'path/to/your/root.html'
});

// Call the engine
await engine.loadTemplate();
const previews = await Promise.all(yourData.map(engine.generatePreview));

// Do something with the previews, e.g. commit to file or use the Mailer to email
```

## Using it for non-mail

Tip for using it for non-mail: if you provide dummy data for to & subject from your `DataSource`, and handle `attachments`, `bcc`, `cc` properly as well, all the pipelines should just work.

# Recommended usage - custom mail merge for events (e.g. IC Hack)

For events, here's my general advice:

1. Use the pipelines flow as much as possible - it's designed to be flexible and allow for custom data sources, engines, and storage backends.
2. For the Data Source: This is quite simple to write; I recommend you create one that loads from your database intead of a CSV
    1. You may need to make multiple data sources if you have multiple types of records to merge on, e.g. volunteer schedules (likely a visual spreadsheet that needs to be translated to some JSON format) and attendee emails (likely a database query)
3. For the Storage Backend: Reuse `JSONSidecarsBackend` as the storage backend - it's probably the hardest to write again, and it already supports everything you need. Note that you can extend it if you need to (e.g. to make a version that only loads emails marked for testing)
    1. The only thing to watch for is that it was build to store paths relative to a workspace root that also happened to be the CWD - I'm not sure how it would behave if used outside of this context.
    2. It might be a good idea to do mailmerge as a tool ran separately (e.g. on a server or dev's machine) rather than part of the main server apparatus
4. Write your own engine that uses something like `react-email` or `vue-email` to allow for more complex emails to be generated. Remember that records just need to be JSON serialisable, which allow for nested objects and arrays.
5. Pass this all the way through the pipeline, and you should be good to go!
6. Remember to test, test, test!
