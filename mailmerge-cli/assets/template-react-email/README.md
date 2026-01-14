To get started:

1. Put your own CSV in the `data` folder, with at the minimum `to` and `subject` columns.
    1. You can also add `cc` and `bcc` columns (to use them you will need to pass the correct CLI option though)
    2. `to`, `cc`, and `bcc` can be a space-separated list of emails.
    3. You can add any other columns you like, and they will be available in the template.
    4. For attachments, add a column with the name `attachment` with a singular path to the file to attach relative to th workspace root (e.g. `./attachments/image1.jpg`).
        1. Or, pass the same attachment to every email using the `-a` flag to `generate`
    5. For multiple attachments, have separate columns e.g. `attachment1`, `attachment2`, etc.
    6. See `data/example.csv` for an example.
2. Put your own nunjucks markdown email template in the `templates` folder.
    1. You can also edit the default `wrapper.html.njk` file - this is what the markdown HTML will be wrapped in when sending it. It muat _always_ include a `{{ content }}` tag, which will be replaced with the markdown HTML.
3. Fill in the `.env` file with your email credentials.

Then run the following commands:

```bash
npm run dev # use this to preview emails in a web browser
npm run compile # compile templates to ./emails-out

# Note the .js here
docsoc-mailmerge generate react ./data/my-data.csv ./emails-out/Example.js -o ./output

# Want to change the react template? Edit it, recompile and run regenerate to make the HTML again:
npm run compile
docsoc-mailmerge regenerate ./output/<runname>

# review them, then send:
docsoc-mailmerge send ./output/<runname>
```

The CLI tool has many options - use `--help` to see them all:

```bash
docsoc-mailmerge generate react --help
docsoc-mailmerge regenerate --help
docsoc-mailmerge send --help
```

## What happen when you generate

1. Each record in the CSV will result in 2 files in `./output/<runname>`: a HTML rendering of the React email that you should not edit, and a `.json` metadata file
2. The HTML files, which is what is actually sent, can be regenerated after edting the react template, recompiling it and then running `regenerate` command (see below)
3. If you want to edit the to address or subject after this point you will need to edit the JSON files; csv edits are ignored. If you edit the CSV, delete all outputs and run generate again.

## If the .env file is missing

Use this template:

```bash
# Fill these in to send emails
DOCSOC_SMTP_SERVER=smtp-mail.outlook.com
DOCSOC_SMTP_PORT=587
DOCSOC_OUTLOOK_USERNAME=
# Password to docsoc email
DOCSOC_OUTLOOK_PASSWORD=

# Option: set these if logging in as someone other than docsoc@ic.ac.uk or sending as someone else
# DOCSOC_SENDER_NAME=DoCSoc
# DOCSOC_SENDER_EMAIL=docsoc@ic.ac.uk

# Optional: Fill these in to uplod drafts
# You will need to create an app registration in Entra ID, restricted to the organisation,
# And grant it the following permissions:
# - Mail.ReadWrite
# - User.Read
MS_ENTRA_CLIENT_ID=
MS_ENTRA_CLIENT_SECRET=
MS_ENTRA_TENANT_ID=
```
