const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
firebase.initializeApp();
var firestore = firebase.firestore();
//const { fetch } = require('node-fetch');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  let n = new Date();
  let onlyDateCurrent = moment(n.toISOString()).tz('America/New_York').format('YYYY-MM-DD');

  const res = await fetch(
    `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json?timeStamp=%3E,${onlyDateCurrent}T00:00:00-0400&employeeID=${employee_id}&sort=-timeStamp&load_relations=all`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.query.token}`,
      },
    }
  );

  const responseData = await res.json();

  if (!responseData.Sale) {
    try {
      console.log('No sales');
      response.json({ Sale: [{ total: '0.00' }, { total: '00.00' }, { total: '00.00' }] });
    } catch (error) {
      console.log('ERROR FROM !responseData.Sale', error);
      response.json(error);
    }
  }

  if (responseData.Sale) {
    try {
      console.log('Sales');
      response.json(responseData);
    } catch (error) {
      console.log('ERROR FROM responseData.Sale', error);
      response.json(error);
    }
  }
  //response.json(responseData);
});

exports.updateFirebaseUsers = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    //! this is where i want it to work start
    let n = new Date();
    let onlyDateCurrent = moment(n.toISOString()).tz('America/New_York').format('YYYY-MM-DD');

    const users = firestore.collection('users');
    const user = await users.where('employee_role_name', '==', 'Associate').get();

    user.forEach(async (snapshot) => {
      const { employee_id } = snapshot.data();
      //! This is the where the access token gets updated.
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
      //! This where the API call is made to get the total sales.
      const salesDataResponse = await fetch(
        `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json?timeStamp=%3E,${onlyDateCurrent}T00:00:00-0400&employeeID=${employee_id}&sort=-timeStamp&load_relations=all`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newUpdatedToken}`,
          },
        }
      );
      const salesData = await salesDataResponse.json();
      //! if no Sale data is returned, return null.
      if (!salesData.Sale) {
        try {
          const salesFakeData = { Sale: [{ total: '00.00' }, { total: '00.00' }, { total: '00.00' }] };
          const salesTotals = salesFakeData.Sale.map((sale) => parseFloat(sale.total));
          const totalsArray = [];
          salesTotals.forEach((total) => totalsArray.push(total));
          const salesTotalsSummed = totalsArray.reduce((total, sale) => total + sale, 0);
          const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
          const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
          const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
          const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
          snapshot.ref.update({ sales_total: salesTotalSummedRoundedTenth });
          snapshot.ref.update({ sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
          snapshot.ref.update({ total_sort: salesTotalSummedAsADouble });
          console.log('salesTotalsSummed IN THE !salesData.Sale', salesTotalsSummed);
          console.log(
            'IN THE !salesData.Sale BLOCK',
            `${salesTotalsSummed} => ${salesTotalSummedAsADouble}`,
            `employee_id: ${employee_id}`
          );
          return null;
        } catch (error) {
          console.log('ERROR FROM THE !salesData.Sale BLOCK', error, `employee_id: ${employee_id}`);
          return null;
        }
      } else if (salesData.Sale) {
        try {
          const salesTotals = salesData.Sale.map((sale) => parseFloat(sale.total));
          const totalsArray = [];
          salesTotals.forEach((total) => totalsArray.push(total));
          const salesTotalsSummed = totalsArray.reduce((total, sale) => total + sale, 0);
          const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
          const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
          const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
          const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
          snapshot.ref.update({ sales_total: salesTotalSummedRoundedTenth });
          snapshot.ref.update({ sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
          snapshot.ref.update({ total_sort: salesTotalSummedAsADouble });
          console.log('salesTotalsSummed', salesTotalsSummed);
          console.log(
            'IN THE ELSE IF BLOCK, SUMMED-DOUBLE',
            `${salesTotalsSummed} => ${salesTotalSummedAsADouble}`,
            `employee_id: ${employee_id}`
          );
          return null;
        } catch (error) {
          console.log('ERROR FROM THE ELSE IF BLOCK', error, `employee_id: ${employee_id}`);
          return null;
        }
      } else {
        console.log('FROM THE ELSE BLOCK', `employee_id: ${employee_id}`);
        return null;
      }
    });
    console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
    return null;
  });

//! Using Express Here Start
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
        next();
      });
    } catch (error) {
      console.log('ERROR FROM THE UPDATE TOKEN BLOCK', error);
    }
  }
  next();
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
//! Using Express Here Stop

//Callable function.
exports.hiWorld = functions.https.onCall(async (data, context) => {
  console.log(data);
  const response = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
  const responseData = await response.json();
  console.log(responseData);
  return 'Hello from hiWorld';
});
