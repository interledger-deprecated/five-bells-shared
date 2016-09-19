'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class TransferNotConditionalError extends UnprocessableEntityError {
  * handler (ctx, log) {
    log.warn('Transfer Not Conditional: ' + this.message)
    ctx.status = 422
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = TransferNotConditionalError
