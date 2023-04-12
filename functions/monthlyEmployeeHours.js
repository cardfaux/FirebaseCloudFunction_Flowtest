const functions = require('firebase-functions');
const fetch = require('node-fetch');
const moment = require('moment-timezone');
const firebase = require('firebase-admin');
var firestore = firebase.firestore();

//! This function is for getting the monthly employee hours for each store at the 15 of every hour and updating the numbers in the database.

exports.monthlyEmployeeHours = functions.pubsub
  .schedule('35 * * * *')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    //! this is where i want it to work start
    let n = new Date();
    let onlyDateCurrent = moment(n.toISOString()).tz('America/New_York').format('YYYY-MM-DD');
    let onlyDateHoursMinutesSecondsCurrent = moment(n.toISOString())
      .tz('America/New_York')
      .format('YYYY-MM-DDTHH:mm:ss-0400');
    let onlyFirstOfMonth = moment().tz('America/New_York').startOf('month').format('YYYY-MM-DD');
    console.log('THIS IS THE ONLY FIRST OF THE MONTH', onlyFirstOfMonth);
    console.log('THIS IS THE ONLY DATE CURRENT monthlyEmployeeHours', onlyDateCurrent);

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
    console.log('THIS IS THE NEW UPDATED TOKEN FROM THE monthlyEmployeeHours', newUpdatedToken);

    user.forEach(async (snapshot) => {
      const { employee_id } = snapshot.data();

      //! This where the API call is made to get the employee hours.
      const salesDataResponse = await fetch(
        `${process.env.BASE_URL}/${process.env.ACCOUNT_ID}/EmployeeHours.json?checkIn=%3E,${onlyFirstOfMonth}T00:00:00-0400&employeeID=${employee_id}&load_relations=all`,
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
      if (!salesData.EmployeeHours) {
        try {
          const salesFakeData = {
            EmployeeHours: [
              { checkIn: `${onlyDateCurrent}T00:00:00-0400`, checkOut: `${onlyDateCurrent}T00:00:00-0400` },
              { checkIn: `${onlyDateCurrent}T00:00:00-0400`, checkOut: `${onlyDateCurrent}T00:00:00-0400` },
              { checkIn: `${onlyDateCurrent}T00:00:00-0400`, checkOut: `${onlyDateCurrent}T00:00:00-0400` },
            ],
          };
          const checkInTime = salesFakeData.EmployeeHours.map((checkIn) => checkIn?.checkIn);
          const checkOutTime = salesFakeData.EmployeeHours.map((checkOut) => checkOut?.checkOut);
          const clockTimeArray = [];
          let checkInCheckOut = checkInTime.map((checkIn, index) => {
            return {
              checkIn: checkIn,
              checkOut: checkOutTime[index],
            };
          });
          checkInCheckOut.forEach((checkInCheckOut) => {
            let checkIn = moment(checkInCheckOut.checkIn);
            let checkOut = moment(checkInCheckOut.checkOut);
            let clockTime = checkOut.diff(checkIn, 'minutes');
            clockTimeArray.push(clockTime);
          });
          const clockTimeMinutesSummed = clockTimeArray.reduce((a, b) => a + b, 0);
          const clockTimeHoursMinutesSeconds = moment
            .utc(moment.duration(clockTimeMinutesSummed, 'minutes').asMilliseconds())
            .format('HH:mm:ss');
          snapshot.ref.update({ monthly_employee_hours: clockTimeHoursMinutesSeconds });
          console.log('clockTimeArray in !salesData', clockTimeHoursMinutesSeconds, `employee_id: ${employee_id}`);
          return null;
        } catch (error) {
          console.log('ERROR FROM THE !salesData.Sale BLOCK', error, `employee_id: ${employee_id}`);
          return null;
        }
      } else if (salesData.EmployeeHours) {
        //* function to check if the EmployeeHours value is an object.
        function isObject(value) {
          return typeof value === 'object' && !Array.isArray(value);
        }
        if (isObject(salesData.EmployeeHours)) {
          console.log('This is an object');
          try {
            const checkInTime = salesData.EmployeeHours.checkIn;
            const checkOutTime = salesData.EmployeeHours.checkOut || onlyDateHoursMinutesSecondsCurrent;
            let checkIn = moment(checkInTime);
            let checkOut = moment(checkOutTime);
            let clockTime = checkOut.diff(checkIn, 'minutes');
            let clockTimeHoursMinutesSeconds = moment
              .utc(moment.duration(clockTime, 'minutes').asMilliseconds())
              .format('HH:mm:ss');
            snapshot.ref.update({ monthly_employee_hours: clockTimeHoursMinutesSeconds });
            console.log('clockTimeHoursMinutesSeconds', clockTimeHoursMinutesSeconds, `employee_id: ${employee_id}`);
            return null;
          } catch (error) {
            console.log('ERROR FROM THE ELSE IF BLOCK', error, `employee_id: ${employee_id}`);
            return null;
          }
        } else if (Array.isArray(salesData.EmployeeHours)) {
          //! put the new stuff in here
          console.log('This is an array');
          try {
            const salesFakeData = {
              EmployeeHours: [
                { checkOut: `${onlyDateHoursMinutesSecondsCurrent}` },
                { checkOut: `${onlyDateHoursMinutesSecondsCurrent}` },
                { checkOut: `${onlyDateHoursMinutesSecondsCurrent}` },
              ],
            };
            const checkInTime = salesData.EmployeeHours.map((checkIn) => checkIn?.checkIn);
            const checkOutTime =
              salesData.EmployeeHours.map((checkOut) => checkOut?.checkOut) ||
              salesFakeData.EmployeeHours.map((checkOut) => checkOut?.checkOut);
            const clockTimeArray = [];
            let checkInCheckOut = checkInTime.map((checkIn, index) => {
              return {
                checkIn: checkIn,
                checkOut: checkOutTime[index],
              };
            });
            console.log('checkInCheckOut', checkInCheckOut, `employee_id: ${employee_id}`);
            checkInCheckOut.forEach((checkInCheckOut) => {
              let checkIn = moment(checkInCheckOut.checkIn);
              let checkOut = moment(checkInCheckOut.checkOut);
              let clockTime = checkOut.diff(checkIn, 'minutes');
              clockTimeArray.push(clockTime);
            });
            console.log('clockTimeArray', clockTimeArray, `employee_id: ${employee_id}`);
            const clockTimeMinutesSummed = clockTimeArray.reduce((a, b) => a + b, 0);
            console.log('clockTimeMinutesSummed', clockTimeMinutesSummed, `employee_id: ${employee_id}`);
            const clockTimeHoursMinutesSeconds = moment
              .utc(moment.duration(clockTimeMinutesSummed, 'minutes').asMilliseconds())
              .format('HH:mm:ss');
            const myOwnTimeStructure =
              Math.floor(clockTimeMinutesSummed / 60) + ':' + (clockTimeMinutesSummed % 60) + ':';
            console.log('myOwnTimeStructure', myOwnTimeStructure, `employee_id: ${employee_id}`);
            snapshot.ref.update({ monthly_employee_hours: myOwnTimeStructure });
            console.log(
              'clockTimeHoursMinutesSeconds in salesData',
              clockTimeHoursMinutesSeconds,
              `employee_id: ${employee_id}`
            );
            return null;
          } catch (error) {
            console.log('ERROR FROM THE ELSE IF BLOCK', error, `employee_id: ${employee_id}`);
            return null;
          }
        } else {
          console.log('🚫 Value is not an object or an Array', `employee_id: ${employee_id}`);
        }
      } else {
        console.log('FROM THE ELSE BLOCK', `employee_id: ${employee_id}`);
        return null;
      }
    });
    console.log('FROM THE END OF THE FUNCTION OUTSIDE THE USERS COLLECTION LOOP');
    return null;
  });
