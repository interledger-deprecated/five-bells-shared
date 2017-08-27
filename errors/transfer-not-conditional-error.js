'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class TransferNotConditionalError extends UnprocessableEntityError {
  constructor (message) {
    super(message)

    this.status = 422
  }
}

module.exports = TransferNotConditionalError
