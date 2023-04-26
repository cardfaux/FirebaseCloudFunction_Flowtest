const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
var firestore = firebase.firestore();

//! This function is for getting the month to date sales totals for each associate at half past every hour and updating the numbers in the database.

exports.dailyTargetRevenueSpiff = functions.https.onRequest(async (request, response) => {
  let n = new Date();
  let onlyDateCurrent = moment(n.toISOString()).tz('America/New_York').format('YYYY-MM-DD');
  console.log('THIS IS THE ONLY DATE CURRENT dailyTargetRevenueSpiff', onlyDateCurrent);

  const users = firestore.collection('users');
  const user = await users.where('employee_role_name', '==', 'Associate').get();

  const spiffs = firestore.collection('spiff_names');
  const spiff = await spiffs.where('name', '==', 'Daily Revenue').get();

  let revenueTargetToFloat;
  spiff.forEach(async (snapshot) => {
    const { revenue_target, time_start, time_stop } = snapshot.data();
    console.log('THIS IS THE REVENUE TARGET', revenue_target);
    console.log('THIS IS THE TIME START SECONDS', time_start._seconds);

    revenueTargetToFloat = parseFloat(revenue_target);

    const UTCFromSeconds = moment
      .utc(time_start._seconds * 1000)
      .tz('America/New_York')
      .format('YYYY-MM-DDTHH:mm:ss-0400');

    const UTCTimeStopFromSeconds = moment
      .utc(time_stop._seconds * 1000)
      .tz('America/New_York')
      .format('YYYY-MM-DDTHH:mm:ss-0400');

    const timeFrom = moment(UTCFromSeconds);
    const timeTo = moment(UTCTimeStopFromSeconds);

    const theDifferenceInMilliseconds = timeTo.diff(timeFrom);

    const theDifferenceInHMS = moment.utc(theDifferenceInMilliseconds).format('HH:mm:ss');

    console.log('THIS THE DURATION OF TIME', theDifferenceInHMS);
  });

  user.forEach(async (snapshot) => {
    const { employee_id, monthly_sales_over_100, sales_total } = snapshot.data();
    console.log('THIS IS THE EMPLOYEE ID', employee_id);
    // console.log('THIS IS THE MONTHLY SALES OVER 100', monthly_sales_over_100);

    const salesTotalToFloat = parseFloat(sales_total);

    if (revenueTargetToFloat >= salesTotalToFloat) {
      console.log('THIS IS THE SALES TOTAL TO FLOAT', salesTotalToFloat);
      console.log('THIS IS THE REVENUE TARGET TO FLOAT', revenueTargetToFloat);
      console.log('GOAL IS NOT MET', `employee_id: ${employee_id}`);
    }
    if (salesTotalToFloat >= revenueTargetToFloat) {
      console.log('THIS IS THE SALES TOTAL TO FLOAT', salesTotalToFloat);
      console.log('THIS IS THE REVENUE TARGET TO FLOAT', revenueTargetToFloat);
      console.log('GOAL IS MET', `employee_id: ${employee_id}`);
    }
  });

  console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
  return response.json({ message: 'Successfully updated the daily target revenue spiff' });
});
