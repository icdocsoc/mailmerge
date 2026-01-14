# mailmerge-cli

This is a CLI tool that can be used to generate emails from templates, regenerate them after modifying the results, upload them to Outlook drafts and send them.

It was created using `oclif` and `nx`.

Since it was created using `oclif`, when developing on it please use `oclif`'s commands to e.g. add new commands.

The CLI tool also acts as a library for user-facing function that might help when using `@docsoc/mailmerge` - see `src/mailmerge` for more info.

## Installation

### Production

```bash
npm install -g @docsoc/mailmerge-cli
```

### Locally

1. Run `npm install` from the root of the repo
2. Run `npm run build` in this folder (`mailmerge-cli`)
3. Run `npm link` in this folder - this adds `docsoc-mailmerge` to your path

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

## Detailed Steps

1. In a blank directory somewhere (known as the "mailmerge workspace"), create these folders & files:
    1. `./data/names.csv` - CSV file with at the minimum `to` & `subject` columns
    2. `./templates/template.md.njk` - nunjucks markdown template for your emails (see `/email/workspace/templates/tempkate.md.njk` for an example, where `/` is the repo root)
    3. `./templates/wrapper.html.njk`, a HTML wrapper for the email (use the contents of `/email/workspace/templates/wrapper.html.njk`)
2. Run `docsoc-mailmerge generate nunjucks --help` and read the help text
3. Run `docsoc-mailmerge generate nunjucks ./data/names.csv -o ./output --htmlTemplate=./templates/wrapper.html.njk`. You'll be asked for a runname: generated emails will be placed at `./output/<runname>`
    1. Each record in the CSV will result in 3 files in `./output/<runname>`: an editable markdown file to allow you to modify the email, a HTML rendering of the markdown that you should not edit, and a `.json` metadata file
    2. The HTML files, which is what is actually sent, can be regenerated after edting the markdown files with `regenerate` command (see below)
    3. If you want to edit the to address or subject after this point you will need to edit the JSON files; csv edits are ignored. If you edit the CSV, delete all outputs and run generate again.
4. Edit the generated markdown files - this allows you to edit the emails
5. Run `docsoc-mailmerge regenerate ./output/<runname>` - this will re-render the markdown files into the HTML previews. These HTML previews are then what is sent to receipients. You can call `regenerate` as many times as you want.
6. Once you've edited & checked all the email markdowns as needed & checked and regenerated if needed the HTMLs, run this command to send the emails: `docsoc-mailmerge send ./output/<runname>`.
    1. NOTE: Send does not run `regenerate`, so if you edited any markdown files ensure you ran `regenerate` before running `send`
7. Done! Sent email previews will be moved to `./output/<runname>/sent` to prevent double sending if the send is stopped halfway through.

## Attachments

I recommend placing attachments in an `attachments` folder.

2 ways to add attachments:

1. If you want a different attachments per email, create a column called `attachment` in the CSV with the path to the attachment relative to the workspace root - e.g. if you CSV is in `./data/names.csv` and the attachment in `./attachment/image.jpg`, the CSV row should have `./attachments/image.jpg` as it's value in the `attachment` column
    1. Use multiple columns e.g. `attachment1`, `attachment2` for multiple attachments
    2. When you run `generate` you will be asked which columns to use for attachments
    3. To edit which attachment to use ater `generate`, edit the JSON metadata files.
2. If you want the same attachment to all emails, use the `-a` flag of generate, e.g. `docsoc-mailmerge generate nunjucks ./data/names.csv -o ./output -a ./attachments/image.jpg -a ./attachments/image2.jpg`.
    1. Note that if you pass the CLI option, any info about attachments in the CSV is ignored.

## BCC, CC & Multi to

-   For multi-to: Separate the list of emails with a space in the CSV column
-   For CC: Add a column called `cc` with space separated emails in, and make sure to pass `--cc` to the `generate` command
-   For BCC: Add a column called `bcc` with space separated emails in, and make sure to pass `--bcc` to the `generate` command

This library was generated with [Nx](https://nx.dev).

## Uploading to drafts

You can also upload the emails to drafts instead of sending them. To do this, run `docsoc-mailmerge upload-drafts ./output/<runname> `. This will upload the emails to drafts instead of sending them.

## Hitting Rate Limits?

Use the `-s` flag to set a delay between each email sent. The delay is in seconds.

## Building

Run `nx build mailmerge-cli` to build the library.

## Running unit tests

Run `nx test mailmerge-cli` to execute the unit tests via [Jest](https://jestjs.io).
