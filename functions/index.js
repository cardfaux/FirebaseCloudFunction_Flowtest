const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment');
const firebase = require('firebase-admin');
firebase.initializeApp();
var firestore = firebase.firestore();
//const { fetch } = require('node-fetch');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = functions.https.onRequest(async (request, response) => {
  //console.log('REQUEST', request);
  //console.log('RESPONSE', response);

  //const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${request.query.name}`);
  //console.log(request.query.name);
  const res = await fetch(
    `https://api.lightspeedapp.com/API/V3/Account/162106/Sale.json?timeStamp=%3E,2023-03-26T00:00:00-0400&employeeID=${request.query.employeeID}&sort=-timeStamp&load_relations=all`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.query.token}`,
      },
    }
  );
  //functions.logger.info(res, { structuredData: true });
  //console.log(res);
  // if (!res.Sale) {
  //   console.log('No sales');
  //   response.json({ Sale: [{ total: '0.00' }] });
  // }
  const responseData = await res.json();

  if (!responseData.Sale) {
    console.log('No sales');
    response.json({ Sale: [{ total: '0.00' }, { total: '00.00' }, { total: '00.00' }] });
  }
  //console.log(responseData);
  //response.send(responseData);

  functions.logger.info('Hello logs!', { structuredData: true });
  //response.send('Hello from Firebase!');
  if (responseData.Sale) {
    console.log('Sales');
    response.json(responseData);
  }
  //response.json(responseData);
});

exports.updateFirebaseUsers = functions.pubsub.schedule('*/30 * * * *').onRun(async (context) => {
  //! this is where i want it to work start
  let n = new Date();
  //n.toISOString();
  let onlyDateCurrent = moment(n.toISOString()).format('YYYY-MM-DD');
  // let onlyHoursCurrent = moment(n.toISOString()).format('HH:mm:ss');

  // let onlyDateMinus30 = moment(n.toISOString()).subtract(30, 'minutes').format('YYYY-MM-DD');
  // let onlyHoursMinus30 = moment(n.toISOString()).subtract(30, 'minutes').format('HH:mm:ss');
  const users = firestore.collection('users');
  const user = await users.where('employee_role_name', '==', 'Associate').get();
  //const salesTotal = 10.92 + `${Date.now()}`;
  //const salesTotal = `${salesTotalsSummed.toString()}` + `${Date.now()}`;
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
        console.log('IN THE !salesData.Sale BLOCK', salesData);
        return null;
      } catch (error) {
        console.log('ERROR FROM THE !salesData.Sale BLOCK', error);
        return null;
      }
    } else if (salesData.Sale) {
      try {
        const salesTotals = salesData.Sale.map((sale) => parseFloat(sale.total));
        const totalsArray = [];
        salesTotals.forEach((total) => totalsArray.push(total));
        const salesTotalsSummed = totalsArray.reduce((total, sale) => total + sale, 0);
        const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
        console.log('salesTotalsSummed', salesTotalsSummed);
        functions.logger.info('salesTotalsSummed', salesTotalsSummed, { structuredData: true });
        const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
        const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
        const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
        snapshot.ref.update({ sales_total: salesTotalSummedRoundedTenth });
        snapshot.ref.update({ sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
        snapshot.ref.update({ total_sort: salesTotalSummedAsADouble });
        console.log('IN THE ELSE IF BLOCK, SUMMED-DOUBLE', salesTotalSummedAsADouble);
        return null;
      } catch (error) {
        console.log('ERROR FROM THE ELSE IF BLOCK', error);
        return null;
      }
    } else {
      console.log('FROM THE ELSE BLOCK');
      return null;
    }
    // if (salesData.Sale) {
    //   const salesTotals = salesData.Sale.map((sale) => parseFloat(sale.total));
    //   const totalsArray = [];
    //   salesTotals.forEach((total) => totalsArray.push(total));
    //   const salesTotalsSummed = totalsArray.reduce((total, sale) => total + sale, 0);
    //   const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
    //   console.log('salesTotalsSummed', salesTotalsSummed);
    //   functions.logger.info('salesTotalsSummed', salesTotalsSummed, { structuredData: true });
    //   const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
    //   const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
    //   const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
    //   // console.log('OPEN SALESDATA', salesData);
    //   // console.log('SALES TOTAL DOUBLE', salesTotalSummedAsADouble);
    //   // functions.logger.info('OPEN SALESDATA', salesData, { structuredData: true });
    //   // functions.logger.info('SALES TOTAL DOUBLE', salesTotalSummedAsADouble, { structuredData: true });
    //   snapshot.ref.update({ sales_total: salesTotalSummedRoundedTenth });
    //   snapshot.ref.update({ sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
    //   snapshot.ref.update({ total_sort: salesTotalSummedAsADouble });
    // }
    //snapshot.ref.update({ sales_total: salesTotalsSummed });
    //snapshot.ref.update({ sales_updated_employee_id: employee_id });
  });
  console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
  return null;
  //! this is where i want it work end
  // const users = firestore.collection('users');
  // const user = await users.where('employee_id', '==', 469).get();
  // //const salesTotal = 10.92 + `${Date.now()}`;
  // const salesTotal = `${salesTotalsSummed}` + `${Date.now()}`;
  // user.forEach((snapshot) => {
  //   snapshot.ref.update({ sales_total: salesTotal });
  // });
  // return null;
});

//Callable function.
exports.hiWorld = functions.https.onCall(async (data, context) => {
  console.log(data);
  const response = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
  const responseData = await response.json();
  console.log(responseData);
  return 'Hello from hiWorld';
});
