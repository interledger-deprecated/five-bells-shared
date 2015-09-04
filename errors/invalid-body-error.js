'use strict'

module.exports = function InvalidBodyError (message, validationErrors) {
  Error.captureStackTrace(this, this.constructor)
  this.name = this.constructor.name
  this.message = message
  this.validationErrors = validationErrors && validationErrors.map(function (err) {
    return err.toString()
  })
}

require('util').inherits(module.exports, Error)

module.exports.prototype.handler = function *(ctx, log) {
  log.warn('Invalid Body: ' + this.message)
  for (let ve of this.validationErrors) {
    log.debug(' -- ' + ve)
  }
  ctx.status = 400
  ctx.body = {
    id: this.name,
    message: this.message,
    validationErrors: this.validationErrors
  }
}
