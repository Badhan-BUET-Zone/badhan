# Introduction
badhan-backend folder consists of the code for the main 
backend for the [android app](https://play.google.com/store/apps/details?id=com.mmmbadhan) 
and [website](https://badhan-buet.web.app) of Badhan, BUET Zone. This repository is a part of the [Badhan, BUET Zone Github Organization](https://github.com/Badhan-BUET-Zone). The central documentation of the organization can be found [here](https://github.com/Badhan-BUET-Zone/badhan-doc)
# Developers Involved
* [Mir Mahathir Mohammad](https://github.com/mirmahathir1)
* [Hasan Masum](https://github.com/hmasum52)
* [Sumaiya Azad](https://github.com/sumaiyaazad)
# Technology Stack
* Node.js
* Express
* Typescript
* MongoDB
* Mongoose
# Description
badhan-backend is a REST API consisting of route endpoints that end up adding, editing, getting and deleting data from a MongoDB database and sends responses as JSON to a web client. These routes can be accessed by curl. For example, type the following command on a terminal of your PC to test whether the backend is active:

`curl https://badhan-buet.uc.r.appspot.com`

Expected output:
```
{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: production. Last deployed: 7 July 2025 at 06:23:30 PM"}
```

# Deployment
The code consists of two deployments: the production deployment and the test deployment. The databases of these deployments are separate. The testing deployment is used for testing purposes without hampering the production database and deployment. You can check whether these deployments are active using the following commands:

Production Deployment: `curl https://badhan-buet.uc.r.appspot.com`

Response: 
```
{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: production. Last deployed: 7 July 2025 at 06:23:30 PM"}
```

Testing Deployment: `curl https://badhan-buet-test.uc.r.appspot.com`

Response: 
```
{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: development. Last deployed: 7 July 2025 at 06:23:30 PM"}
```

# Development Server Deployment Procedure from Scratch
## Install Node.js
* Install `nvm` from https://github.com/coreybutler/nvm-windows (If you are on windows) or https://github.com/nvm-sh/nvm (If you are on MacOS/Linux)
* Verify nvm by `nvm --version`.
* `nvm install 22`
* `nvm use 22`

## Setting up the backend
* Clone this repository:
`git clone https://github.com/Badhan-BUET-Zone/badhan`.
* Open VSCode.
* Open a bash terminal (We will refer to it as terminal1).
* `git fetch`
* `git checkout test-branch` 
* Change directory to `badhan-backend`
* Run `npm i`.
* Get `.env.development` from [me](https://github.com/mirmahathir1) and put the file in the cloned repository.
* Run `npm run serve`

## Setting up the backend testing routine
* Open a second terminal window (terminal2)
* Change directory to `badhan-test` folder
* Run `npm i`
* Run `npm run test`
The following output should be there:
```
Test Suites: 1 skipped, 47 passed, 47 of 48 total
Tests:       1 skipped, 75 passed, 76 total
Snapshots:   0 total
Time:        31.223 s, estimated 34 s
Ran all test suites.
```
There should not be any failed test.

* Close terminal2
* Return to terminal1
* Close the server

## Deploying to GCP App Engine
* Install `gcloud` from https://cloud.google.com/sdk/docs/install
* Verify gcloud installation. `gcloud -v`

The output should look something like below:
```
Google Cloud SDK 529.0.0
bq 2.1.19
core 2025.06.27
gcloud-crc32c 1.0.0
gsutil 5.35
```

* `gcloud auth login`
* Get necessary permission from [me](https://github.com/mirmahathir1) to have access to `badhan-buet-test` gcloud project.

* `bash ./upload-gcloud.sh`

Expected output:
```
File upload done.
Updating service [default]...done.
Setting traffic split for service [default]...done.
Deployed service [default] to [https://badhan-buet-test.uc.r.appspot.com]

You can stream logs from the command line by running:
  $ gcloud app logs tail -s default

To view your application in the web browser run:
  $ gcloud app browse
```

* Wait 1 minute
* `curl https://badhan-buet-test.uc.r.appspot.com`.

Expected output:
```
{"status":"OK","statusCode":200,"message":"Badhan backend API is online! environment: development. Last deployed: 7 July 2025 at 06:23:30 PM"}
```
You should see an updated time.
