'use strict'

const BaseError = require('./base-error')

class InvalidBodyError extends BaseError {
  constructor (message, validationErrors) {
    super(message)
    this.validationErrors = validationErrors
  }

  * handler (ctx, log) {
    log.warn('Invalid body: ' + this.message)
    if (this.validationErrors) {
      for (let ve of this.validationErrors) {
        log.debug(' -- ' + ve)
      }
    }

    ctx.status = 400
    ctx.body = {
      id: this.name,
      message: this.message,
      validationErrors: this.validationErrors
    }
  }
}

module.exports = InvalidBodyError
