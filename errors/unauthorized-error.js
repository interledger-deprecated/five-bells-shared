'use strict';

module.exports = function UnauthorizedError(message, validationErrors) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.validationErrors = validationErrors;
};

require('util').inherits(module.exports, Error);

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Invalid Body: ' + this.message);
  ctx.status = 403;
  ctx.body = {
    id: this.name,
    message: this.message
  };
};
