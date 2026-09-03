<div align="center">
  <img width="150" height="150" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/logo.png"/>
  <h1>Badhan, BUET Zone</h1>
</div>
<a name="ai-integration-update"/>

# Update of 3 September 2026: AI Integration

Badhan now connects to **Claude** as an MCP server, so a member can ask for what they need in
plain English — *"find me someone from Titumir hall who can donate A+ blood"* — and Claude
searches the donor records, reads call history and logs donations through named actions, asking
first before anything that changes a record. Super admins set it up from the **AI Integration**
page; the walkthrough is in
[the manual](https://github.com/Badhan-BUET-Zone/badhan/blob/production/docs/manual/16-super-admin-tools.md#ai-integration).

<img width="600" alt="Claude answering donor questions through the Badhan MCP server" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/d766d029/docs/images/ai-integration.jpeg" />

<hr>

<a name="backup-restore-update"/>

# Update of 16 August 2025: Backup and Restore

Super admins can snapshot the whole record book and put it back. **Create New Backup** takes a
copy as it stands, **Trim Backups** clears out old ones, and every saved snapshot can be restored
into the local, development or production database — the last of which replaces the live records
outright. The two **Reset** buttons wipe the local or development database down to practice data,
and **Copy to Local DB** pulls the live records onto a developer's machine. The rules and the
warnings are in
[the manual](https://github.com/Badhan-BUET-Zone/badhan/blob/production/docs/manual/16-super-admin-tools.md#backup--restore).

<img width="700" alt="Backup and Restore panel showing snapshots with their restore targets" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/d766d029/docs/images/backup-and-restore-panel.png" />

<hr>

<a name="one-codebase-update"/>

# Update of 11 February 2023: One Codebase, Web and Android

The app on Google Play is the website. Bubblewrap wraps the same Vue frontend as a Trusted Web
Activity — an Android shell whose only job is to open `badhan-buet.web.app` full screen, with no
address bar, proved to belong to us by a `.well-known/assetlinks.json` the site serves. So there
is no second codebase and no Android port to keep in step: a screen written once appears on both,
and shipping the web app ships the phone app with it.

<hr>

<a name="e2e-tests-update"/>

# Update of 26 March 2022: End-to-End Tests

Every screen in the app is exercised by a Cypress suite that drives a real browser against a real
backend and database — no mocks. It began with a single sign-in test and now stands at **49 specs
and 164 tests**, running in about thirteen minutes, and it is the gate every deploy has to
pass. The opening 2:51 of a run — eleven of those specs, at the speed they really go:



https://github.com/user-attachments/assets/69410526-b020-46c2-b63f-a4a80bcef950



<hr>

<a name="tableofcontent"/>

# Table of Contents

[Update of 3 September 2026: AI Integration](#ai-integration-update)

[Update of 16 August 2025: Backup and Restore](#backup-restore-update)

[Update of 11 February 2023: One Codebase, Web and Android](#one-codebase-update)

[Update of 26 March 2022: End-to-End Tests](#e2e-tests-update)

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

### Recording the run

Cypress writes one video per spec and cannot record a run as a whole, so to watch the
suite end to end there is a script that turns video on and then stitches the clips
together:

```
docker compose --profile test run --build --rm frontend-test npm run cypress:video
```

It leaves `badhan-frontend-test/cypress/videos/full-run.mp4` — every spec in the order it
ran — beside `full-run.txt`, which lists the timestamp each spec starts at. The per-spec
clips stay where Cypress put them. Anything after `--` goes on to `cypress run`, so
`... npm run cypress:video -- --spec 'cypress/e2e/auth/**'` records just that slice.

Recording costs a couple of minutes on top of an already slow suite, so it is a
deliberate step rather than something the ordinary run does.

That's it. You have done the local setup for developing the app.

# Deploy

Deployment is a manual, run-by-hand step. From the repo root:

```
./deploy.js
```

**Budget about 15 minutes.** It is not a command you fire off and watch finish — start it
knowing you will not be deploying again for a quarter of an hour.

## Branches and environments

There are three environments — `production`, `development` and `local` — and two of them
are deployable. **The git branch name *is* the environment name**, and the map between
them lives in exactly one place: [`environments.js`](environments.js) at the repo root,
which both upload scripts require.

Written in full, lower case, everywhere: branch names, npm scripts, file names, env vars,
query parameters, UI labels, docs. No `prod`, no `dev`, no `test`, no `staging`, and no
cloud-project id standing in for an environment name.

| | `production` | `development` | `local` |
| --- | --- | --- | --- |
| Git branch | `production` | `development` | — (any branch, never deployed) |
| Backend `NODE_ENV` | `production` | `development` | `local` |
| Backend env file | `env.production` | `env.development` | `env.local` |
| App Engine config | `app.production.yaml` | `app.development.yaml` | — |
| GCP project | `badhan-buet` | `badhan-buet-test` | — (mongo container) |
| Backend base URL | https://badhan-buet.uc.r.appspot.com | https://badhan-buet-test.uc.r.appspot.com | http://localhost:3000 |
| Frontend mode / env file | `production` / `.env.production` | `development` / `.env.development` | `local` / `.env.local` |
| Frontend build script | `build:production` | `build:development` | `build:local` |
| `VUE_APP_ENVIRONMENT` | `production` | `development` | `local` |
| Firebase config | `firebase.production.json` | `firebase.development.json` | — |
| Firebase project / site | `badhan-buet` / `badhan-buet` | `badhan-buet-test` / `badhan-buet-test-46eca` | — |
| Frontend URL | https://badhan-buet.web.app | https://badhan-buet-test-46eca.web.app | http://localhost:8080 |
| Service worker | registers | registers | **never** |
| PWA name | `Badhan` | `Badhan (development)` | — |
| Android TWA | this one, only | — | — |
| Watermark | hidden | shown | shown |
| Backup restore target | `?environment=production` (refused) | `?environment=development` | `?environment=local` |

`local` is not a deploy target: it has no cloud project, no App Engine config, no Firebase
site and no branch of its own. That is the one structural asymmetry — the model is "two
deployment environments plus a local one" rather than three peers.

The Play Store app wraps **production only**, from any branch; there is no `development`
Android build. See [badhan-android/README.md](badhan-android/README.md).

**Any branch other than those two refuses to deploy**, in the preflight, before the test
suites run:

```
❌  Deployment requirements not met:
   • branch "mahathir/#72/platelet-count" has no deploy target.
     Deployable branches: production, development.
```

There is no override flag and no confirmation prompt. To try a feature branch on the
development site, merge it to `development` and deploy from there. This is deliberate:
until this was enforced, *every* branch that was not `main` deployed to the shared
development environment without saying so.

This runs both test suites first (backend Jest, then frontend Cypress) and only
deploys if **both** pass — the test gate cannot be skipped. On success it deploys the
backend to Google Cloud (`upload-gcloud.js`) and the frontend to Firebase
(`upload-firebase.js`). `deploy` is a Node script that requires those two in-process;
it uses only the standard library, so there is nothing to install for it.

Where the ~15 minutes goes, measured across four consecutive deploys (two to
`development`, two to `production`, all within 14m 49s – 15m 48s):

| Step | Roughly |
| --- | --- |
| Frontend Cypress suite | 9m 30s |
| Backend Jest suite | 1m 10s |
| Frontend production build | 30s |
| Backend to App Engine, frontend to Firebase | the remainder |

So two thirds of a deploy is the test gate, and almost all of that is Cypress. The gate is
the point and it is not skippable, but it does mean the cost of a deploy is fixed no matter
how small the change: a one-word fix to the manual pays the same 15 minutes as a new page.
Batch what you can into one deploy rather than deploying twice.

A failing gate does not cost the full time — it stops at the first suite that fails, and
nothing is uploaded. Backend runs first, so a backend failure is known inside two minutes.

## First-time deploy setup

`gcloud` and `firebase` are **not** installed on the host. Each ships with the app it
deploys, as the `deploy` stage of that app's Dockerfile: gcloud in `backend-deploy`,
firebase in `frontend-deploy`. Both stages sit on top of the images the dev stack already
builds, and neither is built by `docker compose up`. Log in once:

```
./deploy.js --login
```

Each CLI prints a URL; open it in any browser, approve, and paste the code back. The
credentials are stored in `.deploy-auth/` at the repo root (gitignored), which is an
ordinary host directory, so they survive `docker compose down -v`, image rebuilds, and
everything else. Use `./deploy.js --relogin` when a token has expired or you need to switch
accounts — plain re-login answers *"Already logged in"* and won't refresh it.

The preflight that runs before the test suites checks more than "a token refreshes": it
confirms the logged-in account can actually reach the project this branch deploys to (see
the table above), so being logged in as the wrong Google account fails in seconds rather
than after both test suites. It also prints the resolved target before anything else runs:

```
🌍  Branch "production" → environment production (badhan-buet).
```

## Supported host platforms

**macOS and Linux.** Windows is supported through **WSL2 only** — clone the repo inside
the WSL2 filesystem (`~/…`), not under `/mnt/c`, or you get both terrible bind-mount
performance and the file-locking edge cases that the credential store is sensitive to.
Native Git Bash / mintty is not supported.

The only host prerequisites are **Docker, git, and Node** — Node purely to run the
deploy orchestration scripts, which import nothing outside its standard library. The
app's own Node, the deploy CLIs, and the Android toolchain all live in containers.

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

<img width="1799" height="928" alt="Backend API documentation" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/api-docs.png" />

# Video Trailer of App
Click to see video

[![Video Title](https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/video-thumbnail.jpg)](https://www.youtube.com/watch?v=cB0ci0pjCY8)

# Screenshots

<img width="1491" height="875" alt="Badhan web app screenshot" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/screenshot-1.png" />
<img width="1579" height="875" alt="Badhan web app screenshot" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/screenshot-2.png" />

**Login** — Sign in by phone and password, with the last six months of donation counts shown on the landing screen.

<img width="280" alt="Login screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/login.png" />

**Donor search** — Filter donors by name, blood group, batch, address, hall and availability.

<img width="280" alt="Donor search filters" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/donor-search-filters.png" />

**Search results** — Matching donors grouped by batch, colour-coded by whether they are eligible to donate yet.

<img width="280" alt="Donor search results grouped by batch" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/donor-search-results.png" />

**Donor quick actions** — Expand any result to see contact details and call the donor or log a donation without leaving the list.

<img width="280" alt="Expanded donor card with quick actions" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/donor-quick-actions.png" />

**Donor profile** — Full donor record with volunteer status, blood and platelet donation history, and per-donor settings.

<img width="280" alt="Donor profile page" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/donor-profile.png" />

**Create donor** — Register a new donor with contact, hall, blood group and donation-count details.

<img width="280" alt="Create donor form" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/create-donor.png" />

**Bulk CSV upload** — Import many donors at once from a CSV, with the accepted column formats documented on the page.

<img width="900" alt="Bulk donor CSV upload screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/csv-donor-upload.png" />

**CSV validation** — Every row is validated before upload, with the offending cells highlighted and the failed rows downloadable as a CSV to fix and retry.

<img width="900" alt="CSV upload showing per-row validation errors" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/csv-upload-errors.png" />

**Duplicate detection** — Donors already in the database are flagged instead of re-created, with a direct link to the existing record.

<img width="900" alt="CSV upload showing already existing donors" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/csv-upload-duplicates.png" />

**Backup and restore** — Super admins can snapshot the database and restore any backup to the local, development or production environment.

<img width="900" alt="Backup and restore screen" src="https://raw.githubusercontent.com/Badhan-BUET-Zone/badhan/production/docs/images/backup-and-restore.png" />

# Website
https://badhan-buet.web.app/#/

# App
https://play.google.com/store/apps/details?id=com.mmmbadhan
