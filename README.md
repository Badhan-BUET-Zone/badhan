# How to Start Development of Badhan

## Install Node.js
* Install `nvm` from https://github.com/coreybutler/nvm-windows (If you are on windows) or https://github.com/nvm-sh/nvm (If you are on MacOS/Linux)
* Verify nvm by `nvm --version`.
* `nvm install 22`
* `nvm use 22`

## Install All Packages
* Clone this repository.
* Open VSCode
* Open a bash terminal in VSCode.
* Run `bash install`

## Run the Servers
* Run `bash start`

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
* Visit the [Backend Testing Documentation](badhan-backend-test/README.md) and [Frontend Testing Documentation](badhan-frontend-test/README.md).
