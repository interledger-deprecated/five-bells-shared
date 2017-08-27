'use strict'

const BaseError = require('./base-error')

class AlreadyExistsError extends BaseError {
  constructor (message) {
    super(message)

    this.status = 409
  }
}

module.exports = AlreadyExistsError
