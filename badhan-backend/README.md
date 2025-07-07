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
badhan-backend is a REST API consisting of route endpoints that end up adding, editing, getting and deleting data from a MongoDB database and sends responses as JSON to a web client. The list of route names can be found [here](http://badhan-doc.herokuapp.com/). These routes can be accessed by curl. For example, type the following command on a terminal of your PC to test whether the backend is active:

`curl https://badhan-buet.uc.r.appspot.com`

Result: `{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: production"}`

# Deployment
The code consists of two deployments: the production deployment and the test deployment. The databases of these deployments are separate. The testing deployment is used for testing purposes without hampering the production database and deployment. You can check whether these deployments are active using the following commands:

Production Deployment: `curl https://badhan-buet.uc.r.appspot.com`

Response: `{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: production"}`

Testing Deployment: `curl https://badhan-buet-test.uc.r.appspot.com`

Response: `{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: development"}`

# Procedure for Local Setup (with Docker)
* Install [Docker](https://docs.docker.com/engine/install/).
* Clone this repository:
`git clone https://github.com/Badhan-BUET-Zone/badhan`.
* `cd badhan/badhan-backend`
* Run `bin/install` from inside the cloned repo.
* Get `.env.development` from [me](https://github.com/mirmahathir1) and put the file in the cloned repository.
* Run `bin/up` to start the server.
* Run `curl http://localhost:3000` in another terminal. You should see the response: `{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: development"}`

# Procedure for Local Setup (without Docker)
* Clone this repository:
`git clone https://github.com/Badhan-BUET-Zone/badhan`.
* `cd badhan/badhan-backend`
* Run `npm i`.
* Get `.env.development` from [me](https://github.com/mirmahathir1) and put the file in the cloned repository.
* Run `npm run serve`
* Run `curl http://localhost:3000` in another terminal. You should see the response: `{"status":"OK","statusCode":200,"message":"Badhan API is online. environment: development"}`

# Production Server Deployment Procedure
* Clone this repository:
`git clone https://github.com/Badhan-BUET-Zone/badhan`.
* `cd badhan/badhan-backend`
* 

That's it. The badhan-backend is now running in your local machine.
