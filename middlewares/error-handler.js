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

      this.status = err.status || 500
      this.body = err.message

      // We consider the error handled at this point, so we do NOT reemit it,
      // that's why the following line is commented out.
      // this.app.emit('error', err, this)
    }
  }
}
