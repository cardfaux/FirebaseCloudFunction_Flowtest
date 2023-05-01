const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
var firestore = firebase.firestore();

//! This function is for setting and getting a daily spiff for daily revenue on a store basis.

exports.storesDailyTargetRevenueSpiff = functions.https.onRequest(async (request, response) => {
  let n = new Date();
  let onlyDateCurrent = moment(n.toISOString()).tz('America/New_York').format('YYYY-MM-DD');
  console.log('THIS IS THE ONLY DATE CURRENT storeDailyTargetRevenueSpiff', onlyDateCurrent);

  const stores = firestore.collection('stores');
  const store = await stores.get();

  const spiffs = firestore.collection('spiff_names');
  const spiff = await spiffs.where('name', '==', 'Stores Daily Revenue').get();

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

  let timeStamps = [];

  store.forEach(async (snapshot) => {
    const { shop_id, sales_total, target_daily_revenue_spiff_timestamp, target_daily_revenue_spiff } = snapshot.data();
    const timeStampInNanoSeconds = target_daily_revenue_spiff_timestamp._nanoseconds;

    const storeObject = {
      shop_id,
      target_daily_revenue_spiff_timestamp: timeStampInNanoSeconds,
      target_daily_revenue_spiff,
    };

    timeStamps.push(storeObject);
    console.log('THIS IS THE TIME STAMPS ARRAY', timeStamps);

    const salesTotalToFloat = parseFloat(sales_total);

    if (revenueTargetToFloat >= salesTotalToFloat) {
      console.log('GOAL IS NOT MET', `shop_id: ${shop_id}`);
      snapshot.ref.update({ target_daily_revenue_spiff: false });
      snapshot.ref.update({ target_daily_revenue_spiff_timestamp: FieldValue.serverTimestamp() });
    }
    if (salesTotalToFloat >= revenueTargetToFloat) {
      console.log('GOAL IS MET', `shop_id: ${shop_id}`);
      snapshot.ref.update({ target_daily_revenue_spiff: true });
      snapshot.ref.update({ target_daily_revenue_spiff_timestamp: FieldValue.serverTimestamp() });
    }
  });

  const filteredTimeStamps = timeStamps.filter((o) => o.target_daily_revenue_spiff === true);

  const onlyTrueTimeStamps = filteredTimeStamps.map((o) => o.target_daily_revenue_spiff_timestamp);

  //const testingMin = Math.min(...timeStamps.map((o) => o.target_daily_revenue_spiff_timestamp));
  const testingMin = Math.min(...filteredTimeStamps.map((o) => o.target_daily_revenue_spiff_timestamp));
  //const theSelectedMin = timeStamps.find((o) => o.target_daily_revenue_spiff_timestamp === testingMin);
  const theSelectedMin = filteredTimeStamps.find((o) => o.target_daily_revenue_spiff_timestamp === testingMin);
  console.log('THIS IS THE FIRST ONE', theSelectedMin);

  console.log('FILTERED TIME STAMPS ARRAY', filteredTimeStamps);
  console.log('ONLY TRUE TIME STAMPS ARRAY', onlyTrueTimeStamps);
  console.log('ALL TIME STAMPS ARRAY', timeStamps);

  const winningStore = firestore.collection('stores').where('shop_id', '==', theSelectedMin.shop_id);
  const storeThatWon = await winningStore.get();

  storeThatWon.forEach(async (snapshot) => {
    const { name } = snapshot.data();

    const spiffsToUpdate = firestore.collection('spiff_names');
    const spiffToUpdate = await spiffsToUpdate.where('name', '==', 'Stores Daily Revenue').get();
    spiffToUpdate.forEach(async (snapshot) => {
      snapshot.ref.update({ most_recent_winner: name });
      snapshot.ref.update({ most_recent_winner_timestamp: FieldValue.serverTimestamp() });
    });
  });

  console.log('FROM THE END OF THE FUNCTION OUTSIDE THE STORES COLLECTION LOOP');
  return response.json({ message: 'Successfully updated the store daily target revenue spiff' });
});
