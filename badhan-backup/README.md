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


### Permission Matrix of Routes:

https://docs.google.com/spreadsheets/d/11jBcFWn9-E6lY-l0PFHv5Mc_DyAvjb6po_BYZXtVHRk/edit?usp=sharing

### Steps required for new feature
Steps for the design
* Design new UI in Figma
* Meetings

Steps for the backend:
* Schemas
* Main controller
* Validation and sanitization
* Logging
* Relevant security middlewares
* Rate limiter
* Guest API
* Automated testing for main and guest route
* New openapi documentation
* Testing from openapi documentation

Steps for the frontend:
* Build UI
* Connect UI to backend

Steps for finalization:
* Deploy test site for testing
* Deploy main site and android
