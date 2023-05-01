const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
var firestore = firebase.firestore();

const RUNTIME_OPTS = {
  timeoutSeconds: 540,
  //memory: "2GB"
};

exports.checkUpdateOnField = functions
  .runWith(RUNTIME_OPTS)
  .firestore.document('stores/{storeId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();

    const { shop_id, sales_total, target_daily_revenue_spiff_timestamp, target_daily_revenue_spiff, name } = newValue;
    const prevTotal = previousValue.sales_total;

    const spiffs = firestore.collection('spiff_names');
    const spiff = await spiffs.where('name', '==', 'Stores Daily Revenue').get();

    spiff.forEach(async (snapshot) => {
      const { revenue_target, state } = snapshot.data();
      const revenueTargetToFloat = parseFloat(revenue_target);
      if (state === 'complete') {
        return null;
      }
      if (sales_total > revenueTargetToFloat && prevTotal < revenueTargetToFloat) {
        console.log('THIS IS THE SALES TOTAL', sales_total);
        console.log(`THE ${name} STORE HAS MADE MORE THAN $${revenue_target} IN SALES TODAY`);
        console.log('THIS IS THE PREVIOUS TOTAL', prevTotal);
        snapshot.ref.update({ most_recent_winner: name });
        snapshot.ref.update({ most_recent_winner_timestamp: FieldValue.serverTimestamp() });
        snapshot.ref.update({ state: 'complete' });
      }
    });
    return null;
  });
