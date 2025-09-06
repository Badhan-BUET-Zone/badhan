# Introduction
badhan-frontend repository consists of the code for the main
frontend for the [android app](https://play.google.com/store/apps/details?id=com.mmmbadhan)
and [website](https://badhan-buet.web.app) of Badhan, BUET Zone. This repository is a part of the [Badhan, BUET Zone Github Organization](https://github.com/Badhan-BUET-Zone).

# Developers Involved
* [Mir Mahathir Mohammad](https://github.com/mirmahathir1)

# Technology Stack
* Cypress

# Description
Welcome to Our E2E UI testing Repository. We present our end to end UI testing code. The code automatically tests all UI features of our [main frontend](https://github.com/Badhan-BUET-Zone/badhan/badhan-frontend). The E2E testing is implemented using [Cypress](https://www.cypress.io/).

# Features
A video demonstration can be found in the following link:

[![Video demo](https://img.youtube.com/vi/ucAffOi29vs/0.jpg)](https://www.youtube.com/watch?v=ucAffOi29vs)

# Procedure for Local Setup
* Follow the procedure of [this readme](../README.md)
* Open a new terminal.
* Change active directory to `badhan-frontend-test`
* Run `bash start` to run all tests. The following output should appear.

```
  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped   
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐ 
  │ ✔  activeDonors/activeDonors.js             00:08        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  callRecords/callRecords.js               00:07        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donations/donations.js                   00:10        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/checkDuplicate.js                 00:16        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/designatedDonors.js               00:04        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/donors.js                         00:15        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/editDonor.js                      00:14        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/hallAdmin.js                      00:08        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  donors/search.js                         00:08        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  logs/logs.js                             00:05        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  publicContacts/publicContacts.js         00:08        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  users/logins.js                          00:05        1        1        -        -        - │ 
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ ✔  users/passwordChange.js                  00:09        1        1        -        -        - │ 
  └────────────────────────────────────────────────────────────────────────────────────────────────┘ 
    ✔  All specs passed!                        02:03       13       13        -        -        - 
```
* Run `bash start users/logins.js` to run single test case. The following output should occur:

```
  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped   
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐ 
  │ ✔  users/logins.js                          00:06        1        1        -        -        - │ 
  └────────────────────────────────────────────────────────────────────────────────────────────────┘ 
    ✔  All specs passed!                        00:06        1        1        -        -        -
```

* Use `--headed` flag to run tests in browser UI.
* Use `--video` flag to save videos of the test runs in `cypress/videos` folder.
