# badhan-backup
badhan-backup is a command line tool written with Node.JS to backup and restore the development and production databases of Badhan, BUET Zone Android app (https://play.google.com/store/apps/details?id=com.mmmbadhan) and Website (https://badhan-buet.web.app)

`Badhan-Logo` directory contains the python code to generate splash screen images from the base icon for the android app.
### Run the code
* Install Docker.
* Run `bin/install`
* Create `config` folder and paste `badhan-buet-2177eeab149f.json` and `config.env` in it (Ask system administrator for these files)
* Run `bin/up list` to get the list of all backups. You may also try the other commands listed below.

### Available commands:

`bin/up backup  `       Backup the mongodb database to firebase storage

`bin/up list   `        Get the list of backups of mongodb database from
firebase storage

`bin/up delete`         Remove a backup using timestamp

`bin/up restore`        Restore a backup using timestamp

`bin/up prune`          Keep latest maximum 3 backups and delete the remaining
backups

`bin/up restoreLatest`  Restore the last backup to database
