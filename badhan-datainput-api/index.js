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

app.post("/pendingDonors", async (req, res) => {
  try {
    const data = req.body;
    await Pending.add(data);
    res.status(201).send({
      status: "OK",
      message: "New donor has been submitted successfully",
    });
  } catch (e) {
    return res.status(500).send({
      status: "ERROR",
      message: "Internal server error",
      reason: e,
    });
  }
});

app.get("/pendingDonors", async (req, res) => {
  try {
    const pending = db.collection("Pending Donors");
    const pendingArrays = [];
    const snapshot = await pending.get();
    snapshot.forEach((doc) => {
      const pendingDonor = {
        id: doc.id,
        name: doc.data().name,
        phone: doc.data().phone,
        studentId: doc.data().studentId,
        bloodGroup: doc.data().bloodGroup,
        hall: doc.data().hall,
        roomNumber: doc.data().roomNumber,
        address: doc.data().address,
        comment: doc.data().comment,
        donationCount: doc.data().donationCount,
        lastDonation: doc.data().lastDonation,
      };
      pendingArrays.push(pendingDonor);
    });
    return res.send({
      status: "OK",
      message: "Pending donors fetched successfully",
      pendingDonors: pendingArrays,
    });
  } catch (e) {
    return res.status(500).send({
      status: "ERROR",
      message: "Internal server error",
      reason: e,
    });
  }
});

app.delete("/pendingDonors/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await Pending.doc(id).get();
    if (!snapshot.exists) {
      return res.status(404).send({
        status: "ERROR",
        message: "Donor Id not found",
      });
    } else {
      var deleteDonor = snapshot.data();
      deleteDonor.id = id;
      await Pending.doc(id).delete();
      return res.send({
        status: "OK",
        message: "Pending donor deleted successfully",
        pendingDonor: deleteDonor,
      });
    }
  } catch (e) {
    return res.status(500).send({
      status: "ERROR",
      message: "Internal server error",
      reason: e,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
