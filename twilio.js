const twilio = require('twilio');

const accountSid = 'AC09af75bd35688a049915f25c67e24d10';
const authToken = '7d66a658e367cba0462115e9d860060f';

module.exports = new twilio(accountSid, authToken);