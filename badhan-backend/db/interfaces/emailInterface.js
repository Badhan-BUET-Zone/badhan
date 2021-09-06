const nodemailer = require('nodemailer');
const {google} = require('googleapis');
const emailValidator = require('deep-email-validator');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({refresh_token: REFRESH_TOKEN});

const sendMail = async(emailAddress,subject,html)=>{
    //https://www.youtube.com/watch?v=-rcRf7yswfM
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: '1605011@ugrad.cse.buet.ac.bd',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            }
        });

        const mailOptions = {
            from: 'BadhanAdmin<1605011@ugrad.cse.buet.ac.bd>',
            to: emailAddress,
            subject: subject,
            text: "Email from Badhan Admin",
            html: html,
        }
        let result = await transport.sendMail(mailOptions);
        return {
            status: "OK",
            message: "Email successfully sent",
            emailResult: result,
        };
    }catch (error) {
        return {
            status: "ERROR",
            message: "Could not send email",
            error: error
        };
    }
}

const checkIfEmailExists = async(email)=>{
    let result = await emailValidator.validate(email);
    return result.valid;
}

const generatePasswordForgotHTML = (token)=>{
    let url = process.env.VUE_APP_FRONTEND_BASE+ '#/passwordReset?token=' + token;
    return `
    <h1>Password Recovery Email</h1>
    <p>Click <a href="${url}">here</a> to reset your password</p>
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
