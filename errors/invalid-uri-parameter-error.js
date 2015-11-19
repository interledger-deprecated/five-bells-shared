'use strict'

const BaseError = require('./base-error')

class InvalidUriParameterError extends BaseError {
  constructor (message, validationErrors) {
    super(message)
    this.validationErrors = validationErrors
  }

  * handler (ctx, log) {
    log.warn('Invalid URI parameter: ' + this.message)
    ctx.status = 400
    ctx.body = {
      id: this.name,
      message: this.message,
      validationErrors: this.validationErrors
    }
  }
}

module.exports = InvalidUriParameterError
