<div align="center">
  <img width="150" height="150" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/logo.png"/>
  <h1>Badhan, BUET Zone</h1>
</div>
<a name="tableofcontent"/>

# Table of Contents

[Introduction](#introduction)

[Important Links](#links)  

[Contributors](#contributors)    

[History](#history)
<hr>

<a name="introduction"/>

# Introduction

[Go back to table of content](#tableofcontent)

Badhan, BUET Zone Github organization is our collection of repositories for maintaining the codebase of the Badhan, BUET Zone android app and website. The members of Badhan of BUET Zone use this app regularly to search for blood donations and to keep track of the records of donors and donations. This initiative took place on January 2020 when we gathered around our top developers from BUET and formed to create this platform. This document contains links, contributors, history and repositories of Badhan, BUET Zone app.
<hr>

<a name="links"/>

# Important Links

[Go back to table of content](#tableofcontent)

**Main Repository** : https://github.com/Badhan-BUET-Zone/badhan

**Website** : https://badhan-buet.web.app

**App Link** : https://play.google.com/store/apps/details?id=com.mmmbadhan

**Developers** : https://badhan-buet.web.app/#/credits

**Organization github** : https://github.com/Badhan-BUET-Zone

**Figma Prototype** : https://www.figma.com/file/Z1zoTdP4oGoRwQcCz3s2rm/badhan

<hr>

<a name="contributors"/>

# Contributors

[Go back to table of content](#tableofcontent)

Active Developers: Mir Mahathir Mohammad, Md. Al Amin Ifti, Hasan Masum, 

Contributors from Badhan: Mahmudul Rasan Rahat, Tanzid Hasan Shuvo, Mahmud Akon, Md Muqtadir Fuad.

Legacy Developers: Sumaiya Azad, Sanju Basak, Aniruddha GS, Priyeta Saha, Anisha Islam, Atiqur Rahman Shuvo
<hr>

<a name="history"/>

# History of Badhan, BUET Zone

[Go back to table of content](#tableofcontent)

Go to [history of Badhan, BUET Zone](https://github.com/Badhan-BUET-Zone/badhan-web#description)


# How to Start Development of Badhan

## Software Prerequisites
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose).
* Install [Visual Studio Code](https://code.visualstudio.com/download).
* Install [git](https://git-scm.com/downloads).

> Docker is the only supported local development environment. Node, MongoDB, and all
> dependencies run inside containers — you do not need Node or MongoDB installed on your host.

## Run the Code

* Clone this repository.
* Open VSCode and open a terminal in the repository root.
* Run `docker compose up --attach backend --attach internal --attach frontend`

The `--attach` flags stream only the logs you care about; MongoDB still runs and its logs
are still collected (`docker compose logs mongo`), they just stay out of your terminal.
Plain `docker compose up` works too if you want everything.

This starts the whole dev stack — MongoDB, the backend (port 3000), the internal server
(port 4000), and the frontend (port 8080) — with hot reload on source changes. The
following output confirms the frontend compiled and everything is running:

```
frontend-1  |  DONE  Compiled successfully
frontend-1  |
frontend-1  |   App running at:
frontend-1  |   - Local:   http://localhost:8080/
```

* Visit http://localhost:8080 to start navigating the UI.
* Stop the stack with `docker compose down` (add `-v` to also drop the database volume).

The first run seeds no data. To populate the database, see
[Purge and Seed the Database](#purge-and-seed-the-database) below.

# Run Backend and Frontend Tests

Both test suites run as one-off containers under the `test` compose profile. With the
dev stack already running, run the backend (Jest) suite with:

```
docker compose --profile test run --build --rm backend-test
```

Always pass `--build`. The test images bake the test code in at build time, so without it
Compose reuses a stale image and you end up debugging failures that came from old code
rather than from your changes.
```
Test Suites: 46 passed, 46 total
Tests:       73 passed, 73 total
Snapshots:   0 total
Time:        3.818 s, estimated 4 s
Ran all test suites.
```

Run the frontend (Cypress) suite with:

```
docker compose --profile test run --build --rm frontend-test
```

The following output should occur:
```
====================================================================================================

  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped  
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ ✔  activeDonors/activeDonors.js             00:10        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  callRecords/callRecords.js               00:10        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donations/donations.js                   00:13        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/checkDuplicate.js                 00:19        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/designatedDonors.js               00:07        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/donors.js                         00:18        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/editDonor.js                      00:16        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/hallAdmin.js                      00:10        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  donors/search.js                         00:12        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  logs/logs.js                             00:07        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  publicContacts/publicContacts.js         00:11        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  users/logins.js                          00:08        1        1        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  users/passwordChange.js                  00:12        1        1        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    ✔  All specs passed!                        02:39       13       13        -        -        -  
```

That's it. You have done the local setup for developing the app.

# Deploy

Deployment is a manual, run-by-hand step. From the repo root:

```
./deploy
```

This runs both test suites first (backend Jest, then frontend Cypress) and only
deploys if **both** pass — the test gate cannot be skipped. On success it deploys the
backend to Google Cloud (`upload-gcloud.js`) and the frontend to Firebase
(`upload-firebase.js`). Deployment runs on the host, not in a container, so your local
`gcloud` and `firebase` CLI authentication is used.

# Purge and Seed the Database

The internal server (port 4000) exposes endpoints for purging and seeding the local
database. With the stack running, seed the database from the host with:

```
curl -X POST http://localhost:4000/purge-local-db
curl -X POST http://localhost:4000/populate-local-db
```

To perform a full clean — dropping the MongoDB data volume and rebuilding images from
scratch (use `--no-cache` when dependencies must be reinstalled):

```
docker compose down -v
docker compose build --no-cache
docker compose up --attach backend --attach internal --attach frontend
```

Once the stack is back up, re-run the two `curl` commands above to reseed the database.

# Backend Server API Documentation

We provide the documentation of all endpoints of our `badhan-backend` API. Visit https://badhan-buet-test.uc.r.appspot.com/docs/ to see and use the API endpoints directly. Visit this [video](https://youtu.be/vHnDgW04c1w) for instructions on using the API.

<img width="1799" height="928" alt="Backend API documentation" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/api-docs.png" />

# Video Trailer of App
Click to see video

[![Video Title](https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/video-thumbnail.jpg)](https://www.youtube.com/watch?v=cB0ci0pjCY8)

# Screenshots

<img width="1491" height="875" alt="Badhan web app screenshot" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/screenshot-1.png" />
<img width="1579" height="875" alt="Badhan web app screenshot" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/screenshot-2.png" />

**Login** — Sign in by phone and password, with the last six months of donation counts shown on the landing screen.

<img width="280" alt="Login screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/login.png" />

**Donor search** — Filter donors by name, blood group, batch, address, hall and availability.

<img width="280" alt="Donor search filters" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/donor-search-filters.png" />

**Search results** — Matching donors grouped by batch, colour-coded by whether they are eligible to donate yet.

<img width="280" alt="Donor search results grouped by batch" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/donor-search-results.png" />

**Donor quick actions** — Expand any result to see contact details and call the donor or log a donation without leaving the list.

<img width="280" alt="Expanded donor card with quick actions" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/donor-quick-actions.png" />

**Donor profile** — Full donor record with volunteer status, blood and platelet donation history, and per-donor settings.

<img width="280" alt="Donor profile page" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/donor-profile.png" />

**Create donor** — Register a new donor with contact, hall, blood group and donation-count details.

<img width="280" alt="Create donor form" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/create-donor.png" />

**Bulk CSV upload** — Import many donors at once from a CSV, with the accepted column formats documented on the page.

<img width="900" alt="Bulk donor CSV upload screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/csv-donor-upload.png" />

**CSV validation** — Every row is validated before upload, with the offending cells highlighted and the failed rows downloadable as a CSV to fix and retry.

<img width="900" alt="CSV upload showing per-row validation errors" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/csv-upload-errors.png" />

**Duplicate detection** — Donors already in the database are flagged instead of re-created, with a direct link to the existing record.

<img width="900" alt="CSV upload showing already existing donors" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/csv-upload-duplicates.png" />

**Backup and restore** — Super admins can snapshot the database and restore any backup to the local, test or production environment.

<img width="900" alt="Backup and restore screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/main/docs/images/backup-and-restore.png" />

# Website
https://badhan-buet.web.app/#/

# App
https://play.google.com/store/apps/details?id=com.mmmbadhan
