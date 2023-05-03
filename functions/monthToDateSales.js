const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
var firestore = firebase.firestore();

//! This function is for getting the month to date sales totals for each associate at half past every hour and updating the numbers in the database.

exports.monthToDateSales = functions.pubsub
  .schedule('30 * * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    let n = new Date();
    let onlyFirstOfMonth = moment().tz('America/New_York').startOf('month').format('YYYY-MM-DD');
    console.log('THIS IS THE ONLY FIRST OF THE MONTH', onlyFirstOfMonth);

    const users = firestore.collection('users');
    const user = await users.where('employee_role_name', '==', 'Associate').get();

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
    console.log('THIS IS THE NEW UPDATED TOKEN FROM THE monthToDateSales', newUpdatedToken);

    user.forEach(async (snapshot) => {
      const { employee_id } = snapshot.data();
      //! This where the API call is made to get the total sales.
      const salesDataResponse = await fetch(
        `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/Sale.json?timeStamp=%3E,${onlyFirstOfMonth}T00:00:00-0400&employeeID=${employee_id}&sort=-timeStamp&load_relations=all`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${newUpdatedToken}`,
          },
        }
      );
      const salesData = await salesDataResponse.json();

      //! if no Sale data is returned, use the fake data to add zeros to the database.
      if (!salesData.Sale) {
        try {
          const salesFakeData = { Sale: [{ total: '00.00' }, { total: '00.00' }, { total: '00.00' }] };
          const salesTotals = salesFakeData.Sale.map((sale) => parseFloat(sale.total));
          const totalsArray = [];
          salesTotals.forEach((total) => totalsArray.push(total));
          const salesOver100 = totalsArray.filter((total) => total >= 100);
          const salesOver100Length = salesOver100.length;
          console.log('salesOver100Array', salesOver100);
          console.log('salesOver100Array.length', salesOver100Length, `employee_id: ${employee_id}`);
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
            `employee_id: ${employee_id}`
          );
          return null;
        } catch (error) {
          console.log('ERROR FROM THE !salesData.Sale BLOCK', error, `employee_id: ${employee_id}`);
          return null;
        }
      } else if (salesData.Sale) {
        try {
          //? This mapping over the first page of sales data and returning an array of the totals.
          const salesTotals = salesData.Sale.map((sale) => parseFloat(sale.total));
          //? This is making an empty array to push the totals into.
          const totalsArray = [];
          const nextTotalsArray = [];
          //? This is pushing the totals into the empty array.
          salesTotals.forEach((total) => totalsArray.push(total));
          //! put the pagination try catch block here start.
          try {
            //? This is getting the next attribute from the first page of sales data.
            const attributes = salesData['@attributes'];
            const next = attributes.next;
            console.log('THIS IS THE ATTRIBUTES', attributes);
            //? This is checking to see if there is a next attribute and if there is, it will run the function to get the next page of sales data.
            if (next !== '') {
              //? This is the function that will get the next page of sales data.
              async function paginateNextApiResponses(nextURL = next) {
                const nextSalesDataResponse = await fetch(nextURL, {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${newUpdatedToken}`,
                  },
                });
                //? This is getting the data and mapping over it to get the totals and pushing them into an empty array.
                const nextSalesData = await nextSalesDataResponse.json();
                const nextSalesTotals = nextSalesData.Sale.map((sale) => parseFloat(sale.total));
                nextSalesTotals.forEach((total) => nextTotalsArray.push(total));
                console.log('nextTotalsArray', nextTotalsArray, `employee_id: ${employee_id}`);
                const inFunctionArrayLength = nextTotalsArray.length;
                console.log('inFunctionArrayLength', inFunctionArrayLength, `employee_id: ${employee_id}`);
                //? This is checking to see if there is a next attribute and if there is, it will run the function again to get the next page of sales data.
                if (nextSalesData['@attributes'].next !== '') {
                  console.log('THERE ARE MORE PAGES TO PAGINATE', `employee_id: ${employee_id}`);
                  const nextNextURL = nextSalesData['@attributes'].next;
                  i = 1;
                  console.log('RUNNING FUNCTION AGAIN', i++, `employee_id: ${employee_id}`);
                  //? This is running the function again to get the next page of sales data.
                  await paginateNextApiResponses(nextNextURL);
                } else {
                  console.log('THERE ARE NO MORE PAGES TO PAGINATE', `employee_id: ${employee_id}`);
                  return null;
                }
              }
              await paginateNextApiResponses();
            } else {
              console.log('OUT OF TH IF STATEMENT nextTotalsArray', nextTotalsArray, `employee_id: ${employee_id}`);
              const nextArrayLength = nextTotalsArray.length;
              console.log('nextArrayLength OUT OF IF STATEMENT', nextArrayLength, `employee_id: ${employee_id}`);
              //return null;
            }
          } catch (error) {
            console.log('ERROR FROM THE CATCH BLOCK IN THE PAGINATE', error, `employee_id: ${employee_id}`);
            return null;
          }
          //! put the pagination try catch block here stop.
          //? Now concatenate the two arrays together.
          const salesTotalsNextTotalsConcatenated = totalsArray.concat(nextTotalsArray);
          console.log(
            'salesTotalsNextTotalsConcatenated',
            salesTotalsNextTotalsConcatenated,
            `employee_id: ${employee_id}`
          );
          //? This is filtering the totals array for totals over 100.
          const salesOver100 = salesTotalsNextTotalsConcatenated.filter((total) => total >= 100);
          console.log('salesOver100Array', salesOver100);
          //? This is getting the length of the salesOver100 array.
          const salesOver100Length = salesOver100.length;
          console.log('salesOver100Array.length', salesOver100Length, `employee_id: ${employee_id}`);
          //? This is concatenating the arrays together and adding the totals together.
          const salesTotalsSummed = salesTotalsNextTotalsConcatenated.reduce((total, sale) => total + sale, 0);
          //? This is getting the average of the sales totals.
          const salesTotalTicketAverage = salesTotalsSummed / salesTotalsNextTotalsConcatenated.length;
          //? This is rounding the sales totals to the nearest tenth.
          const salesTotalSummedRoundedTenth = salesTotalsSummed.toFixed(2);
          //? This is parsing the sales totals to a double.
          const salesTotalSummedAsADouble = parseFloat(salesTotalSummedRoundedTenth);
          //? This is rounding the sales ticket average to the nearest tenth.
          const salesTotalTicketAverageRoundedTenth = salesTotalTicketAverage.toFixed(2);
          //? This is updating the database with the new values.
          snapshot.ref.update({ month_sales_total: salesTotalSummedRoundedTenth });
          snapshot.ref.update({ month_sales_total_ticket_average: salesTotalTicketAverageRoundedTenth });
          snapshot.ref.update({ month_total_sort: salesTotalSummedAsADouble });
          snapshot.ref.update({ month_sales_over_100: salesOver100Length });
          //? This is logging the sales totals summed.
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
