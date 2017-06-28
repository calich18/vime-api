const express = require('express');
const bodyParser = require('body-parser');
const admin = require("firebase-admin");
const serviceAccount = require('./service-account-key.json');
const twilio = require('./twilio');

const app = express();
app.use(bodyParser.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://landsoftvime-cb063.firebaseio.com"
});

const router = express.Router();

router.post('/accounts/register', async (req, res) => {
  if (!req.body.phoneNumber || !req.body.displayName || !req.body.photoUrl) {
    return res.status(400).send({ error: 'Bad Input' });
  }

  const countryCode = '84';
  const phoneNumber = String(req.body.phoneNumber).replace(/[^\d]/g, '');
  const uid = countryCode + phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber;
  const displayName = String(req.body.displayName).trim();
  const photoURL = String(req.body.photoUrl).trim();

  try {
    const userRecord = await admin.auth().createUser({
      uid, displayName, photoURL
    });
    res.send(userRecord);
  } catch (error) {
    return res.status(500).send({ error });
  }
});

router.post('/accounts/requestOtp', async (req, res) => {
  if (!req.body.phoneNumber) {
    return res.status(400).send({ error: 'You must provide a phone number' });
  }

  const countryCode = '84';
  const phoneNumber = String(req.body.phoneNumber).replace(/[^\d]/g, '');
  const uid = countryCode + phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber;

  try {
    const userRecord = await admin.auth().getUser(uid);
    const code = Math.floor(Math.random() * 8999 + 1000);
    const message = await twilio.messages.create({
      body: 'Your verification code is ' + code,
      to: '+' + uid,
      from: '+12563054478'
    });
    admin.database().ref('users/' + uid)
      .update({ code: code, codeValid: true }, () => {
        res.send({ success: true });
      });
  } catch (error) {
    return res.status(500).send({ error });
  }
});

router.post('/accounts/verifyOtp', async (req, res) => {
  if (!req.body.phoneNumber || !req.body.otpCode) {
    return res.status(400).send({ error: 'Phone number and OTP code must be provided.' });
  }

  const countryCode = '84';
  const phoneNumber = String(req.body.phoneNumber).replace(/[^\d]/g, '');
  const otpCode = parseInt(req.body.otpCode);
  const uid = countryCode + phoneNumber.startsWith("0") ? phoneNumber.substring(1) : phoneNumber;

  try {
    const userRecord = await admin.auth().getUser(uid);
    const ref = admin.database().ref('users/' + uid);
    ref.on('value', async (snapshot) => {
      ref.off();
      const user = snapshot.val();
      if (user.code !== otpCode || !user.codeValid) {
        return res.status(400).send({ error: 'Code not valid.' });
      }
      await ref.update({ codeValid: false });
      const token = await admin.auth().createCustomToken(uid);
      res.send({ token });
    });
  } catch (error) {
    return res.status(500).send({ error });
  }
});

app.use('/api', router);

app.listen(3000);