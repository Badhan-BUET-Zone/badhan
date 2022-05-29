const express = require("express");
require("dotenv").config({ path: "./config/dev.env" });
const { body, validationResult } = require("express-validator");

const { authenticationMiddleware } = require("./middlewares/auth");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
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

const pendingDonorCreationValidators = [
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .custom((value) => String(value))
    .escape()
    .trim()
    .withMessage("Name must be string")
    .isLength({ min: 3 })
    .withMessage("Name length must be at least 3 characters"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .customSanitizer((value) => String(value))
    .escape()
    .trim()
    .isLength({ min: 13, max: 13 })
    .withMessage("Phone number must be of 13 digits")
    .custom((value) => [880].includes(parseInt(value.substr(0, 3))))
    .withMessage("First three digits must be 880")
    .isInt()
    .withMessage("Phone number must be integer"),
  body("studentId")
    .notEmpty()
    .withMessage("studentId is required")
    .customSanitizer((value) => String(value))
    .escape()
    .trim()
    .isLength({ min: 7, max: 7 })
    .withMessage("studentId must be of 7 digits")
    .custom((value) =>
      [0, 1, 2, 4, 5, 6, 8, 10, 11, 12, 15, 16, 18].includes(
        parseInt(value.substr(2, 2))
      )
    )
    .withMessage("Please input a valid department number")
    .custom((value) => {
      const inputYear = parseInt("20" + value.substr(0, 2));
      return inputYear <= new Date().getFullYear() && inputYear >= 2001;
    })
    .withMessage(
      "Please input a valid batch between 01 and last two digits of current year"
    )
    .isInt()
    .withMessage("studentId must be integer"),
  body("bloodGroup")
    .notEmpty()
    .withMessage("bloodGroup is required")
    .isInt()
    .toInt()
    .withMessage("bloodGroup must be integer")
    .isIn([0, 1, 2, 3, 4, 5, 6, 7])
    .withMessage("Please input valid blood group from 0 to 7"),
  body("hall")
    .notEmpty()
    .withMessage("Hall is required")
    .isInt()
    .toInt()
    .withMessage("Hall must be integer")
    .isIn([0, 1, 2, 3, 4, 5, 6])
    .withMessage("Please input an allowed hall number from 0 to 6"),
  body("roomNumber")
    .notEmpty()
    .withMessage("Room Number is required")
    .isString()
    .withMessage("Room number must be string"),
  body("address")
    .notEmpty()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be string"),
  body("comment")
    .notEmpty()
    .withMessage("Comment is required. Write N/A if not applicable.")
    .isString()
    .withMessage("Comment must be string"),
  body("donationCount")
    .notEmpty()
    .withMessage("Donation Count is required")
    .isInt()
    .toInt()
    .withMessage("Donation Count must be an integer")
    .custom((value) => value <= 99 && value >= 0)
    .withMessage("Max extra donation count must be between 0 and 99"),
  body("lastDonation")
    .notEmpty()
    .withMessage("Last Donation is required")
    .isInt()
    .toInt()
    .withMessage("Last Donation must be Integer")
    .custom((value) => {
      var x = new Date("January 01, 2000 00:00:00").getTime();
      var y = new Date("December 31, 2200 00:00:00").getTime();
      return value >= x && value <= y;
    })
    .withMessage("Last Donation timestamp must be between year 2000 and 2200"),
];

app.post("/pendingDonors", pendingDonorCreationValidators, async (req, res) => {
  const errors2 = validationResult(req);
  const err = errors2.errors;
  if (!errors2.isEmpty()) {
    return res.status(400).send({
      status: "ERROR",
      message: err[0].msg,
      errors: errors2.array(),
    });
  }

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

app.get("/pendingDonors", authenticationMiddleware, async (req, res) => {
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

app.delete("/pendingDonors/:id", authenticationMiddleware, async (req, res) => {
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

app.use((req, res, next)=>{
  res.status(404).json({
    status: "ERROR",
    messege: "Invalid url"
  })
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
