# badhan-backup
badhan-backup is a command line tool written with Node.JS to backup and restore the development and production databases of Badhan, BUET Zone Android app (https://play.google.com/store/apps/details?id=com.mmmbadhan) and Website (https://badhan-buet.web.app)

`Badhan-Logo` directory contains the python code to generate splash screen images from the base icon for the android app.
### Run the code
* Run `npm i` to install all dependencies.
* Create `config` folder and paste `badhan-buet-2177eeab149f.json` and `config.env` in it (Ask system administrator for these files)

### Available commands:

`node badhan backup  `       Backup the mongodb database to firebase storage

`node badhan list   `        Get the list of backups of mongodb database from
firebase storage

`node badhan delete`         Remove a backup using timestamp

`node badhan restore`        Restore a backup using timestamp

`node badhan prune`          Keep latest maximum 3 backups and delete the remaining
backups

`node badhan restoreLatest`  Restore the last backup to database
