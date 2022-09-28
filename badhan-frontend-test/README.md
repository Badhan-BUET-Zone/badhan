# Introduction
badhan-web repository consists of the code for the main
frontend for the [android app](https://play.google.com/store/apps/details?id=com.mmmbadhan)
and [website](https://badhan-buet.web.app) of Badhan, BUET Zone. This repository is a part of the [Badhan, BUET Zone Github Organization](https://github.com/Badhan-BUET-Zone).

# Developers Involved
* [Mir Mahathir Mohammad](https://github.com/mirmahathir1)

# Technology Stack
* Cypress

# Description
Welcome to Our E2E UI testing Repository. We present our end to end UI testing code. The code automatically tests all UI features of our [main frontend](https://github.com/Badhan-BUET-Zone/badhan-web). The E2E testing is implemented using [Cypress](https://www.cypress.io/).

# Features
A video demonstration can be found in the following link:

[![Video demo](https://img.youtube.com/vi/ucAffOi29vs/0.jpg)](https://www.youtube.com/watch?v=ucAffOi29vs)
# Deployment
The code is currently not part of any CI/CD platform. We are hoping to get this code to be part of the CI/CD pipeline of the deployment of the main frontend in future.

# Procedure for Local Setup
* Install [Node.js](https://nodejs.org/en/download/).
* Clone this repository:

  `git clone https://github.com/Badhan-BUET-Zone/badhan-web`
* Run `npm i`
* Get the `env.testing` file from our Super Admin and put it in `env` folder
* Change the line
`import env from '../../env/env.development'` of `/cypress/plugins/env.js` to `import env from '../../env/env.testing'`
* Run `npm run cypress:open`
