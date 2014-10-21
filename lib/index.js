/**
 * node.js library version: 1.1
 */
'use strict';
var _ = require('lodash');
var request = require('request');
var WorldpayException = require('worldpayException');

/**
 * Checks if variable is a float
 * @param {number} number
 * @return bool
 * */
function isFloat(number) {
  return Number.isInteger(parseFloat(number));
}

/**
 * Library constructor
 * @param {string} serviceKey - Your worldpay service key
 * @param {int} [timeout] - Connection timeout length
 * */
function Worldpay(serviceKey, timeout) {
  if (!serviceKey) {
    throw Worldpay.onError('key');
  }

  /**
   * Library variables
   * */
  this.serviceKey = serviceKey;
  this.timeout = timeout || 10;
  this.disableSsl = false;
  this.endpoint = 'https://api.worldpay.com/v1/';
}

/**
 * Disable SSL Check ~ Use only for testing!
 * @param {boolean} disable
 * */
Worldpay.prototype.disableSSLCheck = function disableSSLCheck(disable) {
  this.disableSsl = !disable;
};

/**
 * Set timeout
 * @param {int} timeout
 * */
Worldpay.prototype.setTimeout = function setTimeout(timeout) {
  // todo: ask worldpay devs why different default values
  this.timeout = timeout || 3;
};

/**
 * Checks order input array for validity
 * @param {object} order
 * @private
 * */
Worldpay.prototype.checkOrderInput = function checkOrderInput(order) {
  var errors = [];
  if (!order) {
    return Worldpay.onError('ip');
  }

  if (!order.token) {
    errors.push(WorldpayException.errors.orderInput.token);
  }

  if (!order.orderDescription) {
    errors.push(WorldpayException.errors.orderInput.orderDescription);
  }

  if (!order.amount || order.amount <= 0 || isFloat(order.amount)) {
    errors.push(WorldpayException.errors.orderInput.amount);
  }

  if (!order.currencyCode) {
    errors.push(WorldpayException.errors.orderInput.currencyCode);
  }

  if (!order.name) {
    errors.push(WorldpayException.errors.orderInput.name);
  }

  if (!order.billingAddress) {
    errors.push(WorldpayException.errors.orderInput.billingAddress);
  }

  if (WorldpayException.errors.length > 0) {
    return Worldpay.onError('ip', WorldpayException.errors.join(', '));
  }

  return false;
};

/**
 * Sends request to Worldpay API
 * @param {object} options
 * @param {string} options.action
 * @param {object | boolean} [options.json]
 * @param {boolean | boolean} [options.expectResponse]
 * @param {string} [options.method]
 * @param {function} cb
 * @return {string} JSON string from Worldpay
 * */
Worldpay.prototype.sendRequest = function sendRequest(options, cb) {
  options = options || {};
  // Disabling SSL used for localhost testing
  if (this.disableSsl === true && this.serviceKey[0] !== 'T') {
    return cb(Worldpay.onError('ssl'));
  }

  request({
    url: this.endpoint + options.action,
    method: options.method || 'POST',
    json: options.json || true,
    timeout: this.timeout,
    headers: {
      'Authorization': this.serviceKey
    },
    strictSSL: !this.disableSsl
  }, callback);

  function callback(err, response, body) {
    if (err) {
      return cb(err);
    }

    // Check JSON has decoded correctly
    if (options.expectResponse && (response === null || response === false )) {
      return cb(Worldpay.onError('uanv', WorldpayException.errors.json, 503));
    }

    if (options.expectResponse && response.statusCode !== 200) {
      // If we expect a result and we have an error
      return cb(Worldpay.onError('uanv', WorldpayException.errors.json, 503));
    }

    if (!options.expectResponse && response.statusCode !== 200) {
      return cb(Worldpay.onError('apierror', response, response.statusCode));
    }

    if (response.statusCode !== 200) {
      return cb(Worldpay.onError(
        'apierror',
        response.description,
        response.statusCode,
        response.statusCode,
        response.description,
        response.customCode
      ));
    }

    if (!options.expectResponse && response.statusCode === 200) {
      body = true;
    }

    return cb(null, body);
  }
};


/**
 * Create Worldpay order
 * @param {object} order
 * @param {function} cb - callback
 * @return {object} - Worldpay order response
 * */
Worldpay.prototype.createOrder = function createOrder(order, cb) {
  order = order || {};

  var orderValidationError = this.checkOrderInput(order);
  if (orderValidationError) {
    return cb(orderValidationError);
  }

  var defaults = {
    orderType: 'ECOM',
    customerIdentifiers: null,
    billingAddress: null
  };

  order = _.merge(defaults, order);

  var json = {
    token: order.token,
    orderDescription: order.orderDescription,
    amount: order.amount,
    currencyCode: order.currencyCode,
    name: order.name,
    orderType: order.orderType,
    billingAddress: order.billingAddress,
    customerOrderCode: order.customerOrderCode,
    customerIdentifiers: order.customerIdentifiers
  };
  var opts = {action: 'orders', json: json, expectedResult: true};
  
  return this.sendRequest(opts, function (err, response) {
    if (err) {
      return cb(err);
    }

    if (!response.orderCode) {
      //success
      return cb(Worldpay.onError('apierror'));
    }

    return cb(null, response);
  });
};

/**
 * Refund Worldpay order
 * @param {string} orderCode
 * @param {function} cb
 * */
Worldpay.prototype.refundOrder = function refundOrder(orderCode, cb) {
  if (!orderCode || typeof orderCode !== 'string') {
    return cb(Worldpay.onError('ip', WorldpayException.errors.refund.ordercode));
  }

  return this.sendRequest({action: 'orders/' + orderCode + '/refund'}, cb);
};

/**
 * Get card details from Worldpay token
 * @param {string} token
 * @param {function} cb
 * @return {object} - card details
 * */
Worldpay.prototype.getStoredCardDetails = function getStoredCardDetails(token, cb) {
  if (!token || typeof token !== 'string') {
    return cb(Worldpay.onError('ip', WorldpayException.errors.orderInput.token));
  }

  var opts = {
    action: 'tokens/' + token,
    json: false,
    expectedResult: true,
    method: 'GET'
  };

  return this.sendRequest(opts, function (err, response) {
    if (err) {
      return cb(err);
    }

    if (!response.paymentMethod) {
      return cb(Worldpay.onError('apierror'));
    }

    return cb(null, response.paymentMethod);
  });
};

// todo: useless in node.js
/**
 * Process Worldpay webhooks
 * @param {string} token
 * @param {function} cb
 * @return {object} - card details
 * */
Worldpay.processWebhook = function processWebhook(token, cb) {
  return function(req/*, res, next*/){
    if (req.method !== 'POST') {
      return cb(Worldpay.onError('notificationPost'));
    }

    if (!req.body) {
      return cb(Worldpay.onError('notificationUnknown'));
    }

    return cb(null, req.body);
  };
};

/**
 * Handle errors
 * @param {string} error
 * @param {string} [message]
 * @param {number} [code]
 * @param {string} [httpStatusCode]
 * @param {string} [description]
 * @param {string} [customCode]
 **/
Worldpay.onError = function onError(error, message, code, httpStatusCode, description, customCode) {
  if (message) {
    message = ' - ' + message;
  }

  return new WorldpayException(WorldpayException.errors[error] + message, code, null, httpStatusCode, description, customCode);
};