'use strict'

const BaseError = require('./base-error')

class NotFoundError extends BaseError {
  * handler (ctx, log) {
    log.warn('Not Found: ' + this.message)
    ctx.status = 404
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = NotFoundError
