// @ts-nocheck
/* tslint:disable */
// import dotenv from '../../dotenv'
const dotenv = require('../../dotenv')
const nodemailer = require('nodemailer')
const { google } = require('googleapis')
const emailValidator = require('deep-email-validator')

const CLIENT_ID = dotenv.GMAIL_CLIENT_ID
const CLIENT_SECRET = dotenv.GMAIL_CLIENT_SECRET
const REDIRECT_URI = dotenv.GMAIL_REDIRECT_URI
const REFRESH_TOKEN = dotenv.GMAIL_REFRESH_TOKEN

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

const sendMail = async (emailAddress, subject, html) => {
  // https://www.youtube.com/watch?v=-rcRf7yswfM
  try {
    const accessToken = await oAuth2Client.getAccessToken()
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: 'badhanweb@gmail.com',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken
      }
    })

    const mailOptions = {
      from: '1605011@ugrad.cse.buet.ac.bd',
      to: emailAddress,
      subject: subject,
      text: 'Email from Badhan Admin',
      html: html
    }
    const result = await transport.sendMail(mailOptions)
    return {
      status: 'OK',
      message: 'Email successfully sent',
      emailResult: result
    }
  } catch (error) {
    return {
      status: 'ERROR',
      message: 'Could not send email',
      error: error
    }
  }
}

const checkIfEmailExists = async (email) => {
  const result = await emailValidator.validate(email)
  return result.valid
}

const generatePasswordForgotHTML = (token) => {
  const url = dotenv.VUE_APP_FRONTEND_BASE + '#/passwordReset?token=' + token
  return `
    <p>Password Recovery Email</p>
    <br>
    <p>Click <a href="${url}">here</a> to reset your password</p>
    <br>
    <p>Sincerely Yours,</p>
    <p>Mir Mahathir Mohammad</p>
    <p>Administrator of Badhan Web and App</p>
    `
}

module.exports = {
  sendMail,
  generatePasswordForgotHTML,
  checkIfEmailExists
}
