# DoCSoc Mailmerge

DoCSoc's most important tool: flexibly generate and send emails in bulk using templates.

> [!NOTE]
> Don't be fooled by the name - this library can be used to do general data merges, into any format, given the right config!

## What is this?

This is a monorepo containing three packages:

- **`mailmerge`** - A core library for mail merge operations including template rendering, data merging, email sending via SMTP, and uploading to Outlook drafts
- **`mailmerge-cli`** - A command-line tool that provides an easy-to-use interface for the mailmerge library
- **`utils`** - Shared utility functions used by the other packages (kept private)
	- This is mostly there as these tools used to live in a monorepo with such a package, and updating all the test mocks etc to move it into the packages directly was deemed more effort than just copying the package as a package.

There is also the `test-space` directory which has been used as a place to test the CLI inside by invoking it on sample data

## Installation

```bash
npm install -g @docsoc/mailmerge-cli
```

Or to use the library directly in your project:

```bash
npm install @docsoc/mailmerge
```

## Quick Start

In a blank directory, run:

```bash
docsoc-mailmerge init
# Or if using react
docsoc-mailmerge init --react
```

Then follow the instructions in the output.

## Usage Guide

### 1. Set Up Your Workspace

**If using nunjucks template (default):**
In a blank directory (your "mailmerge workspace"), create these folders and files:

1. `./data/names.csv` - CSV file with at minimum `to` and `subject` columns
2. `./templates/template.md.njk` - Nunjucks markdown template for your emails
3. `./templates/wrapper.html.njk` - HTML wrapper for the email

**If using React template:**
Read the instructions in `mailmerge-cli/assets/template-react-email/README.md`, or your generated README.md if you used `docsoc-mailmerge init --react`.

### 2. Generate Emails

Run the generate command to create emails from your template and data:

```bash
docsoc-mailmerge generate nunjucks ./data/names.csv -o ./output --htmlTemplate=./templates/wrapper.html.njk

# Or, using the React template:
docsoc-mailmerge generate react ./data/names.csv ./emails-out/Example.js -o ./output
```

You'll be prompted for a runname. Generated emails will be placed at `./output/<runname>`.

Each record in the CSV results in 3 files:
- An editable **markdown file** for modifying the email
- A **HTML rendering** of the markdown (what actually gets sent)
- A **`.json` metadata file** with email details

> **Note:** If you need to edit the "to" address or subject after generation, edit the JSON files. CSV edits are ignored after generation. To use CSV edits, delete all outputs and run generate again.

### 3. Edit Your Emails

Edit the generated markdown files to customize individual emails.

### 4. Regenerate HTML Previews

After editing markdown files (or recompiling your react template), regenerate the HTML previews:

```bash
docsoc-mailmerge regenerate ./output/<runname>
```

You can run `regenerate` as many times as needed.

### 5. Send Emails

Once you're satisfied with your emails:

```bash
docsoc-mailmerge send ./output/<runname>
```

> **Important:** The `send` command does NOT run `regenerate`, so make sure you've regenerated after any markdown edits.

Sent email previews are automatically moved to `./output/<runname>/sent` to prevent accidental double-sending.

## Advanced Features

### Attachments

Place attachments in an `attachments` folder. There are two ways to add them:

**Per-email attachments (using CSV):**

1. Add an `attachment` column to your CSV with the path relative to workspace root
   - Example: `./attachments/image.jpg`
2. Use multiple columns (`attachment1`, `attachment2`) for multiple attachments
3. You'll be prompted which columns to use during `generate`
4. To edit attachments later, modify the JSON metadata files

**Same attachment for all emails (using CLI flag):**

```bash
docsoc-mailmerge generate nunjucks ./data/names.csv -o ./output -a ./attachments/image.jpg -a ./attachments/image2.jpg
```

Note: CLI flags override any attachment info in the CSV.

### CC, BCC, and Multiple Recipients

- **Multiple To addresses:** Separate emails with spaces in the CSV column
- **CC:** Add a `cc` column with space-separated emails and pass `--cc` to `generate`
- **BCC:** Add a `bcc` column with space-separated emails and pass `--bcc` to `generate`

### Upload to Drafts Instead of Sending

To upload emails to Outlook drafts instead of sending:

```bash
docsoc-mailmerge upload-drafts ./output/<runname>
```

### Rate Limiting

If you're hitting rate limits, use the `-s` flag to add a delay (in seconds) between each email:

```bash
docsoc-mailmerge send ./output/<runname> -s 2
```

### Inline Images
You can create an `images.json` file to specify images to attach inline images.
It should have a format like this:
```json
[
    {
        "path": "./attachments/image1.jpg",
        "filename": "image1.jpg",
        "cid": "animage"
    }
]
```

You then use the `cid` to reference the image:
```html
<img src="cid:animage" alt="An Image" />
```

Note that you need to tell mailmerge about the iamges files on send:
```bash
docsoc-mailmerge send ... -i ./images.json
```

Upload-drafts does not currently support inline images either.

## Using the Library Directly

The `@docsoc/mailmerge` library can be used programmatically in your own projects. It provides:

1. **DataSource interface** - For loading data to mail merge
2. **TemplateEngine** - For loading and using templates (e.g., NunjucksMarkdownEngine)
3. **Storage** - For storing mail merge results before sending
4. **Mailer** - For sending emails via SMTP
5. **Graph integration** - For uploading to Outlook drafts
6. **Pipelines** - For chaining together mail merge operations headlessly

The library is designed to work headlessly with the right options, allowing for automated email sending for events.

See the [mailmerge package README](mailmerge/README.md) for detailed API documentation.

## Development

### Building

From the root of the repo:

```bash
npm install
npm run build
```

To build individual packages:

```bash
cd mailmerge
npm run build

cd mailmerge-cli
npm run build
```

### Testing

```bash
npm test
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

### Local Development of CLI

1. Run `npm install` from the root of the repo
2. Navigate to `mailmerge-cli` and run `npm run build`
3. Run `npm link` in the `mailmerge-cli` folder to add `docsoc-mailmerge` to your PATH

## License

MIT

## Author

Kishan Sambhi <kishansambhi@hotmail.co.uk>

## Links

- [GitHub Repository](https://github.com/icdocsoc/mailmerge)
- [Issues](https://github.com/icdocsoc/mailmerge/issues)
