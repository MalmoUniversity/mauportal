# MAU Arkiv – Examples and Configuration

The application has two configuration files: `default.json` and `local.json`. Please follow the
manual to configure these correctly. In the application directory you will also find `AuditLog.sql`,
which is used to populate the log database table with the correct structure. Please follow the
manual for this step.

The directory `examples` contains three features, described below.

---

## 1. JSON Configuration of the Archive Portal

In `etc/mau/mau-arkiv/config/portal-main` you will find the archive portal's example default
configuration. Copy these files to your Linux server's `/etc` directory:

```bash
cd etc
sudo cp -r mau/ /etc
```

> This copies the configuration into its correct place.

The application expects to find the archive portal's configuration at:

```
/etc/mau/mau-arkiv/config/portal-main
```

If you want to use a different path, you can — but make sure to specify the new path in the
application's `default.json` file.

---

## 2. Sample Archive and Sample Search Index

In the directory `002` you will find a sample archive package containing:

- XML files
- XML schema
- XSL stylesheet
- Attachment files

Move or copy this directory into the directory you have defined as `rootUri` in one of the search
portal JSON files (`example7.json` or `example8.json`).

Two files are used to populate the sample search index:

| File             | Purpose                        |
|------------------|--------------------------------|
| `TestIndex.sql`  | Defines the table structure    |
| `TestIndex.bcp`  | Contains the test data         |

Please follow the manual for this step.

---

## 3. JSON or "Dirty" JSON?

The JSON files in the portal configuration are valid JSON and will pass validation in tools such as
`jq`. However, embedded SQL queries inside JSON files tend to be difficult to read.

The application therefore supports **"dirty" JSON** (also known as Python-style JSON), which allows
for better readability.

The file `prettySQL.txt` contains the same SQL query as found in `example7.json` and `example8.json`.
If you prefer improved readability, the contents of `prettySQL.txt` can be substituted into those
two JSON files.
