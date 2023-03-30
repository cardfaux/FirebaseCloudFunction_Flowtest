const functions = require('firebase-functions');
const fetch = require('node-fetch');
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

//Callable function.
exports.hiWorld = functions.https.onCall(async (data, context) => {
  console.log(data);
  const response = await fetch('https://pokeapi.co/api/v2/pokemon/ditto');
  const responseData = await response.json();
  console.log(responseData);
  return 'Hello from hiWorld';
});
