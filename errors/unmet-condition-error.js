'use strict';

const UnprocessableEntityError =
  require('./unprocessable-entity-error');

module.exports = function UnmetConditionError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
};

require('util').inherits(module.exports, UnprocessableEntityError);

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Execution Condition Not Met: ' + this.message);
  ctx.status = 422;
  ctx.body = {
    id: this.name,
    message: this.message
  };
};
