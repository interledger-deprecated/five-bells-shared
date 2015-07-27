'use strict'

/**
 * Set up the logging system.
 *
 * Configures mag-hub and mag logging as well as adding some utility methods.
 *
 * @param {Object} mag Reference to the `mag` module
 * @param {Object} hub Reference to the `mag-hub` module
 * @return {Object} Reference to the `mag` module
 */
module.exports = function (mag, hub) {
  const through2 = require('through2')

  // Formatters
  const format = require('mag-format-message')
  const colored = require('mag-colored-output')

  const logStream = hub
    .pipe(format())
    .pipe(through2.obj(function (chunk, enc, callback) {
      chunk.timestamp = chunk.timestamp.toISOString()
      // chunk.namespace = chunk.namespace.slice(0, 3)
      callback(null, chunk)
    }))
    .pipe(colored())

  mag.logStream = logStream

  // Allow output redirection via setOutputStream
  mag.currentOutput = process.stdout
  mag.setOutputStream = function (outputStream) {
    logStream.unpipe(mag.currentOutput)
    logStream.pipe(outputStream)
    mag.currentOutput = outputStream
  }
  logStream.pipe(mag.currentOutput)

  return mag
}
