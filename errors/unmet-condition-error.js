'use strict'

const UnprocessableEntityError = require('./unprocessable-entity-error')

class UnmetConditionError extends UnprocessableEntityError {
  * handler (ctx, log) {
    log.warn('Execution Condition Not Met: ' + this.message)
    ctx.status = 422
    ctx.body = {
      id: this.name,
      message: this.message
    }
  }
}

module.exports = UnmetConditionError
