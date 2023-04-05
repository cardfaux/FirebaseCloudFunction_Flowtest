const functions = require('firebase-functions');
const cors = require('cors');
const express = require('express');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
//firebase.initializeApp();
var firestore = firebase.firestore();

exports.deleteSelectedUser = functions.https.onRequest(async (request, response) => {
  getAuth()
    .deleteUser(request.query.uid)
    .then(async () => {
      const user = await firestore.collection('users').doc(request.query.uid).delete();
      console.log('Successfully deleted user from firestore', user);
    })
    .then(() => {
      console.log('Successfully deleted user');
      response.json({ message: 'Successfully deleted user' });
    })
    .catch((error) => {
      console.log('Error deleting user:', error);
      response.json({ message: 'Error deleting user' });
    });
});
