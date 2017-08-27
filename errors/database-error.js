'use strict'

const BaseError = require('./base-error')

class DatabaseError extends BaseError {
  constructor (message) {
    super(message)

    this.status = 500
  }
}

module.exports = DatabaseError
