# Developers Involved

- [Mir Mahathir Mohammad](https://github.com/mirmahathir1)
- [Sumaiya Azad](https://github.com/sumaiyaazad)
- [Md. Al Amin Ifti](https://github.com/iftialmin10)

# badhan-backend-test

`badhan-backend-test` contains the automated API testing script written using Node.JS. The API being tested is currently the active backend for Badhan, BUET Zone Android app (https://play.google.com/store/apps/details?id=com.mmmbadhan) and Website (https://badhan-buet.web.app)

## Local setup

- Follow the instructions of [this readme](../README.md)
- Open a new bash/zsh terminal with `badhan-backend-test` folder as the working directory.

## To run all tests

- Run `bash start`
  The following output should be there:

```
Test Suites: 1 skipped, 47 passed, 47 of 48 total
Tests:       1 skipped, 75 passed, 76 total
Snapshots:   0 total
Time:        31.223 s, estimated 34 s
Ran all test suites.
```

There should not be any failed test.

## To run only a single test file

- `bash start <path to the test file>`.

Example: `bash start ./users/signIn/success.test.js`
The following output should be shown.

```
 PASS  tests/users/signIn/success.test.js
  √ POST/users/signIn: success (141 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        3.616 s
Ran all test suites matching /.\\users\\signIn\\success.test.js/i
```
