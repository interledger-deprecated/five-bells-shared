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
        log.error(err)
        if (typeof err === 'object' && err.stack) {
          log.error(err.stack)
        }

        this.throw(err.status || 500, err.name + ': ' + err.message)

        // We consider the error handled at this point, so we do NOT reemit it,
        // that's why the following line is commented out.
        // this.app.emit('error', err, this)
      }
    }
  }
}
