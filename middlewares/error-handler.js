'use strict'

module.exports = function (opts) {
  const log = opts.log

  return function * handleError (next) {
    try {
      yield next
    } catch (err) {
      if (typeof err.handler === 'function') {
        yield err.handler(this, log)
      } else {
        log.warn(err.stack || (err.name + ': ' + err.message))

        this.status = err.statusCode || err.status || 500
        this.body = {
          id: err.name,
          message: err.message
        }

        // We consider the error handled at this point, so we do NOT reemit it,
        // that's why the following line is commented out.
        // this.app.emit('error', err, this)
      }
    }
  }
}
