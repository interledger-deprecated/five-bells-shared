'use strict';

module.exports = function NotFoundError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
};

require('util').inherits(module.exports, Error);

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Not Found: ' + this.message);
  ctx.status = 404;
  ctx.body = {
    id: this.name,
    message: this.message
  };
};
