To get started:

1. Put your own CSV in the `data` folder, with at the minimum `to` and `subject` columns.
    1. You can also add `cc` and `bcc` columns (to use them you will need to pass the correct CLI option though)
    2. `to`, `cc`, and `bcc` can be a space-separated list of emails.
    3. You can add any other columns you like, and they will be available in the template.
    4. For attachments, add a column with the name `attachment` with a singular path to the file to attach relative to th workspace root (e.g. `./attachments/image1.jpg`).
        1. Or, pass the same attachment to every email using the `-a` flag to `generate`
    5. For multiple attachments, have separate columns e.g. `attachment1`, `attachment2`, etc.
    6. See `data/example.csv` for an example.
2. Put your own react-email template in `emails`, noting that it must have the following:
    1. The template exported as the default export
    2. Props will be the template's parameters
    3. You must export a function `parameters` which must return an object mapping the name of the props (parameters) for the template to their types (string, number, boolean, array, object) - see `mailmerge/src/engines/react/index.ts#PropTypes` for more details.
3. Fill in the `.env` file with your email credentials.

The advantages of react templates is they can accept complex data types (arrays, objects) as parameters - to take advantage of this, use a JSON file as input over a CSV

Then run the following commands:

```bash
npm install
npm run dev # use this to preview emails in a web browser
npm run compile # compile templates to ./emails-out

# Note the .js here
docsoc-mailmerge generate react ./data/my-data.csv ./emails-out/Example.js -o ./output
# To take advantage of complex data types, use a JSON file:
docsoc-mailmerge generate react ./data/my-data.json ./emails-out/Example.js -o ./output
# (the JSON file must have the same required fields in each record as the required columns of the CSV)

# Want to change the react template? Edit it, recompile and run regenerate to make the HTML again:
npm run compile
docsoc-mailmerge regenerate ./output/<runname>

# review them, then send:
docsoc-mailmerge send ./output/<runname>
# if using inline images, make sure to pass -i:
docsoc-mailmerge send ./output/<runname> -i ./images.json
```

The CLI tool has many options - use `--help` to see them all:

```bash
docsoc-mailmerge generate react --help
docsoc-mailmerge regenerate --help
docsoc-mailmerge send --help
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

## What happen when you generate

1. Each record in the CSV/JSON will result in 2 files in `./output/<runname>`: a HTML rendering of the React email that you should not edit, and a `.json` metadata file
2. The HTML files, which is what is actually sent, can be regenerated after edting the react template, recompiling it and then running `regenerate` command (see below)
3. If you want to edit the to address or subject after this point you will need to edit the JSON metadata files; csv/json edits are ignored. If you edit the CSV/JSON, delete all outputs and run generate again.

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
