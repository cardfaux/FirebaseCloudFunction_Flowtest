const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
//firebase.initializeApp();
var firestore = firebase.firestore();

const expressApp = express();
const checkDatabaseToken = async function (req, res, next) {
  const tokenQuerySnapshot = firestore.collection('access_token');
  const selectedToken = (await tokenQuerySnapshot.doc('OpLObUEkHj1VHbZWShpZ').get()).data().token;

  const checkTokenResponse = await fetch(`${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${selectedToken}`,
    },
  });

  const responseData = await checkTokenResponse.json();
  if (responseData.httpCode === '401') {
    try {
      const updateTokenResponse = await fetch('https://cloud.lightspeedapp.com/oauth/access_token.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          refresh_token: process.env.REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      });
      const updateTokenData = await updateTokenResponse.json();
      const newUpdatedToken = updateTokenData.access_token;
      const tokenQuerySnapshot = firestore.collection('access_token');
      const selectedToken = await tokenQuerySnapshot.doc('OpLObUEkHj1VHbZWShpZ').get();
      const updateIsComplete = await selectedToken.ref.update({ token: newUpdatedToken }).then(() => {
        console.log('updateIsCompleteInTheThenBlock');
        return next();
      });
    } catch (error) {
      console.log('ERROR FROM THE UPDATE TOKEN BLOCK', error);
    }
  } else if (responseData.Sale) {
    console.log('THE ACCESS TOKEN IS STILL VALID');
    return next();
  } else {
    console.log('ERROR FROM THE CHECK TOKEN BLOCK', responseData);
  }
  // console.log('THE ACCESS TOKEN IS STILL VALID');
  // return next();
};
expressApp.use(checkDatabaseToken);
expressApp.use(cors({ origin: true }));

expressApp.get('/month-to-date', async (request, response) => {
  try {
    const tokenQuerySnapshot = firestore.collection('access_token');
    const selectedToken = (await tokenQuerySnapshot.doc('OpLObUEkHj1VHbZWShpZ').get()).data().token;
    const monthToDateSalesResponse = await fetch(
      `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json?timeStamp=%3E%3C,2023-04-01T09:00:00-0400,2023-04-03T16:00:00-0400&employeeID=462&sort=-timeStamp&load_relations=all`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${selectedToken}`,
        },
      }
    );
    console.log('IN THE /month-to-date BLOCK AFTER THE MIDDLEWARE', selectedToken);
    const monthToMonthRawSalesData = await monthToDateSalesResponse.json();
    response.send(monthToMonthRawSalesData);
  } catch (error) {
    console.log('ERROR FROM THE EXPRESS APP', error);
  }
});
//* Exporting the function to be called by the client.
exports.monthToDateSales = functions.https.onRequest(expressApp);
