# badhan-test
`badhan-test` contains the automated API testing script written using Node.JS. The API being tested is currently the active backend for Badhan, BUET Zone Android app (https://play.google.com/store/apps/details?id=com.mmmbadhan) and Website (https://badhan-buet.web.app)

### Run the tests
* Create `config` directory and paste `config.js` inside it (Get the `config.js` file from the system administrators)
* Install Docker.
* Run `bin/install`
* Run `bin/up` to run all tests at once in series
* Or, run `bin/run npm run test $$specific_test$$` to run any specific test. (e.g. `bin/run npm run test /tests/users/signIn/success.test.js`)
