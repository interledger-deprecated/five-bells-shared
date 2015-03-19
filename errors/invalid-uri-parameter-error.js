'use strict';

module.exports = function InvalidUriParameterError(message, validationErrors) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.validationErrors = validationErrors;
};

module.exports.prototype.handler = function (ctx, log) {
  log.warn('Invalid URI parameter: ' + this.message);
  ctx.status = 400;
  ctx.body = {
    id: this.name,
    message: this.message,
    validationErrors: this.validationErrors
  };
};

require('util').inherits(module.exports, Error);
