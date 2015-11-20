'use strict'

const BaseError = require('./base-error')

class UnauthorizedError extends BaseError {
  constructor (message, validationErrors) {
    super(message)
    this.validationErrors = validationErrors
  }

  * handler (ctx, log) {
    log.warn('Unauthorized: ' + this.message)
    ctx.status = 403
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = UnauthorizedError
