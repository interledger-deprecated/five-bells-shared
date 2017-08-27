'use strict'

const BaseError = require('./base-error')

class InvalidUriError extends BaseError {
  constructor (message, validationErrors) {
    super(message)

    this.status = 400
    this.validationErrors = validationErrors
  }

  async handler (ctx, log) {
    log.warn('Invalid URI: ' + this.message)
    ctx.status = 400
    ctx.body = {
      id: this.name,
      message: this.message,
      validationErrors: this.validationErrors
    }
  }
}

module.exports = InvalidUriError
