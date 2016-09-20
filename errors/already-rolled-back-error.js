'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class AlreadyRolledBackError extends UnprocessableEntityError {
  * handler (ctx, log) {
    log.warn('Already rolled back: ' + this.message)
    ctx.status = 422
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = AlreadyRolledBackError
