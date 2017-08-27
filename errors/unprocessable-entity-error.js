'use strict'

const BaseError = require('./base-error')

class UnprocessableEntityError extends BaseError {
  constructor (message) {
    super(message)

    this.status = 422
  }
}

module.exports = UnprocessableEntityError
