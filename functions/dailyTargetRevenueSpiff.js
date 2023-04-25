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

  var museums = firestore.collectionGroup('spiffs');
  museums.get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      console.log(doc.id, ' => ', doc.data(), 'the museum one');
    });
  });

  const dailyTargetRevenueDocumentID = '5LYk1sLB63dKaiSvfgfZ';
  const dailyMVPRevenueDocumentID = 'hKJ9y6u6ZxaY1VSlpl08';

  firestore
    .collection('spiffs')
    .doc(dailyTargetRevenueDocumentID)
    .collection('spiff_info')
    .get()
    .then((snapshot) => {
      const values = snapshot.docs.map(flattenDoc);
      console.table(values);
    })
    .then(() => {
      firestore
        .collection('spiffs')
        .doc(dailyMVPRevenueDocumentID)
        .collection('spiff_info')
        .get()
        .then((snapshot) => {
          const values = snapshot.docs.map(flattenDoc);
          console.table(values);
        });
    });

  function flattenDoc(doc) {
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  user.forEach(async (snapshot) => {
    const { employee_id, monthly_sales_over_100 } = snapshot.data();
    console.log('THIS IS THE EMPLOYEE ID', employee_id);
    // console.log('THIS IS THE MONTHLY SALES OVER 100', monthly_sales_over_100);
  });
  console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
  return response.json({ message: 'Successfully updated the daily target revenue spiff' });
});
