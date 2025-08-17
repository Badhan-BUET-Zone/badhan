# Introduction
badhan-admin-frontend repository consists of the code for the admin console
frontend for the [android app](https://play.google.com/store/apps/details?id=com.mmmbadhan)
and [website](https://badhan-buet.web.app) of Badhan, BUET Zone. This repository is a part of the [Badhan, BUET Zone Github Organization](https://github.com/Badhan-BUET-Zone).

# Developers Involved
* [Mir Mahathir Mohammad](https://github.com/mirmahathir1)

# Technology Stack
* React.js

# Description
Badhan Admin Console Website is an extension of the main Badhan, BUET Zone Android app that manages operations accessible by the Super Admins of this platform. This website consists of two repositories: 
1) Frontend (https://github.com/Badhan-BUET-Zone/badhan-admin-frontend)
2) Backend (https://github.com/Badhan-BUET-Zone/badhan-admin-api)

This website can be visited by any one of the following links:
* Direct Login (https://badhan-admin.web.app/)
* Secure Redirection from app (https://badhan-buet.web.app/#/adminconsole)

This admin console website consists of the functionalities that were once done manually directly on the database. The reasons why I did not implement these features in the main app is because I wanted to keep the code of the main app lean.
And it seemed to me that these admin console features will be accessed once in one or two years and I wanted to keep these less used but highly sensitive features seperate from the active app. This app will also allow me to implement features that are necessary for app management without needing to touch the main app.

# Features
## Version
![image](./doc/version.PNG)
https://badhan-admin.web.app/management/version

- To send notification to the general user of the app if a new version of the app is available in Google Play Store

## Contributors
![image](./doc/contributors.PNG)
https://badhan-admin.web.app/management/contributors

- To manage the list of contributors shown in the Credits page of the app
## Super Admins
![image](./doc/superadmins.PNG)
https://badhan-admin.web.app/management/superadmin

- To add or remove super admins of the platform

## Backup and Restore
![image](./doc/backup.PNG)
https://badhan-admin.web.app/backup-restore

- To backup and restore the MongoDB database of the whole platform

# Deployment
The admin console is deployed in [Firebase](https://firebase.google.com). The deployment can be found at [https://badhan-admin.web.app](https://badhan-admin.web.app)

# Procedure for Local Setup
* Install [Node.js](https://nodejs.org/en/download/).
* Clone this repository:

  `git clone https://github.com/Badhan-BUET-Zone/badhan-admin-frontend`
* Run `npm i` from inside the cloned repo.
* Run `npm run start`
* Visit `https://localhost:8080`.

## Setup Backup and Restore
The Backup-and-Restore page is a UI for the API implemented in [this repository](https://github.com/Badhan-BUET-Zone/badhan-backup). 
However, this API has not been deployed to a live server and thus, you will need to 
follow through the instructions written below in order to run the API locally in your
machine.
1) Install Node.js on your machine
2) Clone [this repository](https://github.com/Badhan-BUET-Zone/badhan-backup). To do this, run `git clone https://github.com/Badhan-BUET-Zone/badhan-backup`
3) Enter into the directory and install all dependencies. Run `cd badhan-backup` and `npm i`
4) Download the contents of [this link](https://drive.google.com/drive/folders/13SFt1fY0XPAe9p1xkWN2gCLQzvbHx0y7?usp=sharing) and put these files inside the `bin` folder of the cloned repo.
5) Get `badhan-buet-1d20b088a755.json` and `config.env` files from me (mirmahathir1@gmail.com). Paste them inside the `config` folder of the cloned repository.

Now, for every time you want to visit the backup-and-restore page, follow the instructions written below:
1) Run `npm start` inside the repo.
2) Go to https://badhan-admin.web.app/backup-restore

You should now see the Backup-and-Restore page
