const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
firebase.initializeApp();
const monthToDateSales = require('./monthToDateSales');
const updateFirebaseUsers = require('./updateFirebaseUsers');
const deleteSelectedUser = require('./deleteSelectedUser');
const dailyStoreSales = require('./dailyStoreSales');
const monthToDateStoreSales = require('./monthToDateStoreSales');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

//* Exporting the function to be called by the client that is being used to get the month to date sales for each store.
exports.monthToDateStoreSales = monthToDateStoreSales.monthToDateStoreSales;

//* Exporting the function to be called by the client that is being used to get the daily sales for each store.
exports.dailyStoreSales = dailyStoreSales.dailyStoreSales;

//* Exporting the function to delete a selected user from the database.
exports.deleteSelectedUser = deleteSelectedUser.deleteSelectedUser;

//* Exporting the function to be called by the client that is being used to get the daily sales for each employee.
exports.updateFirebaseUsers = updateFirebaseUsers.updateFirebaseUsers;

//* Exporting the function to be called by the client that is being used to get the month to date sales for each employee.
exports.monthToDateSales = monthToDateSales.monthToDateSales;
