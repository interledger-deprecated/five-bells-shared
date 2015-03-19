'use strict';

module.exports = function UnprocessableEntityError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
};

require('util').inherits(module.exports, Error);

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Unprocessable: ' + this.message);
  ctx.status = 422;
  ctx.body = {
    id: this.name,
    message: this.message
  };
};
