'use strict'

const BaseError = require('./base-error')

class UnauthorizedError extends BaseError {
  constructor (message, validationErrors) {
    super(message)

    this.status = 403
    this.validationErrors = validationErrors
  }
}

module.exports = UnauthorizedError
