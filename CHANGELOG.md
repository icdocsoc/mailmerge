## 1.6.0 (2024-10-23)


### 🚀 Features

- new get academic years function ([ac65f50](https://github.com/icdocsoc/docsoc-tools/commit/ac65f50))
- add select box for search ([dc432ab](https://github.com/icdocsoc/docsoc-tools/commit/dc432ab))
- useForm and enable academic year selection ([0ad967e](https://github.com/icdocsoc/docsoc-tools/commit/0ad967e))
- query by academic year ([534c267](https://github.com/icdocsoc/docsoc-tools/commit/534c267))
- CSV upload scaffold ([a5d8dd7](https://github.com/icdocsoc/docsoc-tools/commit/a5d8dd7))
- implement CSV import ([76665ce](https://github.com/icdocsoc/docsoc-tools/commit/76665ce))
- select academic year of imports ([0d46400](https://github.com/icdocsoc/docsoc-tools/commit/0d46400))
- add import ids ([951b952](https://github.com/icdocsoc/docsoc-tools/commit/951b952))
- add previous import listing ([457e305](https://github.com/icdocsoc/docsoc-tools/commit/457e305))
- show imports in accordian ([f9e73ab](https://github.com/icdocsoc/docsoc-tools/commit/f9e73ab))
- add import rollback ([da0893c](https://github.com/icdocsoc/docsoc-tools/commit/da0893c))
- add working docker compose ([8a5df0c](https://github.com/icdocsoc/docsoc-tools/commit/8a5df0c))
- add eactivities calls for products ([538a3ee](https://github.com/icdocsoc/docsoc-tools/commit/538a3ee))
- UI to map to products to eactivites ([c6751ed](https://github.com/icdocsoc/docsoc-tools/commit/c6751ed))
- Product selection UI for sync ([630aedc](https://github.com/icdocsoc/docsoc-tools/commit/630aedc))
- switch to a bulk load strategy for sales from eActivities ([a93e991](https://github.com/icdocsoc/docsoc-tools/commit/a93e991))
- add a JSON Backend so we can do lists in nunjucks ([21a454d](https://github.com/icdocsoc/docsoc-tools/commit/21a454d))
- change behaviour of mapFieldInteractive to allow fields to be passed as-is ([0ceb6dc](https://github.com/icdocsoc/docsoc-tools/commit/0ceb6dc))
- add reminder emails for collection system ([0b8eee9](https://github.com/icdocsoc/docsoc-tools/commit/0b8eee9))
- add a import script to collection for JSON data ([276789f](https://github.com/icdocsoc/docsoc-tools/commit/276789f))
- skip product import from eactivities when no new purchases found (to avoid unecessary requests to eactivities) ([a8c7efc](https://github.com/icdocsoc/docsoc-tools/commit/a8c7efc))

### 🩹 Fixes

- allow products to be deleted when variants 0 ([399aec0](https://github.com/icdocsoc/docsoc-tools/commit/399aec0))
- issue where pride.ts tried to be compiled so had to be upgraded to new schema ([af231d2](https://github.com/icdocsoc/docsoc-tools/commit/af231d2))
- spelling error in estimated ([c1ed507](https://github.com/icdocsoc/docsoc-tools/commit/c1ed507))

### ❤️  Thank You

- Kishan Sambhi @Gum-Joe

## 1.5.0 (2024-08-13)


### 🩹 Fixes

- issue where attachments columns in CSVs could only start with attachment ([181353f](https://github.com/icdocsoc/docsoc-tools/commit/181353f))

### ❤️  Thank You

- Kishan Sambhi @Gum-Joe

## 1.4.1 (2024-08-13)


### 🩹 Fixes

- don't call post send hook in test mode ([bf97bf1](https://github.com/icdocsoc/docsoc-tools/commit/bf97bf1))

### ❤️  Thank You

- Kishan Sambhi @Gum-Joe

## 1.4.0 (2024-08-13)


### 🚀 Features

- Add new test mode to mail merge ([1372a8d](https://github.com/icdocsoc/docsoc-tools/commit/1372a8d))

### 🩹 Fixes

- issue where test send didn't override CC & BCC ([8b5c350](https://github.com/icdocsoc/docsoc-tools/commit/8b5c350))
- remove unused import in send.ts in cli commands ([dd03b99](https://github.com/icdocsoc/docsoc-tools/commit/dd03b99))

### ❤️  Thank You

- Kishan Sambhi @Gum-Joe

## 1.3.0 (2024-08-12)

### 🩹 Fixes

-   ignore collection dirs ([d26eb66](https://github.com/icdocsoc/docsoc-tools/commit/d26eb66))
-   Add --only & moving of drafts [396b645](https://github.com/icdocsoc/docsoc-tools/commit/396b645)

### ❤️ Thank You

-   Kishan Sambhi @Gum-Joe

## 1.2.1 (2024-08-06)

This was a version bump only, there were no code changes.

## 1.2.0 (2024-08-06)

### 🩹 Fixes

-   build cli in place so oclif won't complain ([596a78c](https://github.com/icdocsoc/docsoc-tools/commit/596a78c))
-   tests breaking because ESM ([49823c9](https://github.com/icdocsoc/docsoc-tools/commit/49823c9))

### ❤️ Thank You

-   Kishan Sambhi @Gum-Joe

## 1.1.2 (2024-08-06)

### 🩹 Fixes

-   add bin to mailmerge cli bundle ([8fec651](https://github.com/icdocsoc/docsoc-tools/commit/8fec651))

### ❤️ Thank You

-   Kishan Sambhi @Gum-Joe

## 1.1.1 (2024-08-06)

This was a version bump only, there were no code changes.

## 1.1.0 (2024-08-06)

This was a version bump only, there were no code changes.

# 1.0.0 (2024-08-06)

### 🚀 Features

-   scaffold up full preview renderer ([a41320e](https://github.com/icdocsoc/docsoc-tools/commit/a41320e))
-   rerendering of templates ([ea21d57](https://github.com/icdocsoc/docsoc-tools/commit/ea21d57))
-   init command fix: issue where nunjucks didn't pass it all ([5eb8b75](https://github.com/icdocsoc/docsoc-tools/commit/5eb8b75))
-   **nx:** Added Nx Cloud token to your nx.json ([646eb34](https://github.com/icdocsoc/docsoc-tools/commit/646eb34))
-   **nx:** Generated CI workflow ([abf6ea5](https://github.com/icdocsoc/docsoc-tools/commit/abf6ea5))

### 🩹 Fixes

-   throw error on undefined value ([15c45ab](https://github.com/icdocsoc/docsoc-tools/commit/15c45ab))
-   stop if uploaded ([ea0b979](https://github.com/icdocsoc/docsoc-tools/commit/ea0b979))

### ❤️ Thank You

-   Kishan Sambhi @Gum-Joe
