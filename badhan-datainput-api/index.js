const express = require("express");
require("dotenv").config({ path: "./config/dev.env" });

const {
  initializeApp,
  applicationDefault,
  cert,
} = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");
const app = express();
const port = process.env.PORT || 3000;

initializeApp({
  credential: cert({
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER,
    client_x509_cert_url: process.env.CLIENT_CERT_URL,
  }),
  credential: applicationDefault(),
});

const db = getFirestore();
const Pending = db.collection("Pending Donors");

app.use(express.json());

app.get("/", (req, res) => {
  res.send({
    status: "OK",
    message: "API is active",
  });
});

// app.post("/pendingDonors", async (req, res) => {
//   try {
//     const data = req.body;
//     await Pending.add(data);
//     res.send({
//       status: "OK",
//       message: "New donor has been submitted successfully",
//     });
//   } catch (e) {
//     res.status(400).send({
//       status: "ERROR",
//       message: "(reason of bad request)",
//     });
//   }
// });

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
