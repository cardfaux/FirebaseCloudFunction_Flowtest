const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
firebase.initializeApp();
const monthToDateSales = require('./monthToDateSales');
const updateFirebaseUsers = require('./updateFirebaseUsers');

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
});

//* Exporting the function to be called by the client that is being used to get the daily sales for each employee.
exports.updateFirebaseUsers = updateFirebaseUsers.updateFirebaseUsers;

//! Using Express Here Start
//* Exporting the function to be called by the client that is being used to get the month to date sales for each employee.
exports.monthToDateSales = monthToDateSales.monthToDateSales;
//! Using Express Here Stop

//Callable function.
exports.hiWorld = functions.https.onCall(async (data, context) => {
  console.log(data);
  const response = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
  const responseData = await response.json();
  console.log(responseData);
  return 'Hello from hiWorld';
});
