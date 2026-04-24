# MauArkiv — Installation Guide

> **Platform note:** This application has been built and tested on a **Debian 12 (Bookworm)** server. It should also work on an Ubuntu server with few or no modifications. Installation on other Linux distributions may require modifications to the code and/or configuration.
>
> - One common issue is that the versions of `node` and `npm` available in a distribution's package repositories may be out of sync with each other. For this reason, a prebuilt binary is also provided as an alternative to building from source.
> - Regardless of whether you use the prebuilt binary or build from source, make your configuration changes in `local.json` **before** starting or building the application:
>   - Prebuilt: `/opt/mau/mau-arkiv/config/local.json`
>   - Source code: `/mauportal/mau-arkiv/backend/config/local.json`

---

## 0. Prerequisites

### Build environment
- Node.js at least v22
- npm at least v11

### Production server
- Linux (Debian/Ubuntu)
- nginx
- sqlcmd
- bcp
- pm2

Install pm2 globally (requires sudo):

```bash
sudo npm install -g pm2
```

---

## 1. Building and deploying the application

These steps are performed in the build environment (local machine or build server), not necessarily on the production server.

### 1.1 Get the source code

Create a build directory, e.g. in your home directory:

```bash
mkdir build && cd build
```

Download the source code using `wget` or via the browser using **Download as Zip** and extract it.

Verify that the correct versions are installed:

```bash
# At least Node.js v22 and npm v11
node --version
npm --version
```

### 1.2 Configure the logo

Replace the default logo with your organisation's logo:

```
./frontend/public/assets/images/logo.png
```

Replace `logo.png` with your own file using the same name.

You can also replace the favicon (the small icon shown in the browser tab):

```
./frontend/public/favicon.ico
```

Replace `favicon.ico` with your organisation's own icon.

### 1.3 Configure the portal root file

The portal's main JSON file is named `MauPortal.json` by default. If you want to use a different name, change the value of `root-file` in:

```
./backend/config/default.json
```

### 1.4 Install dependencies

```bash
npm install
```

If any issues are found, fix them with:

```bash
npm audit fix
```

If a newer version of npm is found, install it explicitly:

```bash
npm install -g npm@latest
```

### 1.5 Create application directory and system user

Before building, create the application directory on the production server:

```bash
sudo mkdir -p /opt/mau/mau-arkiv
```

> **Note:** The default path is `/opt/mau/mau-arkiv`. This can be changed, but the corresponding paths in the configuration must be updated accordingly.

Create a system user without a login shell, for security reasons:

```bash
sudo useradd -m -s /usr/sbin/nologin mau-arkiv
```

This user will manage the pm2 process and run the application. Set the ownership of the application directory:

```bash
sudo chown -R mau-arkiv:mau-arkiv /opt/mau/mau-arkiv
```

### 1.6 Configure local.json

Before building or starting the application, edit the configuration file with your database connection details and AD configuration:

```
/opt/mau/mau-arkiv/config/local.json          # prebuilt
/mauportal/mau-arkiv/backend/config/local.json  # source code
```

> **Important:** The application will not function correctly if this file is not configured before startup.

### 1.7 Build the application

```bash
npm run package
```

When the build is complete, all files will be in the `dist/` subdirectory.

### 1.8 Deploy to the server

If you already have a running version of the application, stop it before copying new files:

```bash
sudo -u mau-arkiv pm2 stop mau-arkiv
```

Copy the contents of `dist/` to the application directory:

```bash
sudo cp -r dist/* /opt/mau/mau-arkiv/
```

### 1.9 Start the application for the first time

On the first deployment, navigate to the application directory and start the application with pm2:

```bash
cd /opt/mau/mau-arkiv

# Start the application
sudo -u mau-arkiv pm2 start /opt/mau/mau-arkiv/app.js --name mau-arkiv

# Save the configuration for future restarts
sudo -u mau-arkiv pm2 save
```

> **Note:** After the first startup the application is registered with pm2. For subsequent deployments, use `sudo -u mau-arkiv pm2 restart mau-arkiv` instead. See step 3 for full pm2 management commands.

---

## 2. Create databases

MauArkiv requires three MS SQL Server databases:

| Database | Purpose |
|---|---|
| `Arkiv_idx` | Production index – the active search index |
| `Arkiv_test` | Test index – for loading and verifying before moving to production |
| `Arkiv_app` | Access database – access logs readable via the portal |

Create the databases (requires `sa` privileges):

```sql
sqlcmd -S server_hostname -U sa -P 'password' -Q "
CREATE DATABASE Arkiv_idx;
CREATE DATABASE Arkiv_test;
CREATE DATABASE Arkiv_app;
"
```

> **Recommendation:** Create a dedicated SQL user, e.g. `mau-archive_systemuser`, with a strong password and grant it read and write access to all three databases.

---

## 3. Managing the application with pm2

```bash
# Restart
sudo -u mau-arkiv pm2 restart mau-arkiv

# Stop
sudo -u mau-arkiv pm2 stop mau-arkiv

# Start
sudo -u mau-arkiv pm2 start mau-arkiv
```

---

## 4. Configure nginx and HTTPS

MauArkiv is designed for nginx as its web server. The default HTTPS port is **443**. A typical URL might look like:

```
https://archive.example-organisation.se
```

### 4.1 SSL certificate and key

Place your certificate and key files in the following locations:

```
/etc/ssl/certs/your-cert.crt
/etc/ssl/keys/your-cert.key
```

### 4.2 nginx configuration file

A sample nginx configuration file named `mau-arkiv` is provided. Place it in:

```
/etc/nginx/sites-available/mau-arkiv
```

Update the file with your domain name and the correct paths to your certificate and key files.

The block below is a minimum nginx configuration to make it work. There is a redirection HTTP to HTTPS and a location record. MauArkiv's application "app.js" is running on port 3000 on localhost, so this configuration tells nginx where to find it.

```
server {
    listen 80;
    server_name arkiv.internal.example.com www.example.com; # Set correct URL
    return 301 https://$host$request_uri;  # Redirect HTTP to HTTPS
}

server {
    listen 443 ssl;
    server_name arkiv.internal.example.com www.example.com;

    ssl_certificate /etc/ssl/certs/<your_cert_file>.crt;
    ssl_certificate_key /etc/ssl/private/<your_key_file>.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/mau-arkiv;
    index index.html index.htm;
location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket & keep-alive
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";

        # Forward client info to Express
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Timeouts (tune as needed)
        proxy_connect_timeout   5s;
        proxy_send_timeout     30s;
        proxy_read_timeout     60s;
    }
}
```

### 4.3 Enable the site

Create a symbolic link to enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/mau-arkiv /etc/nginx/sites-enabled/
```

Test that the configuration is valid:

```bash
sudo nginx -t
```

If the test passes, reload nginx to activate the site:

```bash
sudo systemctl reload nginx
```

> **Also verify that:**
> - The DNS record for your URL points to the nginx server's IP address
> - The SSL certificate has been issued for the correct domain
> - nginx is configured as a reverse proxy towards MauArkiv

---

## 5. Configure the portal

Create the configuration directory:

```bash
sudo mkdir -p /etc/mau/mau-arkiv/config/portal-main/
```

Extract `portal-config.zip` in your home directory and copy the configuration files:

```bash
unzip portal-config.zip
sudo cp -r etc/mau /etc/
```

This places `MauPortal.json` in `/etc/mau/mau-arkiv/config/portal-main/`. If you rename this file, make sure the new name is also set as the value of `root-file` in `default.json` (see step 1.3).

---

## 6. Configure MauPortal.json

Open `MauPortal.json` in `/etc/mau/mau-arkiv/config/portal-main/` and configure the following fields:

| Field | Description |
|---|---|
| `title` | The name/heading of the portal |
| `uid` | Unique ID for the page. Normally does not need to be changed. |
| `privilegeGroups` | Which AD groups should have access. Usually a broad staff group. |
| `description` | Overall description of the archive portal. Adapt to your organisation. |

#### Under `groups`

Edit `title` to a suitable name for your archive structure, e.g. *Business Areas* or *Classification*.

#### Under `import`

Specify the JSON files to be imported. The default example imports 4 business files + 2 system files:

| Type | Purpose |
|---|---|
| Business files | One per business area or other suitable division |
| Test | For testing function and content in ongoing deliveries separately from production |
| Log | For reading access logs via the portal |

---

## 7. MauArkiv configuration — reminder

MauArkiv's configuration is located in `/opt/mau/mau-arkiv/config/` and consists of two files:

| File | Contents |
|---|---|
| `default.json` | Name of the portal's root file, its path, and basic logging configuration |
| `local.json` | Connection information for the three databases and AD configuration for access control |

> **Reminder:** This should already have been done in step 1.6 — but before continuing, verify that both `default.json` and `local.json` contain the correct configuration for your environment.

---

## 8. Configure file storage and rootUri

MauArkiv builds URLs to archive objects as follows:

```
absoluteUri = rootUri + relativeUri
```

Where `rootUri` is specified in the JSON configuration file and `relativeUri` is retrieved from the search index.

Mount your file storage, e.g. a Windows share:

```bash
sudo mount -t cifs '\\fileshares\Arkiv' /mnt/Arkiv -o username=...,password=...
```

> **Tip:** For a permanent mount, add the entry to `/etc/fstab`.

Create the directory structure on the file storage:

```
\\fileshares\Arkiv\
  ├── PROD\
  └── TEST\
```

Extract the included test files `002.zip` into the `TEST` directory.

---

## 9. Add database tables

### Access log table (Arkiv_app)

```bash
sqlcmd -S targetserver -d Arkiv_app -U myuser -P mypassword -i AuditLog.sql
```

### Example index (Arkiv_test)

```bash
# Create the table
sqlcmd -S targetserver -d Arkiv_test -U myuser -P mypassword -i TestIndex.sql

# Populate the table with data
bcp Arkiv_test.dbo.TestIndex in TestIndex.bcp -n -S targetserver -U myuser -P mypassword
```

---

## 10. Verification

Verify that the following works via the portal:

- [ ] Searches under **example1** return results
- [ ] Searches under **test** work correctly
- [ ] Access logs are recorded in Arkiv_app

**Done!** If verification passes, the installation is complete and the portal is ready to use.
