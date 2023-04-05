const functions = require('firebase-functions');
const firebase = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
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
