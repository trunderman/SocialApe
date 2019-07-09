const admin = require('firebase-admin')
var serviceAccount = require("../serviceAccountKey");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialape1.firebaseio.com"
  });

  const db = admin.firestore();

  module.exports = {admin, db}