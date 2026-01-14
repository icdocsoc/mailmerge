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
2. Run `npm run build` in this folder (`email/mailmerge-cli`)
3. Run `npm link` in this folder - this adds `docsoc-mailmerge` to your path

## Quick Start

In a blank directory, run `docsoc-mailmerge init`, then read the output and follow the steps.

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
