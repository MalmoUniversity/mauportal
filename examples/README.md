MAU Arkiv Examples and Configuration

The application it self has 2 configuration files "default.json" and "local.json". Please follow the manual to configure these correctly. In the application directory you will also find the file "AuditLog.sql" that is used to pupulate the log database table with correct structure. Please follow the manual for this step.

In the directory "examples" 3 features are found.

# JSON-configuration of the archive portal
In etc/mau/mau-arkiv/config/portal-main you will find the archive portal's example default configuration. In your Linux system server's /etc place these files.

cd etc
sudo cp -r mau/ /etc #This copies the configuration into it's correct place.

The path "/etc/mau/mau-arkiv/config/portal-main" is the path the application expects to find the archive portal's configuration. Do you want to change the path? It can be done, but be sure to state a new path in the application's file "default.json".

# Sample archive and sample search index
In the directory "002" you will find a sample archive package with XML-files, XML schema, XSL stylesheet and some attachment files. Move or copy this directory within the directory you have stated as a rootUri in one of the search portal JSON-files (example7.json and example8.json).

The 2 files TestIndex.sql and TestIndex.bcp are used to populate the sample search index. "TestIndex.sql" contains the table structure and "TestIndex.bcp" the test data. Please follow the manual for this step.

# JSON or "dirty" JSON?

The JSON-files in the JSON-configuration are true JSON and will validate in a validator such as jq. However especially the SQL query within the JSON-file has a very poor readability. The application therefore supports "dirty JSON" (a.k.a. Python JSON). If you want the file "prettySQL.txt" contains the same SQL query as in example7.json and example8.json and for better readability could be switched inside those two JSON-files. 
