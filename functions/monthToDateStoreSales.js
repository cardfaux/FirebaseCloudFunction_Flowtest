const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
var firestore = firebase.firestore();

//! This function is for getting the month to date sales totals for each store at the 45 of every hour and updating the numbers in the database.

exports.monthToDateStoreSales = functions.pubsub
  .schedule('45 * * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    //! this is where i want it to work start
    let n = new Date();
    let onlyFirstOfMonth = moment().tz('America/New_York').startOf('month').format('YYYY-MM-DD');
    console.log('THIS IS THE ONLY FIRST OF THE MONTH', onlyFirstOfMonth);

    const stores = firestore.collection('stores');
    const store = await stores.get();

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
    console.log('THIS IS THE NEW UPDATED TOKEN FROM THE dailyStoreSales', newUpdatedToken);

    store.forEach(async (snapshot) => {
      const { shop_id } = snapshot.data();

      //! This where the API call is made to get the total sales.
      const salesDataResponse = await fetch(
        `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json?timeStamp=%3E,${onlyFirstOfMonth}T00:00:00-0400&shopID=${shop_id}&sort=-timeStamp&load_relations=all`,
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
          const salesOver100 = totalsArray.filter((total) => total >= 100);
          const salesOver100Length = salesOver100.length;
          console.log('salesOver100Array.length', salesOver100Length, `shop_id: ${shop_id}`);
          const salesTotalsSummed = totalsArray.reduce((total, sale) => total + sale, 0);
          const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
          const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
          const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
          const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
          snapshot.ref.update({ month_sales_total: salesTotalSummedRoundedTenth });
          snapshot.ref.update({ month_sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
          snapshot.ref.update({ month_total_sort: salesTotalSummedAsADouble });
          snapshot.ref.update({ month_sales_over_100: salesOver100Length });
          console.log('salesTotalsSummed IN THE !salesData.Sale', salesTotalsSummed);
          console.log(
            'IN THE !salesData.Sale BLOCK',
            `${salesTotalsSummed} => ${salesTotalSummedAsADouble}`,
            `shop_id: ${shop_id}`
          );
          return null;
        } catch (error) {
          console.log('ERROR FROM THE !salesData.Sale BLOCK', error, `shop_id: ${shop_id}`);
          return null;
        }
      } else if (salesData.Sale) {
        const nextTotalsArray = [];
        const attributes = salesData['@attributes'];
        console.log('THIS IS THE ATTRIBUTES', attributes);
        // try {
        //   const attributes = salesData['@attributes'];
        //   const next = attributes.next;
        //   console.log('THIS IS THE ATTRIBUTES', attributes);
        //   if (next !== '') {
        //     async function paginateNextApiResponses() {
        //       const nextSalesDataResponse = await fetch(next, {
        //         method: 'GET',
        //         headers: {
        //           'Content-Type': 'application/json',
        //           Authorization: `Bearer ${newUpdatedToken}`,
        //         },
        //       });
        //       const nextSalesData = await nextSalesDataResponse.json();
        //       const nextSalesTotals = nextSalesData.Sale.map((sale) => parseFloat(sale.total));
        //       nextSalesTotals.forEach((total) => nextTotalsArray.push(total));
        //       if (nextSalesData['@attributes'].next !== '') {
        //         paginateNextApiResponses();
        //       }
        //     }
        //   }
        // } catch (error) {
        //   console.log('ERROR FROM THE ELSE IF NEXT BLOCK', error, `employee_id: ${employee_id}`);
        //   return null;
        // }
        try {
          const salesTotals = salesData.Sale.map((sale) => parseFloat(sale.total));
          const totalsArray = [];
          salesTotals.forEach((total) => totalsArray.push(total));
          const salesOver100 = totalsArray.filter((total) => total >= 100);
          const salesOver100Length = salesOver100.length;
          console.log('salesOver100Array.length', salesOver100Length, `shop_id: ${shop_id}`);
          const salesTotalsSummed = totalsArray?.concat(nextTotalsArray).reduce((total, sale) => total + sale, 0);
          const salesTotalTicketAverage = salesTotalsSummed / salesTotals.length;
          const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
          const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
          const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
          snapshot.ref.update({ month_sales_total: salesTotalSummedRoundedTenth });
          snapshot.ref.update({ month_sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
          snapshot.ref.update({ month_total_sort: salesTotalSummedAsADouble });
          snapshot.ref.update({ month_sales_over_100: salesOver100Length });
          console.log('salesTotalsSummed', salesTotalsSummed);
          console.log(
            'IN THE ELSE IF BLOCK, SUMMED-DOUBLE',
            `${salesTotalsSummed} => ${salesTotalSummedAsADouble}`,
            `shop_id: ${shop_id}`
          );
          return null;
        } catch (error) {
          console.log('ERROR FROM THE ELSE IF BLOCK', error, `shop_id: ${shop_id}`);
          return null;
        }
      } else {
        console.log('FROM THE ELSE BLOCK', `shop_id: ${shop_id}`);
        return null;
      }
    });
    console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
    return null;
  });
