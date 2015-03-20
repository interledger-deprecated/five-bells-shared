'use strict';

module.exports = handleError;

const log = require('../services/log')('error-handler');

function *handleError(next) {
  try {
    yield next;
  } catch (err) {
    if (typeof err.handler === 'function') {
      yield err.handler(this, log);
    } else {
      log.error((typeof err === 'object' && err.stack) ? err.stack : '' + err);
      throw err;
    }
  }
}
