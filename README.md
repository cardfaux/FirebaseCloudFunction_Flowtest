# FlowTest Cloud Function for the FlowTest Firebase Project

### I set this up so i could have more control over the response

<!-- example of looping over users from Dimitar -->

```
const snapshot = await usersCollection.get();

    snapshot.forEach((doc) => {
      console.log(doc.id, '=>', doc.data());
      // Perform your desired operation with the document data
    });

```

<!-- example of using a callable function in a custom action/function from Dimitar -->

```
final functions = CloudFunctions.instance;
  final myCallableFunction = functions.getHttpsCallable(
    functionName: 'myCallableFunction',
  );
try {
    final response = await myCallableFunction.call(
      <String, dynamic>{
        'inputValue': 'Your input value goes here',
      },
    );

    print('Function result: ${response.data['result']}');
  } catch (e) {
    print('Error calling function: $e');
  }

```

<!-- example of writing a scheduled function from Dimitar -->

```
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.updateUserNames = functions.pubsub.schedule('30 * * * *').onRun(async (context) => {
  // Get a reference to the users collection
  const usersCollection = admin.firestore().collection('users');

  // Generate a new name (you can replace this with your desired logic)
  const newName = `New Name ${Date.now()}`;

  // Get all user documents
  const snapshot = await users

```

<!-- example of a cloud function from https://www.freecodecamp.org/news/how-to-schedule-a-task-with-firebase-cloud-functions/ -->

```
const functions = require("firebase-functions");
const firebase = require("firebase-admin");
firebase.initializeApp()
var firestore = firebase.firestore()

exports.resetCreditsForFreeUsers = functions.pubsub
  .schedule('0 0 1 * *')
  .onRun(async (context) => {
    const users = firestore.collection('users')
    const user = await users.where('isPayingUser', '==', false).get()
    user.forEach(snapshot => {
        snapshot.ref.update({ credits: 10 })
    })
    return null;
})

```

<!-- youtube link from Dimitar -->

https://www.youtube.com/watch?v=x-kivZ7ChD8&t=1s
