'use strict';

function WorldpayException(message, code/*, Exception $previous = null*/, httpStatusCode, description, customCode) {
  this.message = message;
  this.code = code;
  this.httpStatusCode = httpStatusCode;
  this.description = description;
  this.customCode = customCode;
}

WorldpayException.errors = {
  ip: 'Invalid parameters',
  cine: 'php_curl was not found',
  to: 'Request timed out',
  nf: 'Not found',
  apierror: 'API Error',
  uanv: 'Worldpay is currently unavailable, please try again later',
  contact: 'Error contacting Worldpay, please try again later',
  ssl: 'You must enable SSL check in production mode',
  verify: 'Worldpay not verifiying SSL connection',
  orderInput: {
    token: 'No token found',
    orderDescription: 'No order_description found',
    amount: 'No amount found, or it is not a whole number',
    currencyCode: 'No currency_code found',
    name: 'No name found',
    billingAddress: 'No billing_address found'
  },
  notificationPost: 'Notification Error: Not a post',
  notificationUnknown: 'Notification Error: Cannot be processed',
  refund: {
    ordercode: 'No order code entered'
  },
  json: 'JSON could not be decoded',
  key: 'Please enter your service key',
  sslerror: 'Worldpay SSL certificate could not be validated'
};

WorldpayException.prototype = new Error();
WorldpayException.prototype.constructor = WorldpayException;

module.exports = WorldpayException;