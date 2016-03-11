'use strict'

const BaseError = require('./base-error')

class DatabaseError extends BaseError {
  * handler (ctx, log) {
    log.warn('Database error: ' + this.message)
    ctx.status = 500
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = DatabaseError
