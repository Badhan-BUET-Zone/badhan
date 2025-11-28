<div align="center">
  <img width="150" height="150" src="https://avatars.githubusercontent.com/u/97539569?s=400&u=f1ac0cacd5472ad3c020c7bff11c13727c3861d6&v=4"/>
  <h1>Badhan, BUET Zone</h1>
</div>
<a name="tableofcontent"/>

# Table of Contents

[Introduction](#introduction)

[Important Links](#links)  

[Contributors](#contributors)    

[History](#history)

[Repositories](#repositories)
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
* Ensure that you have [node.js](https://nodejs.org/en/download) version >= 22.
* Install [Visual Studio Code](https://code.visualstudio.com/download).
* Install [git](https://git-scm.com/downloads).

## Run the Code

* Clone this repository.
* Open VSCode
* Open a terminal in VSCode.
* Run `node start`

The following output will make sure that the database, backend and frontend is running without any error

```
[03]  DONE  Compiled successfully in 214ms16:58:10
[03] 
[03]
[03]   App running at:
[03]   - Local:   http://localhost:8080/
[03]   - Network: unavailable
[03]
[03] No issues found.
```

* Visit http://localhost:8080 to start navigating the UI

# Run Backend and Frontend Tests
* Open a second terminal with `badhan-backend-test` as the working directory.
* Run `node start`. 
```
Test Suites: 46 passed, 46 total
Tests:       73 passed, 73 total
Snapshots:   0 total
Time:        3.818 s, estimated 4 s
Ran all test suites.
```

* Make `badhan-frontend-test` the working directory.
* Run `node start`. The following output should occur:
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

# Backend Server API Documentation

We provide the documentation of all endpoints of our `badhan-backend` API. Visit https://badhan-buet-test.uc.r.appspot.com/docs/ to see and use the API endpoints directly. Visit this [video](https://youtu.be/vHnDgW04c1w) for instructions on using the API.

<img width="1799" height="928" alt="image" src="https://github.com/user-attachments/assets/33501a52-c932-4202-af77-82fd179a632e" />

# Video Trailer of App
Click to see video

[![Video Title](https://img.youtube.com/vi/cB0ci0pjCY8/0.jpg)](https://www.youtube.com/watch?v=cB0ci0pjCY8)

# Screenshots

<img width="1491" height="875" alt="image" src="https://github.com/user-attachments/assets/255c0120-4c0f-41ee-8f03-8147aef023b3" />
<img width="1579" height="875" alt="image" src="https://github.com/user-attachments/assets/e86235b5-4ad6-4984-9645-120c57c614b2" />


# Website
https://badhan-buet.web.app/#/

# App
https://play.google.com/store/apps/details?id=com.mmmbadhan
