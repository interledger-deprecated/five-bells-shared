'use strict'

module.exports = function AlreadyExistsError (message) {
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name
  this.message = message
}

require('util').inherits(module.exports, Error)

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Already Exists: ' + this.message)
  ctx.status = 409
  ctx.body = {
    id: this.name,
    message: this.message
  }
}
