const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
var firestore = firebase.firestore();

//! This function is for getting the daily sales totals for each store at the top of every hour and updating the numbers in the database.

exports.dailyStoreSales = functions.pubsub
  .schedule('25 * * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {});
