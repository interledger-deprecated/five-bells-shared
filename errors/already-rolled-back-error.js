'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class AlreadyRolledBackError extends UnprocessableEntityError {
  constructor (message) {
    super(message)

    this.status = 422
  }
}

module.exports = AlreadyRolledBackError
