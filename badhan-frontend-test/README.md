## Welcome to Our E2E UI testing Repository
We present our end to end UI testing code. To run the code, follow the instructions written below:
* Clone the repository
* Run `npm i`
* Get the `env.testing` file from our Super Admin and put it in `env` folder
* Change the line
`import env from '../../env/env.development'` of `/cypress/plugins/env.js` to `import env from '../../env/env.testing'`
* Run `npm run cypress:open`

A video demonstration can be found in the following link:

https://www.youtube.com/watch?v=ucAffOi29vs
