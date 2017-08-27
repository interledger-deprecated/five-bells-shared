'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class UnmetConditionError extends UnprocessableEntityError {
  constructor (message) {
    super(message)

    this.status = 422
  }
}

module.exports = UnmetConditionError
