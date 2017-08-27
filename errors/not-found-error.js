'use strict'

const BaseError = require('./base-error')

class NotFoundError extends BaseError {
  constructor (message) {
    super(message)

    this.status = 404
  }
}

module.exports = NotFoundError
