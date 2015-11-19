'use strict'

const BaseError = require('./base-error')

class AlreadyExistsError extends BaseError {
  constructor (message) {
    super(message)
  }

  * handler (ctx, log) {
    log.warn('Already Exists: ' + this.message)
    ctx.status = 409
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = AlreadyExistsError
